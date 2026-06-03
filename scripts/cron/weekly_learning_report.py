#!/usr/bin/env python3.11
"""Weekly Learning Report — Pattern detection + auto-promotion from working memory.

Runs weekly (Sunday 12:00 PM PST). Reads working_memories from the past 7 days,
detects recurring themes via tag co-occurrence and content deduplication, auto-promotes
themes to unified_knowledge, creates Paperclip issues for unresolved errors, and
writes a vault report + Telegram summary.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import random
import sqlite3
import subprocess
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# sys.path setup for kernel imports
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_SCRIPTS_DIR.parent))

from src.kernel.shared_memory.config import DEFAULT_SHARED_MEMORY_DB_PATH, PROJECT_ROOT
from src.kernel.shared_memory.sqlite_store import SQLiteMemoryStore
from src.kernel.shared_memory.promotion_worker import PromotionWorker

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

RUNTIME_DIR = PROJECT_ROOT / ".runtime"
LOCKFILE = RUNTIME_DIR / ".last_weekly_run"
ERROR_LOCKFILE = RUNTIME_DIR / ".last_weekly_run_error"
JSONL_PATH = PROJECT_ROOT / "data" / "shared_memory" / "weekly_reports.jsonl"
VAULT_REPORTS_DIR = PROJECT_ROOT / "claude-vault" / "13-Reports"
PAPERCLIP_BASE = "http://127.0.0.1:3100"
PAPERCLIP_COMPANY = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"
TELEGRAM_SCRIPT = (
    Path.home() / ".claude" / "skills" / "telegram-message" / "scripts" / "send_telegram.py"
)
MIN_INTERVAL_DAYS = 6
MAX_PROMOTIONS = 10
MAX_ISSUES = 3
MIN_CLUSTER_SIZE = 3
TAG_OVERLAP_THRESHOLD = 5
SAMPLE_THRESHOLD = 5000
SAMPLE_SIZE = 2000
SPARSITY_THRESHOLD = 20
ERROR_KEYWORDS = {"error", "fail", "crash", "broken", "bug", "exception", "traceback", "timeout"}

# ── Lockfile guard ────────────────────────────────────────────────────────────


def _check_lockfile(force: bool) -> bool:
    """Return True if safe to proceed (enough time elapsed or force).

    Writes nothing; caller decides whether to proceed.
    """
    if force:
        return True
    if not LOCKFILE.exists():
        return True
    try:
        ts_str = LOCKFILE.read_text(encoding="utf-8").strip()
        last_run = datetime.fromisoformat(ts_str)
        elapsed = datetime.now(timezone.utc) - last_run
        if elapsed < timedelta(days=MIN_INTERVAL_DAYS):
            logger.info(
                "Skipping: last run was %s ago (< %d days). Use --force to override.",
                elapsed,
                MIN_INTERVAL_DAYS,
            )
            return False
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not read lockfile (%s); proceeding anyway.", exc)
    return True


def _write_lockfile(dry_run: bool) -> None:
    if dry_run:
        return
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    LOCKFILE.write_text(datetime.now(timezone.utc).isoformat(), encoding="utf-8")


def _write_error_lockfile(error: str, dry_run: bool) -> None:
    if dry_run:
        return
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"error": error, "at": datetime.now(timezone.utc).isoformat()}
    ERROR_LOCKFILE.write_text(json.dumps(payload), encoding="utf-8")


# ── Data collection ───────────────────────────────────────────────────────────


def _collect_entries(db_path: Path) -> list[dict]:
    """Query working_memories for the past 7 days excluding TTL-expired rows."""
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, source_agent, source_session, task_ref, timestamp, content,
                   tier, confidence, importance, ttl_hours, tags, created_at
            FROM working_memories
            WHERE
                datetime(timestamp) >= datetime('now', '-7 days')
                AND (
                    ttl_hours IS NULL
                    OR datetime(timestamp, '+' || ttl_hours || ' hours') > datetime('now')
                )
            ORDER BY timestamp ASC
            """,
        ).fetchall()
        conn.close()
    except sqlite3.Error as exc:
        logger.error("SQLite read failed: %s", exc)
        return []

    entries: list[dict] = []
    for row in rows:
        d = dict(row)
        try:
            d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        except (json.JSONDecodeError, TypeError):
            d["tags"] = []
        entries.append(d)
    return entries


