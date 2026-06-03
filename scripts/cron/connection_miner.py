#!/usr/bin/env python3
"""Connection Miner — discovers cross-domain links in the knowledge graph."""

from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS_DIR.parent))

from src.kernel.shared_memory.config import (
    DEFAULT_CHROMA_DB_PATH,
    DEFAULT_SHARED_MEMORY_DB_PATH,
    PROJECT_ROOT,
)
from src.kernel.shared_memory.sqlite_store import SQLiteMemoryStore
from src.kernel.shared_memory.promotion_worker import PromotionWorker

try:
    from dotenv import load_dotenv

    load_dotenv(str(PROJECT_ROOT / ".env"))
except ImportError:
    pass

logger = logging.getLogger(__name__)

JSONL_PATH = PROJECT_ROOT / "data" / "shared_memory" / "weekly_reports.jsonl"
TELEGRAM_SCRIPT = (
    Path.home() / ".claude" / "skills" / "telegram-message" / "scripts" / "send_telegram.py"
)
MAX_ANCHORS = 30
MAX_LLM_CALLS = 15
MAX_PROMOTIONS = 5
DEFAULT_THRESHOLD = 0.25
THRESHOLD_MIN = 0.1
THRESHOLD_MAX = 0.5
COLLECTIONS_TO_QUERY = ["unified_knowledge", "session_notes", "hermes_learnings"]

DOMAIN_MAP: dict[str, str] = {
    "Trading": "trading",
    "VPS": "infrastructure",
    "Discord": "communication",
    "YouTube pipeline": "content",
    "ChromaDB": "knowledge",
    "NotebookLM": "content",
    "Paperclip": "operations",
    "Hermes agent": "agents",
    "Swarm coordination": "agents",
    "Memory system": "knowledge",
    "Cron jobs": "operations",
    "GitHub": "development",
}

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS memory_connections (
    id TEXT PRIMARY KEY,
    anchor_id TEXT NOT NULL,
    anchor_collection TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_collection TEXT NOT NULL,
    connection_score REAL NOT NULL,
    domain_a TEXT,
    domain_b TEXT,
    llm_score INTEGER,
    llm_reason TEXT,
    validated INTEGER NOT NULL DEFAULT 0,
    accepted INTEGER NOT NULL DEFAULT 0,
    week_iso TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mc_week ON memory_connections(week_iso);
CREATE INDEX IF NOT EXISTS idx_mc_accepted ON memory_connections(accepted);
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_connections_table(db_path: str | Path) -> None:
    with sqlite3.connect(str(db_path)) as conn:
        conn.executescript(_CREATE_TABLE_SQL)


def _get_week_iso() -> str:
    """Return the current ISO week string, e.g. '2026-W22'."""
    now = datetime.now(timezone.utc)
    return f"{now.year}-W{now.strftime('%V')}"


def _classify_domain(text: str, metadata: dict | None = None) -> str:
    """Classify a document into a domain using keyword matching."""
    search_text = text
    if metadata:
        search_text = f"{text} {json.dumps(metadata)}"
    for keyword, domain in DOMAIN_MAP.items():
        if keyword.lower() in search_text.lower():
            return domain
    return "general"


def _pair_exists(conn: sqlite3.Connection, anchor_id: str, target_id: str) -> bool:
    """Check if an accepted (anchor, target) pair exists in either direction."""
    row = conn.execute(
        """SELECT 1 FROM memory_connections
           WHERE accepted = 1
             AND ((anchor_id = ? AND target_id = ?) OR (anchor_id = ? AND target_id = ?))
           LIMIT 1""",
        (anchor_id, target_id, target_id, anchor_id),
    ).fetchone()
    return bool(row)


# ---------------------------------------------------------------------------
# Prerequisite check
# ---------------------------------------------------------------------------


def _check_prerequisites(db_path: str | Path) -> bool:
    """Return True if at least one prerequisite condition is met."""
    # Condition 3: 100+ docs in unified_knowledge (always true with 27K docs)
    try:
        import chromadb

        client = chromadb.PersistentClient(path=str(DEFAULT_CHROMA_DB_PATH))
        try:
            col = client.get_collection("unified_knowledge")
            if col.count() >= 100:
                logger.debug("Prerequisite met: unified_knowledge has %d docs", col.count())
                return True
        except Exception:
            pass
    except ImportError:
        logger.warning("chromadb not available; skipping collection prerequisite check")

    # Condition 1: weekly_learning_report line in JSONL
    if JSONL_PATH.exists():
        try:
            with JSONL_PATH.open() as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        if record.get("type") == "weekly_learning_report":
                            logger.debug("Prerequisite met: weekly_learning_report found in JSONL")
                            return True
                    except json.JSONDecodeError:
                        continue
        except OSError:
            pass

    # Condition 2: 50+ COMPLETED promotions
    try:
        with sqlite3.connect(str(db_path)) as conn:
            row = conn.execute(
                "SELECT COUNT(*) FROM memory_promotions WHERE status = 'COMPLETED'",
            ).fetchone()
            if row and row[0] >= 50:
                logger.debug("Prerequisite met: %d COMPLETED promotions", row[0])
                return True
    except sqlite3.OperationalError:
        pass

    return False


# ---------------------------------------------------------------------------
# Self-calibrating threshold
# ---------------------------------------------------------------------------


def _load_threshold() -> float:
    """Load self-calibrated threshold from JSONL history."""
    if not JSONL_PATH.exists():
        return DEFAULT_THRESHOLD

    records: list[dict] = []
    try:
        with JSONL_PATH.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    if rec.get("type") == "connection_mining":
                        records.append(rec)
                except json.JSONDecodeError:
                    continue
    except OSError:
        return DEFAULT_THRESHOLD

    if len(records) < 4:
        return DEFAULT_THRESHOLD

    last_three = records[-3:]
    total_above = sum(r.get("above_threshold", 0) for r in last_three)
    total_accepted = sum(r.get("accepted", 0) for r in last_three)

    if total_above == 0:
        return DEFAULT_THRESHOLD

    ratio = total_accepted / total_above
    last_threshold = records[-1].get("threshold_used", DEFAULT_THRESHOLD)

    if ratio > 0.8:
        new_threshold = last_threshold + 0.05
    elif ratio < 0.2:
        new_threshold = last_threshold - 0.05
    else:
        new_threshold = last_threshold

    clamped = max(THRESHOLD_MIN, min(THRESHOLD_MAX, new_threshold))
    logger.debug(
        "Self-calibrated threshold: %.2f (ratio=%.2f, previous=%.2f)",
        clamped,
        ratio,
        last_threshold,
    )
    return clamped


# ---------------------------------------------------------------------------
# Anchor selection
# ---------------------------------------------------------------------------


def _select_anchors(db_path: str | Path) -> list[dict]:
    """Select up to MAX_ANCHORS anchor entries from the memory stores."""
    anchors: list[dict] = []
    seen_ids: set[str] = set()

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row

        # 1. This week's promotions (requested_by = 'weekly-learning-report', last 7 days)
        try:
            rows = conn.execute(
                """
                SELECT id, payload_json, record_id
                FROM memory_promotions
                WHERE requested_by = 'weekly-learning-report'
                  AND created_at >= datetime('now', '-7 days')
                  AND status = 'COMPLETED'
                LIMIT ?
                """,
                (MAX_ANCHORS,),
            ).fetchall()
            for row in rows:
                if len(anchors) >= MAX_ANCHORS:
                    break
                try:
                    payload = json.loads(row["payload_json"])
                    content = payload.get("content", "")
                    if not content:
                        continue
                    anchor_id = row["id"]
                    if anchor_id in seen_ids:
                        continue
                    seen_ids.add(anchor_id)
                    anchors.append(
                        {
                            "id": anchor_id,
                            "content": content,
                            "collection": "memory_promotions",
                            "domain": _classify_domain(content, payload.get("metadata")),
                        }
                    )
                except (json.JSONDecodeError, KeyError):
                    continue
        except sqlite3.OperationalError as exc:
            logger.warning("Could not query memory_promotions: %s", exc)

        # 2. High-tier working memory (decision, lesson, policy)
        try:
            rows = conn.execute(
                """
                SELECT id, content, tier, tags
                FROM working_memories
                WHERE tier IN ('decision', 'lesson', 'policy')
                ORDER BY importance DESC
                LIMIT ?
                """,
                (MAX_ANCHORS - len(anchors),),
            ).fetchall()
            for row in rows:
                if len(anchors) >= MAX_ANCHORS:
                    break
                anchor_id = row["id"]
                if anchor_id in seen_ids:
                    continue
                seen_ids.add(anchor_id)
                tags_raw = row["tags"] or "[]"
                try:
                    tags = json.loads(tags_raw)
                except (json.JSONDecodeError, TypeError):
                    tags = []
                content = row["content"] or ""
                anchors.append(
                    {
                        "id": anchor_id,
                        "content": content,
                        "collection": "working_memories",
                        "domain": _classify_domain(content, {"tags": tags}),
                    }
                )
        except sqlite3.OperationalError as exc:
            logger.warning("Could not query working_memories for high-tier: %s", exc)

        # 3. Random sample from recent observations (last 7 days)
        if len(anchors) < MAX_ANCHORS:
            random.seed(int(datetime.now().strftime("%Y%W")))
            try:
                rows = conn.execute(
                    """
                    SELECT id, content, tags
                    FROM working_memories
                    WHERE tier = 'observation'
                      AND created_at >= datetime('now', '-7 days')
                    ORDER BY RANDOM()
                    LIMIT ?
                    """,
                    (MAX_ANCHORS - len(anchors),),
                ).fetchall()
                for row in rows:
                    if len(anchors) >= MAX_ANCHORS:
                        break
                    anchor_id = row["id"]
                    if anchor_id in seen_ids:
                        continue
                    seen_ids.add(anchor_id)
                    content = row["content"] or ""
                    anchors.append(
                        {
                            "id": anchor_id,
                            "content": content,
                            "collection": "working_memories",
                            "domain": _classify_domain(content),
                        }
                    )
            except sqlite3.OperationalError as exc:
                logger.warning("Could not query working_memories for observations: %s", exc)

    logger.info("Selected %d anchors", len(anchors))
    return anchors[:MAX_ANCHORS]


# ---------------------------------------------------------------------------
# ChromaDB querying
# ---------------------------------------------------------------------------


def _query_chroma(
    anchor_content: str,
    collections: list,
) -> list[dict]:
    """Query multiple ChromaDB collections for documents similar to anchor_content."""
    results: list[dict] = []
    query_text = anchor_content[:1000]

    for collection in collections:
        try:
            response = collection.query(query_texts=[query_text], n_results=5)
        except Exception as exc:
            logger.debug("Error querying collection %s: %s", collection.name, exc)
            continue

        ids = response.get("ids", [[]])[0]
        distances = response.get("distances", [[]])[0]
        documents = response.get("documents", [[]])[0]
        metadatas = response.get("metadatas", [[]])[0]

        for doc_id, distance, document, metadata in zip(ids, distances, documents, metadatas):
            if document is None:
                continue
            results.append(
                {
                    "id": doc_id,
                    "collection": collection.name,
                    "content": document,
                    "distance": float(distance),
                    "metadata": metadata or {},
                }
            )

    return results


def _load_chroma_collections() -> tuple[object | None, list]:
    """Load ChromaDB client and return (client, collections_list)."""
    try:
        import chromadb
    except ImportError:
        logger.warning("chromadb not installed; cross-collection querying disabled")
        return None, []

    try:
        client = chromadb.PersistentClient(path=str(DEFAULT_CHROMA_DB_PATH))
    except Exception as exc:
        logger.error("Failed to connect to ChromaDB: %s", exc)
        return None, []

    collections = []
    for name in COLLECTIONS_TO_QUERY:
        try:
            col = client.get_collection(name)
            collections.append(col)
            logger.debug("Loaded collection: %s (%d docs)", name, col.count())
        except Exception:
            logger.debug("Collection not found or empty: %s", name)

    return client, collections


# ---------------------------------------------------------------------------
# Connection scoring
# ---------------------------------------------------------------------------


def _score_connection(
    distance: float,
    domain_a: str,
    domain_b: str,
    pair_already_exists: bool,
) -> float:
    """Compute connection score.

    Uses a metric-agnostic similarity ``1/(1+distance)`` rather than
    ``1-distance``. Chroma collections here default to L2 space, where distances
    routinely exceed 1.0 (observed 1.76-1.93); ``1-distance`` then goes negative
    and clamps to 0, which silently zeroed every connection score. ``1/(1+d)``
    is bounded (0, 1], monotonically decreasing, and correct for any
    non-negative distance metric (L2 or cosine).
    """
    similarity = 1.0 / (1.0 + max(0.0, distance))
    domain_distance = 0.3 if domain_a == domain_b else 1.0
    novelty_penalty = 0.0 if pair_already_exists else 1.0
    return similarity * domain_distance * novelty_penalty


# ---------------------------------------------------------------------------
# LLM validation
# ---------------------------------------------------------------------------


# LLM validation provider — OpenAI-compatible chat completions.
# Default is Cerebras (free tier, fast, swarm-standard). Replaced hardcoded
# Gemini, which kept hitting Google's account-wide 429 quota and validated
# nothing. Override endpoint/model/key-env via CONNECTION_MINER_LLM_* to swap
# providers (e.g. Fireworks) without code changes.
_VALIDATION_ENDPOINT = os.environ.get(
    "CONNECTION_MINER_LLM_ENDPOINT",
    "https://api.cerebras.ai/v1/chat/completions",
)
_VALIDATION_MODEL = os.environ.get("CONNECTION_MINER_LLM_MODEL", "llama-3.3-70b")
_VALIDATION_KEY_ENV = os.environ.get("CONNECTION_MINER_LLM_KEY_ENV", "CEREBRAS_API_KEY")


def _validate_with_llm(
    candidates: list[dict],
    max_calls: int,
) -> list[dict]:
    """Validate top candidates with an OpenAI-compatible LLM (default: Cerebras).

    Returns the candidates sorted by score, with ``llm_score``/``llm_reason``/
    ``validated``/``accepted`` set on those validated (accepted when score >= 4).
    """
    api_key = os.environ.get(_VALIDATION_KEY_ENV, "")
    if not api_key:
        logger.warning("%s not set; skipping LLM validation", _VALIDATION_KEY_ENV)
        return candidates

    calls_made = 0

    # Sort by score descending, validate top N
    sorted_candidates = sorted(candidates, key=lambda c: c["connection_score"], reverse=True)

    for candidate in sorted_candidates:
        if calls_made >= max_calls:
            break

        prompt = (
            f"Given these two memory entries from different domains, rate whether their "
            f"connection is surprising and meaningful on a scale of 1-5.\n\n"
            f"Entry A ({candidate['domain_a']}): {candidate['anchor_content'][:500]}\n\n"
            f"Entry B ({candidate['domain_b']}): {candidate['target_content'][:500]}\n\n"
            f'Respond with ONLY a JSON object:\n{{"score": N, "reason": "one sentence"}}'
        )

        body = json.dumps(
            {
                "model": _VALIDATION_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 100,
                "response_format": {"type": "json_object"},
            }
        ).encode("utf-8")

        req = urllib.request.Request(
            _VALIDATION_ENDPOINT,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))
            calls_made += 1

            text = (
                response_data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )

            # Strip markdown code fences if present
            if text.startswith("```"):
                lines = text.splitlines()
                text = "\n".join(
                    line for line in lines if not line.startswith("```")
                ).strip()

            parsed = json.loads(text)
            score = int(parsed.get("score", 0))
            reason = str(parsed.get("reason", ""))
            candidate["llm_score"] = score
            candidate["llm_reason"] = reason
            candidate["validated"] = 1
            candidate["accepted"] = 1 if score >= 4 else 0

        except urllib.error.URLError as exc:
            logger.warning("LLM validation network error (%s): %s", _VALIDATION_MODEL, exc)
            # Don't increment calls_made; stop trying
            break
        except (json.JSONDecodeError, KeyError, IndexError, ValueError) as exc:
            logger.warning("Failed to parse LLM validation response: %s", exc)
            calls_made += 1  # Still used a call even if parse failed
            continue

    logger.info("LLM validation (%s): %d calls made", _VALIDATION_MODEL, calls_made)
    return sorted_candidates


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def _store_candidates(
    db_path: str | Path,
    candidates: list[dict],
    week_iso: str,
    dry_run: bool,
) -> None:
    """Insert evaluated candidates into memory_connections."""
    if not candidates:
        return

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for c in candidates:
        rows.append(
            (
                str(uuid4()),
                c["anchor_id"],
                c["anchor_collection"],
                c["target_id"],
                c["target_collection"],
                c["connection_score"],
                c.get("domain_a"),
                c.get("domain_b"),
                c.get("llm_score"),
                c.get("llm_reason"),
                c.get("validated", 0),
                c.get("accepted", 0),
                week_iso,
                now,
            )
        )
        # Store the connection id back on the candidate for promotion use
        c["connection_id"] = rows[-1][0]

    if dry_run:
        logger.info("[dry-run] Would insert %d rows into memory_connections", len(rows))
        return

    with sqlite3.connect(str(db_path)) as conn:
        conn.executemany(
            """
            INSERT OR IGNORE INTO memory_connections (
                id, anchor_id, anchor_collection,
                target_id, target_collection,
                connection_score, domain_a, domain_b,
                llm_score, llm_reason,
                validated, accepted,
                week_iso, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
    logger.info("Stored %d candidates in memory_connections", len(rows))


# ---------------------------------------------------------------------------
# Promotion of accepted connections
# ---------------------------------------------------------------------------


def _promote_accepted(
    store: SQLiteMemoryStore,
    accepted: list[dict],
    week_iso: str,
    dry_run: bool,
) -> int:
    """Queue promotions for accepted connections and run the worker."""
    if not accepted or dry_run:
        if dry_run and accepted:
            logger.info("[dry-run] Would promote %d accepted connections", len(accepted))
        return 0

    promoted_count = 0
    for candidate in accepted[:MAX_PROMOTIONS]:
        domain_a = candidate.get("domain_a", "general")
        domain_b = candidate.get("domain_b", "general")
        llm_reason = candidate.get("llm_reason", "")
        llm_score = candidate.get("llm_score", 0)
        anchor_content = candidate.get("anchor_content", "")
        target_content = candidate.get("target_content", "")
        connection_id = candidate.get("connection_id", str(uuid4()))

        payload = {
            "content": (
                f"Connection: {anchor_content[:200]} <-> {target_content[:200]}. {llm_reason}"
            ),
            "agent": "connection-miner",
            "source_runtime": "cron",
            "session_id": week_iso,
            "project": "edgeless-lab",
            "memory_type": "connection",
            "confidence": llm_score / 5.0,
            "tags": [domain_a, domain_b, "cross-domain-connection"],
            "entity_refs": [],
            "metadata": {},
        }

        try:
            store.queue_promotion(
                promotion_id=str(uuid4()),
                record_id=connection_id,
                requested_by="connection-miner",
                target_collection="unified_knowledge",
                reason=f"Cross-domain connection: {domain_a} <-> {domain_b}: {llm_reason}",
                payload=payload,
                metadata={},
                status="QUEUED",
                created_at=datetime.now(timezone.utc),
            )
            promoted_count += 1
        except Exception as exc:
            logger.error("Failed to queue promotion for connection %s: %s", connection_id, exc)

    if promoted_count > 0:
        try:
            receipt = PromotionWorker(store).run_once(limit=MAX_PROMOTIONS)
            logger.info(
                "Promotion worker: processed=%d completed=%d failed=%d",
                receipt.processed,
                receipt.completed,
                receipt.failed,
            )
        except Exception as exc:
            logger.error("PromotionWorker failed: %s", exc)

    return promoted_count


# ---------------------------------------------------------------------------
# Telegram alert
# ---------------------------------------------------------------------------


def _send_telegram(
    week_iso: str,
    anchors_used: int,
    candidates_found: int,
    accepted: list[dict],
    promoted: int,
    dry_run: bool,
) -> None:
    """Send Telegram alert if connections were found."""
    if not accepted:
        return
    if not TELEGRAM_SCRIPT.exists():
        logger.warning("Telegram script not found: %s", TELEGRAM_SCRIPT)
        return

    week_num = week_iso.split("-W")[-1] if "-W" in week_iso else week_iso
    best = accepted[0]
    domain_a = best.get("domain_a", "unknown")
    domain_b = best.get("domain_b", "unknown")
    best_score = best.get("llm_score", 0)
    best_reason = best.get("llm_reason", "")

    message = (
        f"Connection Miner - W{week_num}\n\n"
        f"{anchors_used} anchors -> {candidates_found} candidates -> {len(accepted)} accepted\n"
        f"Best: {domain_a} <-> {domain_b} (score {best_score}/5)\n"
        f'"{best_reason}"\n\n'
        f"Promoted {promoted} connections to unified_knowledge"
    )

    if dry_run:
        logger.info("[dry-run] Telegram message:\n%s", message)
        return

    try:
        subprocess.run(
            ["python3.11", str(TELEGRAM_SCRIPT), message],
            timeout=30,
            check=False,
            capture_output=True,
        )
    except Exception as exc:
        logger.warning("Failed to send Telegram alert: %s", exc)


# ---------------------------------------------------------------------------
# JSONL output
# ---------------------------------------------------------------------------


def _write_jsonl(
    week_iso: str,
    threshold_used: float,
    anchors_used: int,
    candidates_found: int,
    above_threshold: int,
    llm_validated: int,
    accepted_count: int,
    promoted: int,
    top_connections: list[dict],
    dry_run: bool,
) -> None:
    """Append connection mining report to weekly_reports.jsonl."""
    record = {
        "type": "connection_mining",
        "week_iso": week_iso,
        "run_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "threshold_used": threshold_used,
        "anchors_used": anchors_used,
        "candidates_found": candidates_found,
        "above_threshold": above_threshold,
        "llm_validated": llm_validated,
        "accepted": accepted_count,
        "promoted": promoted,
        "top_connections": top_connections,
    }

    if dry_run:
        logger.info("[dry-run] JSONL record:\n%s", json.dumps(record, indent=2))
        return

    try:
        JSONL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with JSONL_PATH.open("a") as fh:
            fh.write(json.dumps(record) + "\n")
        logger.info("Wrote connection_mining record to %s", JSONL_PATH)
    except OSError as exc:
        logger.error("Failed to write JSONL: %s", exc)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main(args: argparse.Namespace) -> int:
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    db_path = DEFAULT_SHARED_MEMORY_DB_PATH
    week_iso = _get_week_iso()
    logger.info("Connection Miner starting — week %s", week_iso)

    # Prerequisite check
    if not _check_prerequisites(db_path):
        logger.info("Insufficient promoted content for connection mining")
        return 0

    # Ensure connections table exists
    _ensure_connections_table(db_path)

    # Self-calibrating threshold
    threshold = _load_threshold()
    logger.info("Using threshold: %.2f", threshold)

    # Select anchors
    anchors = _select_anchors(db_path)
    if not anchors:
        logger.info("No anchors found; exiting")
        _write_jsonl(
            week_iso=week_iso,
            threshold_used=threshold,
            anchors_used=0,
            candidates_found=0,
            above_threshold=0,
            llm_validated=0,
            accepted_count=0,
            promoted=0,
            top_connections=[],
            dry_run=args.dry_run,
        )
        return 0

    # Load ChromaDB
    _, collections = _load_chroma_collections()
    if not collections:
        logger.warning("No ChromaDB collections available; cannot mine connections")
        _write_jsonl(
            week_iso=week_iso,
            threshold_used=threshold,
            anchors_used=len(anchors),
            candidates_found=0,
            above_threshold=0,
            llm_validated=0,
            accepted_count=0,
            promoted=0,
            top_connections=[],
            dry_run=args.dry_run,
        )
        return 0

    # Build candidate list
    all_candidates: list[dict] = []

    with sqlite3.connect(str(db_path)) as conn:
        for anchor in anchors:
            anchor_id = anchor["id"]
            anchor_content = anchor["content"]
            anchor_domain = anchor["domain"]
            anchor_collection = anchor["collection"]

            results = _query_chroma(anchor_content, collections)

            for result in results:
                target_id = result["id"]
                # Skip self-match
                if target_id == anchor_id:
                    continue

                target_domain = _classify_domain(result["content"], result.get("metadata"))
                pair_exists = _pair_exists(conn, anchor_id, target_id)

                score = _score_connection(
                    distance=result["distance"],
                    domain_a=anchor_domain,
                    domain_b=target_domain,
                    pair_already_exists=pair_exists,
                )

                all_candidates.append(
                    {
                        "anchor_id": anchor_id,
                        "anchor_collection": anchor_collection,
                        "target_id": target_id,
                        "target_collection": result["collection"],
                        "connection_score": score,
                        "domain_a": anchor_domain,
                        "domain_b": target_domain,
                        "anchor_content": anchor_content,
                        "target_content": result["content"],
                        "llm_score": None,
                        "llm_reason": None,
                        "validated": 0,
                        "accepted": 0,
                    }
                )

    logger.info("Total candidates found: %d", len(all_candidates))

    # Filter by threshold
    above_threshold = [c for c in all_candidates if c["connection_score"] >= threshold]
    logger.info(
        "Candidates above threshold (%.2f): %d",
        threshold,
        len(above_threshold),
    )

    # LLM validation
    if above_threshold and not args.dry_run:
        above_threshold = _validate_with_llm(above_threshold, max_calls=MAX_LLM_CALLS)
    elif above_threshold and args.dry_run:
        logger.info("[dry-run] Skipping LLM validation for %d candidates", len(above_threshold))

    llm_validated = sum(1 for c in above_threshold if c.get("validated"))
    accepted_list = [c for c in above_threshold if c.get("accepted")]
    logger.info("LLM validated: %d, accepted: %d", llm_validated, len(accepted_list))

    # Store all above-threshold candidates (validated or not)
    _store_candidates(db_path, above_threshold, week_iso, dry_run=args.dry_run)

    # Promote accepted connections
    store = SQLiteMemoryStore(db_path)
    promoted = _promote_accepted(store, accepted_list, week_iso, dry_run=args.dry_run)

    # Build top_connections summary
    top_connections = [
        {
            "domain_a": c["domain_a"],
            "domain_b": c["domain_b"],
            "score": c.get("llm_score"),
            "reason": c.get("llm_reason", ""),
        }
        for c in accepted_list[:5]
    ]

    # Write JSONL
    _write_jsonl(
        week_iso=week_iso,
        threshold_used=threshold,
        anchors_used=len(anchors),
        candidates_found=len(all_candidates),
        above_threshold=len(above_threshold),
        llm_validated=llm_validated,
        accepted_count=len(accepted_list),
        promoted=promoted,
        top_connections=top_connections,
        dry_run=args.dry_run,
    )

    # Telegram alert
    if not args.no_telegram:
        _send_telegram(
            week_iso=week_iso,
            anchors_used=len(anchors),
            candidates_found=len(all_candidates),
            accepted=accepted_list,
            promoted=promoted,
            dry_run=args.dry_run,
        )

    logger.info(
        "Connection Miner complete — week=%s anchors=%d candidates=%d "
        "above_threshold=%d validated=%d accepted=%d promoted=%d",
        week_iso,
        len(anchors),
        len(all_candidates),
        len(above_threshold),
        llm_validated,
        len(accepted_list),
        promoted,
    )
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Connection Miner — discovers cross-domain links in the knowledge graph."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without writing to database or sending alerts",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--no-telegram",
        action="store_true",
        help="Skip Telegram notification even if connections are found",
    )
    parsed = parser.parse_args()
    sys.exit(main(parsed))