def _collect_recent_promotion_hashes(db_path: Path) -> set[str]:
    """Return content_hash values from memory_promotions in the last 7 days."""
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT content_hash
            FROM memory_promotions
            WHERE
                content_hash IS NOT NULL
                AND datetime(created_at) >= datetime('now', '-7 days')
            """,
        ).fetchall()
        conn.close()
        return {row["content_hash"] for row in rows if row["content_hash"]}
    except sqlite3.Error as exc:
        logger.warning("Could not read memory_promotions: %s", exc)
        return set()


def _maybe_sample(entries: list[dict], week_iso: str) -> list[dict]:
    """Apply stratified sampling when entry count exceeds threshold."""
    if len(entries) <= SAMPLE_THRESHOLD:
        return entries

    logger.info(
        "Entry count %d exceeds %d; applying stratified sample of %d.",
        len(entries),
        SAMPLE_THRESHOLD,
        SAMPLE_SIZE,
    )
    # Parse iso week number for deterministic seed (e.g. "2026-W22" -> 22)
    try:
        week_num = int(week_iso.split("-W")[-1])
    except (ValueError, IndexError):
        week_num = 0
    rng = random.Random(week_num)  # noqa: S311 — deterministic, not security use

    # Group by (source_agent, tier)
    buckets: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for entry in entries:
        key = (entry.get("source_agent", "unknown"), entry.get("tier", "observation"))
        buckets[key].append(entry)

    # Proportional sampling
    total = len(entries)
    result: list[dict] = []
    for bucket_entries in buckets.values():
        proportion = len(bucket_entries) / total
        k = max(1, round(proportion * SAMPLE_SIZE))
        k = min(k, len(bucket_entries))
        result.extend(rng.sample(bucket_entries, k))

    # Trim to SAMPLE_SIZE if rounding went over
    if len(result) > SAMPLE_SIZE:
        rng.shuffle(result)
        result = result[:SAMPLE_SIZE]
    return result


# ── Pattern detection ─────────────────────────────────────────────────────────


def _content_dedup_hash(content: str) -> str:
    """SHA-256 of first 200 chars (stripped, lowercased)."""
    normalised = content.strip().lower()[:200]
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


def _is_error_cluster(contents: list[str], tags: list[str]) -> bool:
    """True if any content or tag contains error-related keywords."""
    all_text = " ".join(contents + tags).lower()
    return any(kw in all_text for kw in ERROR_KEYWORDS)


def _top_words(texts: list[str], n: int = 10) -> list[str]:
    """Simple word frequency: return top-n words ignoring short stopwords."""
    _STOPWORDS = {
        "the", "a", "an", "and", "or", "is", "in", "to", "of", "for",
        "with", "on", "at", "by", "from", "was", "are", "it", "be",
        "that", "this", "has", "have", "had", "not", "but", "as", "so",
        "we", "i", "you", "they", "he", "she",
    }
    counter: Counter[str] = Counter()
    for text in texts:
        words = text.lower().split()
        for word in words:
            cleaned = word.strip(".,;:!?\"'()[]{}")
            if len(cleaned) >= 4 and cleaned not in _STOPWORDS:
                counter[cleaned] += 1
    return [w for w, _ in counter.most_common(n)]


def _synthesize_summary(
    contents: list[str],
    common_tags: list[str],
    top_words: list[str],
    week_iso: str,
) -> str:
    """Build a short text summary for the cluster."""
    sample = contents[:3]
    tag_str = ", ".join(common_tags[:8]) if common_tags else "no tags"
    kw_str = ", ".join(top_words[:6]) if top_words else "no keywords"
    lines = [
        f"Weekly pattern cluster ({week_iso}) — tags: {tag_str}",
        f"Keywords: {kw_str}",
        "",
    ]
    lines.append("Sample entries:")
    for i, s in enumerate(sample, 1):
        lines.append(f"  {i}. {s[:150]}")
    return "\n".join(lines)


def _detect_patterns(
    entries: list[dict],
) -> dict:
    """
    Returns a dict with keys:
      - noise_ids: list of entry IDs that are exact duplicates (skip)
      - recurring_themes: list of cluster dicts
      - recurring_errors: list of cluster dicts
      - already_promoted_count: int
      - dedup_waste_count: int
    """
    result: dict = {
        "noise_ids": [],
        "recurring_themes": [],
        "recurring_errors": [],
        "already_promoted_count": 0,
        "dedup_waste_count": 0,
    }

    # --- Step 1: Content dedup grouping ---
    hash_to_ids: dict[str, list[str]] = defaultdict(list)
    for entry in entries:
        h = _content_dedup_hash(entry["content"])
        hash_to_ids[h].append(entry["id"])

    # Identify noise (3+ exact duplicates)
    duplicate_hashes: set[str] = set()
    for h, ids in hash_to_ids.items():
        if len(ids) >= MIN_CLUSTER_SIZE:
            result["noise_ids"].extend(ids)
            result["dedup_waste_count"] += len(ids)
            duplicate_hashes.add(h)

    noise_id_set = set(result["noise_ids"])

    # --- Step 2: Count already-promoted tiers (decision/lesson/policy) ---
    for entry in entries:
        if entry.get("tier") in ("decision", "lesson", "policy"):
            result["already_promoted_count"] += 1

    # --- Step 3: Tag co-occurrence clustering ---
    # Filter out noise entries
    active_entries = [e for e in entries if e["id"] not in noise_id_set]

    # Build per-entry tag set
    entry_tags: dict[str, set[str]] = {
        e["id"]: set(e.get("tags") or []) for e in active_entries
    }

    # Greedy clustering: group entries with >= TAG_OVERLAP_THRESHOLD common tags
    clustered: set[str] = set()
    clusters: list[list[dict]] = []

    entry_list = list(active_entries)
    for i, pivot in enumerate(entry_list):
        if pivot["id"] in clustered:
            continue
        pivot_tags = entry_tags[pivot["id"]]
        if not pivot_tags:
            continue

        cluster = [pivot]
        for other in entry_list[i + 1 :]:
            if other["id"] in clustered:
                continue
            other_tags = entry_tags[other["id"]]
            overlap = len(pivot_tags & other_tags)
            if overlap >= TAG_OVERLAP_THRESHOLD:
                cluster.append(other)

        if len(cluster) >= MIN_CLUSTER_SIZE:
            for e in cluster:
                clustered.add(e["id"])
            clusters.append(cluster)

    # --- Step 4: Classify clusters ---
    for cluster in clusters:
        ids = [e["id"] for e in cluster]
        contents = [e["content"] for e in cluster]
        all_tags: list[str] = []
        for e in cluster:
            all_tags.extend(e.get("tags") or [])

        # Common tags = tags appearing in > half the cluster
        tag_counts = Counter(all_tags)
        common_tags = [t for t, c in tag_counts.most_common() if c >= len(cluster) / 2]

        top_kw = _top_words(contents)
        avg_importance = sum(
            float(e.get("importance") or 0.5) for e in cluster
        ) / len(cluster)

        # Check for distinct content (not all duplicates)
        distinct_hashes = {_content_dedup_hash(c) for c in contents}
        has_distinct = len(distinct_hashes) >= MIN_CLUSTER_SIZE

        # Skip if already-promoted tier
        tiers = {e.get("tier") for e in cluster}
        if tiers.issubset({"decision", "lesson", "policy"}):
            result["already_promoted_count"] += len(cluster)
            continue

        if not has_distinct:
            # All duplicates within cluster — noise
            result["noise_ids"].extend(ids)
            result["dedup_waste_count"] += len(cluster)
            continue

        # Determine cluster label from common tags + top keywords
        label_parts = common_tags[:3] + top_kw[:2]
        label = " / ".join(label_parts)[:60] if label_parts else f"cluster-{len(clusters)}"

        cluster_info = {
            "label": label,
            "size": len(cluster),
            "ids": ids,
            "contents": contents,
            "common_tags": common_tags,
            "top_words": top_kw,
            "avg_importance": round(avg_importance, 3),
        }

        if _is_error_cluster(contents, all_tags):
            result["recurring_errors"].append(cluster_info)
        else:
            result["recurring_themes"].append(cluster_info)

    return result


# ── Auto-promotion ────────────────────────────────────────────────────────────


def _queue_promotions(
    themes: list[dict],
    week_iso: str,
    store: SQLiteMemoryStore,
    dry_run: bool,
) -> list[dict]:
    """Queue recurring themes for promotion. Returns list of queued items."""
    queued: list[dict] = []
    count = 0

    for theme in themes:
        if count >= MAX_PROMOTIONS:
            break

        summary = _synthesize_summary(
            theme["contents"],
            theme["common_tags"],
            theme["top_words"],
            week_iso,
        )
        content_hash = hashlib.sha256(summary.encode("utf-8")).hexdigest()

        # Skip if already promoted this week
        try:
            if not dry_run and store.has_completed_promotion_for_hash(content_hash):
                logger.info("Skipping promotion for '%s' — already completed.", theme["label"])
                continue
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not check promotion dedup: %s", exc)

        promotion_id = str(uuid4())
        payload = {
            "content": summary,
            "agent": "weekly-report",
            "source_runtime": "cron",
            "session_id": week_iso,
            "project": "edgeless-lab",
            "memory_type": "lesson",
            "confidence": theme["avg_importance"],
            "tags": theme["common_tags"],
            "entity_refs": [],
            "metadata": {},
        }
        reason = (
            f"Weekly pattern: {theme['label']} ({theme['size']} entries)"
        )

        if not dry_run:
            try:
                store.queue_promotion(
                    promotion_id=promotion_id,
                    record_id=None,
                    requested_by="weekly-learning-report",
                    target_collection="unified_knowledge",
                    reason=reason,
                    payload=payload,
                    metadata={},
                    status="QUEUED",
                    created_at=datetime.now(timezone.utc),
                )
                logger.info("Queued promotion %s for '%s'.", promotion_id, theme["label"])
            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to queue promotion for '%s': %s", theme["label"], exc)
                continue

        queued.append(
            {
                "promotion_id": promotion_id,
                "label": theme["label"],
                "size": theme["size"],
                "reason": reason,
            }
        )
        count += 1

    return queued


def _run_promotions(store: SQLiteMemoryStore, dry_run: bool) -> dict:
    """Run the promotion worker. Returns receipt dict."""
    if dry_run:
        logger.info("[DRY RUN] Would run PromotionWorker.run_once(limit=%d)", MAX_PROMOTIONS)
        return {"processed": 0, "completed": 0, "failed": 0, "skipped": 0, "errors": []}
    try:
        worker = PromotionWorker(store)
        receipt = worker.run_once(limit=MAX_PROMOTIONS)
        return {
            "processed": receipt.processed,
            "completed": receipt.completed,
            "failed": receipt.failed,
            "skipped": receipt.skipped,
            "errors": receipt.errors,
        }
    except Exception as exc:  # noqa: BLE001
        logger.error("PromotionWorker failed: %s", exc)
        return {"processed": 0, "completed": 0, "failed": 0, "skipped": 0, "errors": [str(exc)]}


# ── Paperclip issue creation ──────────────────────────────────────────────────


def _paperclip_get(path: str, timeout: int = 5) -> dict | None:
    url = f"{PAPERCLIP_BASE}{path}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        logger.warning("Paperclip GET %s failed: %s", path, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Paperclip GET %s unexpected error: %s", path, exc)
        return None


def _paperclip_post(path: str, body: dict, timeout: int = 10) -> dict | None:
    url = f"{PAPERCLIP_BASE}{path}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        logger.warning("Paperclip POST %s failed: %s", path, exc)
        return None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Paperclip POST %s unexpected error: %s", path, exc)
        return None


def _search_existing_issue(label: str) -> bool:
    """Return True if an open issue matching label already exists."""
    # URL-encode the search term minimally (spaces -> %20)
    search_term = label[:40].replace(" ", "%20").replace("/", "%2F")
    path = f"/api/companies/{PAPERCLIP_COMPANY}/issues?search={search_term}"
    response = _paperclip_get(path)
    if response is None:
        return False
    issues = response.get("data", [])
    if not isinstance(issues, list):
        return False
    return len(issues) > 0


def _create_paperclip_issues(
    errors: list[dict],
    week_iso: str,
    dry_run: bool,
) -> list[dict]:
    """Create Paperclip issues for recurring errors. Returns list of created items."""
    created: list[dict] = []
    count = 0

    for error_cluster in errors:
        if count >= MAX_ISSUES:
            break

        label = error_cluster["label"]
        title = f"[Weekly Pattern] {label}"[:69]  # max 70 chars including null

        # Check for existing issue
        if not dry_run:
            if _search_existing_issue(label):
                logger.info(
                    "Skipping issue creation for '%s' — matching issue already exists.", label
                )
                continue

        # Build description
        sample_entries = error_cluster["contents"][:3]
        samples_text = "\n".join(
            f"{i + 1}. {s[:200]}" for i, s in enumerate(sample_entries)
        )
        description = (
            f"**Weekly pattern detected** ({week_iso})\n\n"
            f"**Cluster**: {label}\n"
            f"**Occurrences**: {error_cluster['size']}\n\n"
            f"**Sample entries**:\n{samples_text}\n\n"
            f"*Auto-generated by weekly-learning-report cron.*"
        )

        if not dry_run:
            body = {
                "title": title,
                "description": description,
                "labels": ["auto-generated", "memory-pattern"],
            }
            response = _paperclip_post(f"/api/companies/{PAPERCLIP_COMPANY}/issues", body)
            if response is None:
                logger.error("Failed to create Paperclip issue for '%s'.", label)
                continue
            issue_id = response.get("id") or (
                response.get("data", {}).get("id") if isinstance(response.get("data"), dict) else None
            )
            if not issue_id:
                logger.warning("Paperclip returned 200 but no issue id for '%s' — possible 404 or validation error.", label)
                continue
            logger.info("Created Paperclip issue %s for '%s'.", issue_id, label)
        else:
            issue_id = "dry-run"
            logger.info("[DRY RUN] Would create issue: %s", title)

        created.append({"label": label, "title": title, "issue_id": issue_id})
        count += 1

    return created


# ── JSONL tracking ────────────────────────────────────────────────────────────


def _append_jsonl(record: dict, dry_run: bool) -> None:
    if dry_run:
        logger.info("[DRY RUN] Would append to %s:\n%s", JSONL_PATH, json.dumps(record, indent=2))
        return
    try:
        JSONL_PATH.parent.mkdir(parents=True, exist_ok=True)
        with JSONL_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
        logger.debug("Appended JSONL record to %s", JSONL_PATH)
    except OSError as exc:
        logger.error("Failed to write JSONL record: %s", exc)


# ── Vault report ──────────────────────────────────────────────────────────────


def _write_vault_report(
    week_iso: str,
    run_at: str,
    entries: list[dict],
    patterns: dict,
    queued: list[dict],
    issues_created: list[dict],
    receipt: dict,
    dedup_waste_pct: float,
    dry_run: bool,
) -> Path:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"weekly-learning-report-{week_iso}.md"
    report_path = VAULT_REPORTS_DIR / filename

    agent_counts: Counter[str] = Counter(e.get("source_agent", "unknown") for e in entries)
    tier_counts: Counter[str] = Counter(e.get("tier", "observation") for e in entries)

    # Sample entries for clusters
    def _cluster_section(clusters: list[dict], section_title: str) -> list[str]:
        lines: list[str] = [f"\n### {section_title}\n"]
        if not clusters:
            lines.append("No clusters detected.\n")
            return lines
        for cluster in clusters:
            lines.append(f"**{cluster['label']}** — {cluster['size']} entries")
            lines.append(f"- Tags: {', '.join(cluster['common_tags'][:6])}")
            lines.append(f"- Keywords: {', '.join(cluster['top_words'][:5])}")
            lines.append(f"- Avg importance: {cluster['avg_importance']}")
            lines.append("- Sample:")
            for i, content in enumerate(cluster["contents"][:2], 1):
                lines.append(f"  {i}. {content[:120]}")
            lines.append("")
        return lines

    lines: list[str] = [
        "---",
        "wing: operations",
        "note_type: weekly_report",
        f"date: {date_str}",
        "---",
        "",
        f"# Weekly Learning Report — {week_iso}",
        "",
        f"**Run at**: {run_at}",
        f"**Entry count**: {len(entries)}",
        "",
        "## Stats",
        "",
        f"- Total entries: {len(entries)}",
        f"- Dedup waste: {dedup_waste_pct:.1f}%",
        f"- Already promoted (decision/lesson/policy): {patterns['already_promoted_count']}",
        f"- Recurring themes detected: {len(patterns['recurring_themes'])}",
        f"- Recurring errors detected: {len(patterns['recurring_errors'])}",
        f"- Promotions queued: {len(queued)}",
        f"- Promotions completed: {receipt['completed']}",
        f"- Issues created: {len(issues_created)}",
        "",
        "### By Agent",
        "",
    ]
    for agent, cnt in agent_counts.most_common():
        lines.append(f"- {agent}: {cnt}")

    lines += [
        "",
        "### By Tier",
        "",
    ]
    for tier, cnt in tier_counts.most_common():
        lines.append(f"- {tier}: {cnt}")

    lines += _cluster_section(patterns["recurring_themes"], "Recurring Themes")
    lines += _cluster_section(patterns["recurring_errors"], "Recurring Errors")

    if queued:
        lines += ["\n## Promotions Queued\n"]
        for item in queued:
            lines.append(f"- {item['label']} ({item['size']} entries) — {item['promotion_id']}")

    if issues_created:
        lines += ["\n## Paperclip Issues Created\n"]
        for item in issues_created:
            lines.append(f"- [{item['title']}] issue_id={item['issue_id']}")

    if receipt.get("errors"):
        lines += ["\n## Promotion Worker Errors\n"]
        for err in receipt["errors"]:
            lines.append(f"- {err}")

    lines.append("")
    report_text = "\n".join(lines)

    if dry_run:
        logger.info("[DRY RUN] Would write vault report to %s", report_path)
        logger.debug("Report content:\n%s", report_text)
        return report_path

    try:
        VAULT_REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report_text, encoding="utf-8")
        logger.info("Vault report written to %s", report_path)
    except OSError as exc:
        logger.error("Failed to write vault report: %s", exc)

    return report_path


# ── Telegram alert ────────────────────────────────────────────────────────────


def _send_telegram(
    week_iso: str,
    entry_count: int,
    cluster_count: int,
    pattern_count: int,
    promotions_queued: int,
    issues_created: int,
    dedup_waste_pct: float,
    dry_run: bool,
) -> None:
    week_num = week_iso.split("-W")[-1] if "-W" in week_iso else week_iso
    msg = (
        f"Weekly Memory Report - W{week_num}\n"
        f"\n"
        f"{entry_count} entries | {cluster_count} clusters | {pattern_count} patterns\n"
        f"Promoted: {promotions_queued} to unified_knowledge\n"
        f"Issues: {issues_created} created\n"
        f"Dedup waste: {dedup_waste_pct:.1f}%\n"
        f"\n"
        f"Full: claude-vault/13-Reports/weekly-learning-report-{week_iso}.md"
    )

    if dry_run:
        logger.info("[DRY RUN] Would send Telegram:\n%s", msg)
        return

    if not TELEGRAM_SCRIPT.exists():
        logger.warning("Telegram script not found at %s; skipping.", TELEGRAM_SCRIPT)
        return

    try:
        result = subprocess.run(
            ["python3.11", str(TELEGRAM_SCRIPT), msg],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning(
                "Telegram script exited %d: %s", result.returncode, result.stderr.strip()
            )
        else:
            logger.info("Telegram alert sent.")
    except subprocess.TimeoutExpired:
        logger.warning("Telegram script timed out after 30 seconds.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Telegram send failed: %s", exc)


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> int:  # noqa: C901 — long but linear
    parser = argparse.ArgumentParser(
        description="Weekly Learning Report — pattern detection from working memory."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without writing anything.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass the 6-day lockfile guard.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    dry_run: bool = args.dry_run
    if dry_run:
        logger.info("=== DRY RUN MODE — no writes ===")

    # ── Lockfile guard ────────────────────────────────────────────────────────
    if not _check_lockfile(args.force):
        return 0

    run_at = datetime.now(timezone.utc).isoformat()
    now_dt = datetime.now(timezone.utc)
    week_iso = now_dt.strftime("%G-W%V")  # ISO week e.g. "2026-W22"

    logger.info("Starting weekly learning report for %s.", week_iso)

    try:
        db_path = DEFAULT_SHARED_MEMORY_DB_PATH

        # ── Collect data ──────────────────────────────────────────────────────
        logger.info("Collecting working_memories from past 7 days...")
        all_entries = _collect_entries(db_path)
        logger.info("Collected %d entries.", len(all_entries))

        recent_hash_count = len(_collect_recent_promotion_hashes(db_path))
        logger.debug("Found %d recent promotion hashes (dedup guard).", recent_hash_count)

        # ── Sparsity check ────────────────────────────────────────────────────
        if len(all_entries) < SPARSITY_THRESHOLD:
            logger.info(
                "Only %d entries (< %d threshold). Producing stats-only report.",
                len(all_entries),
                SPARSITY_THRESHOLD,
            )
            patterns: dict = {
                "noise_ids": [],
                "recurring_themes": [],
                "recurring_errors": [],
                "already_promoted_count": 0,
                "dedup_waste_count": 0,
            }
        else:
            # ── Sampling ──────────────────────────────────────────────────────
            sampled_entries = _maybe_sample(all_entries, week_iso)
            logger.info("Using %d entries for pattern analysis.", len(sampled_entries))

            # ── Pattern detection ─────────────────────────────────────────────
            logger.info("Detecting patterns...")
            patterns = _detect_patterns(sampled_entries)
            logger.info(
                "Patterns: %d themes, %d errors, %d noise entries.",
                len(patterns["recurring_themes"]),
                len(patterns["recurring_errors"]),
                len(patterns["noise_ids"]),
            )

        # ── Metrics ───────────────────────────────────────────────────────────
        total = len(all_entries)
        dedup_waste_pct = (
            (patterns["dedup_waste_count"] / total * 100) if total > 0 else 0.0
        )
        cluster_count = len(patterns["recurring_themes"]) + len(patterns["recurring_errors"])
        pattern_count = len(patterns["recurring_themes"]) + len(patterns["recurring_errors"])

        # ── Auto-promotion ────────────────────────────────────────────────────
        store = SQLiteMemoryStore(db_path)
        queued: list[dict] = []

        if patterns["recurring_themes"]:
            logger.info(
                "Queuing %d theme(s) for promotion...", len(patterns["recurring_themes"])
            )
            queued = _queue_promotions(
                patterns["recurring_themes"], week_iso, store, dry_run
            )
            logger.info("Queued %d promotions.", len(queued))

        receipt = _run_promotions(store, dry_run)
        logger.info(
            "Promotion worker: processed=%d completed=%d failed=%d skipped=%d",
            receipt["processed"],
            receipt["completed"],
            receipt["failed"],
            receipt["skipped"],
        )

        # ── Paperclip issues ──────────────────────────────────────────────────
        issues_created: list[dict] = []
        if patterns["recurring_errors"]:
            logger.info(
                "Creating Paperclip issues for %d error cluster(s)...",
                len(patterns["recurring_errors"]),
            )
            issues_created = _create_paperclip_issues(
                patterns["recurring_errors"], week_iso, dry_run
            )
            logger.info("Created %d Paperclip issue(s).", len(issues_created))

        # ── Agent breakdown ───────────────────────────────────────────────────
        agent_counts: Counter[str] = Counter(
            e.get("source_agent", "unknown") for e in all_entries
        )

        # ── Top clusters for JSONL ────────────────────────────────────────────
        all_clusters = patterns["recurring_themes"] + patterns["recurring_errors"]
        top_clusters = [
            {
                "label": c["label"],
                "size": c["size"],
                "action": "promoted" if c in patterns["recurring_themes"] else "issue_created",
            }
            for c in sorted(all_clusters, key=lambda c: c["size"], reverse=True)[:5]
        ]

        # ── JSONL record ──────────────────────────────────────────────────────
        jsonl_record = {
            "type": "weekly_learning_report",
            "week_iso": week_iso,
            "run_at": run_at,
            "entry_count": total,
            "cluster_count": cluster_count,
            "patterns_found": pattern_count,
            "promotions_queued": len(queued),
            "issues_created": len(issues_created),
            "dedup_waste_pct": round(dedup_waste_pct, 2),
            "top_clusters": top_clusters,
            "agents": dict(agent_counts.most_common(10)),
        }
        _append_jsonl(jsonl_record, dry_run)

        # ── Vault report ──────────────────────────────────────────────────────
        _write_vault_report(
            week_iso=week_iso,
            run_at=run_at,
            entries=all_entries,
            patterns=patterns,
            queued=queued,
            issues_created=issues_created,
            receipt=receipt,
            dedup_waste_pct=dedup_waste_pct,
            dry_run=dry_run,
        )

        # ── Telegram ──────────────────────────────────────────────────────────
        _send_telegram(
            week_iso=week_iso,
            entry_count=total,
            cluster_count=cluster_count,
            pattern_count=pattern_count,
            promotions_queued=len(queued),
            issues_created=len(issues_created),
            dedup_waste_pct=dedup_waste_pct,
            dry_run=dry_run,
        )

        # ── Update lockfile ───────────────────────────────────────────────────
        _write_lockfile(dry_run)

        logger.info("Weekly learning report complete for %s.", week_iso)
        return 0

    except Exception as exc:
        logger.error("Fatal error: %s", exc, exc_info=True)
        _write_error_lockfile(str(exc), dry_run)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
