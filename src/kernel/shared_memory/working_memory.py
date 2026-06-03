"""Append-only working memory store for swarm agent coordination."""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .config import DEFAULT_SHARED_MEMORY_DB_PATH

TIER_ORDER = ("observation", "decision", "lesson", "policy")

_WS_RE = re.compile(r"\s+")


def _content_hash(content: str) -> str:
    """Stable hash of normalized content for write-time dedup.

    Normalizes case and whitespace so trivially-different restatements of the
    same observation collapse to one hash. Scoped per source_agent at the call
    site, so two different agents independently noting the same thing are both
    kept (a convergence signal the connection miner can link).
    """
    normalized = _WS_RE.sub(" ", content.strip().lower())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS working_memories (
    id TEXT PRIMARY KEY,
    source_agent TEXT NOT NULL,
    source_session TEXT NOT NULL,
    task_ref TEXT,
    timestamp TEXT NOT NULL,
    content TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'observation',
    confidence REAL DEFAULT 0.5,
    importance REAL DEFAULT 0.5,
    ttl_hours INTEGER,
    provenance TEXT,
    sensitivity TEXT DEFAULT 'internal',
    tags TEXT,
    promoted_from TEXT,
    promoted_by TEXT,
    promoted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_wm_agent ON working_memories(source_agent);
CREATE INDEX IF NOT EXISTS idx_wm_tier ON working_memories(tier);
CREATE INDEX IF NOT EXISTS idx_wm_task ON working_memories(task_ref);
CREATE INDEX IF NOT EXISTS idx_wm_timestamp ON working_memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_wm_importance ON working_memories(importance DESC);
"""


class WorkingMemoryStore:
    """Append-only SQLite store for swarm working memory."""

    def __init__(self, db_path: str | Path = DEFAULT_SHARED_MEMORY_DB_PATH):
        """Initialize, create table if not exists."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(_CREATE_TABLE_SQL)
            # Migrate: add sign_off column if missing (idempotent)
            try:
                conn.execute("ALTER TABLE working_memories ADD COLUMN sign_off TEXT")
            except sqlite3.OperationalError:
                pass
            # Migrate: add content_hash column + index for write-time dedup (idempotent)
            try:
                conn.execute("ALTER TABLE working_memories ADD COLUMN content_hash TEXT")
            except sqlite3.OperationalError:
                pass
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_wm_agent_hash "
                "ON working_memories(source_agent, content_hash)"
            )

    def _connect(self) -> sqlite3.Connection:
        """Open a connection with Row factory."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _insert(
        self,
        source_agent: str,
        source_session: str,
        content: str,
        tier: str,
        task_ref: str | None,
        confidence: float,
        importance: float,
        ttl_hours: int | None,
        tags: list[str] | None,
        sensitivity: str,
        provenance: str,
        promoted_from: str | None = None,
        dedup: bool = True,
    ) -> str:
        """Write a single row; return its ID.

        When ``dedup`` is True (the default), an entry whose normalized content
        already exists for the same ``source_agent`` is skipped and the existing
        ID is returned. This keeps the table append-only in spirit (no
        overwrites) while preventing one agent from re-logging the same
        observation — the cause of the corpus's near-50% duplication.
        """
        chash = _content_hash(content)
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        tags_json = json.dumps(tags or [])
        with self._connect() as conn:
            if dedup:
                existing = conn.execute(
                    "SELECT id FROM working_memories "
                    "WHERE source_agent = ? AND content_hash = ? LIMIT 1",
                    (source_agent, chash),
                ).fetchone()
                if existing is not None:
                    return existing["id"]
            entry_id = str(uuid4())
            conn.execute(
                """
                INSERT INTO working_memories (
                    id, source_agent, source_session, task_ref,
                    timestamp, content, tier, confidence, importance,
                    ttl_hours, provenance, sensitivity, tags,
                    promoted_from, created_at, content_hash
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry_id,
                    source_agent,
                    source_session,
                    task_ref,
                    now,
                    content,
                    tier,
                    confidence,
                    importance,
                    ttl_hours,
                    provenance,
                    sensitivity,
                    tags_json,
                    promoted_from,
                    now,
                    chash,
                ),
            )
        return entry_id

    # --- WRITE ---

    def write_observation(
        self,
        source_agent: str,
        source_session: str,
        content: str,
        task_ref: str | None = None,
        confidence: float = 0.5,
        importance: float = 0.5,
        ttl_hours: int | None = None,
        tags: list[str] | None = None,
        sensitivity: str = "internal",
    ) -> str:
        """Write a raw observation. Returns the entry ID."""
        return self._insert(
            source_agent=source_agent,
            source_session=source_session,
            content=content,
            tier="observation",
            task_ref=task_ref,
            confidence=confidence,
            importance=importance,
            ttl_hours=ttl_hours,
            tags=tags,
            sensitivity=sensitivity,
            provenance="agent_observation",
        )

    def write_decision(
        self,
        source_agent: str,
        source_session: str,
        content: str,
        task_ref: str | None = None,
        confidence: float = 0.7,
        importance: float = 0.7,
        tags: list[str] | None = None,
        provenance: str = "agent_decision",
    ) -> str:
        """Write a decision. Higher default confidence/importance than observations."""
        return self._insert(
            source_agent=source_agent,
            source_session=source_session,
            content=content,
            tier="decision",
            task_ref=task_ref,
            confidence=confidence,
            importance=importance,
            ttl_hours=None,
            tags=tags,
            sensitivity="internal",
            provenance=provenance,
        )

    # --- PROMOTE ---

    def promote(self, entry_id: str, new_tier: str, promoted_by: str, sign_off: str | None = None) -> bool:
        """Promote an entry to a higher tier. Only upward. Returns True on success.

        Policy-tier promotions require a recorded sign-off (e.g. autoreason verdict
        or human approval) to prevent self-improvement loops from unilaterally
        minting top-tier policy.
        """
        if new_tier not in TIER_ORDER:
            raise ValueError(f"Unknown tier '{new_tier}'. Valid: {TIER_ORDER}")
        if new_tier == "policy" and not sign_off:
            raise ValueError(
                "Policy-tier promotion requires a recorded sign_off "
                "(e.g. 'autoreason:verdict' or 'david:telegram')."
            )
        with self._connect() as conn:
            row = conn.execute(
                "SELECT tier FROM working_memories WHERE id = ?",
                (entry_id,),
            ).fetchone()
            if row is None:
                return False
            current_tier = row["tier"]
            current_idx = TIER_ORDER.index(current_tier) if current_tier in TIER_ORDER else -1
            new_idx = TIER_ORDER.index(new_tier)
            if new_idx <= current_idx:
                raise ValueError(
                    f"Cannot demote or stay at same tier: '{current_tier}' -> '{new_tier}'"
                )
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            result = conn.execute(
                """
                UPDATE working_memories
                SET tier = ?, promoted_by = ?, promoted_at = ?, sign_off = ?
                WHERE id = ? AND tier = ?
                """,
                (new_tier, promoted_by, now, sign_off, entry_id, current_tier),
            )
        return result.rowcount > 0

    # --- READ ---

    def get_recent(
        self,
        limit: int = 50,
        agent: str | None = None,
        tier: str | None = None,
        task_ref: str | None = None,
        min_importance: float | None = None,
        since_hours: int | None = None,
    ) -> list[dict]:
        """Get recent working memories with optional filters. Excludes expired (TTL) entries."""
        clauses: list[str] = []
        params: list[object] = []

        # Exclude TTL-expired entries
        clauses.append(
            "(ttl_hours IS NULL OR datetime(timestamp, '+' || ttl_hours || ' hours') > datetime('now'))"
        )

        if agent:
            clauses.append("source_agent = ?")
            params.append(agent)
        if tier:
            clauses.append("tier = ?")
            params.append(tier)
        if task_ref:
            clauses.append("task_ref = ?")
            params.append(task_ref)
        if min_importance is not None:
            clauses.append("importance >= ?")
            params.append(min_importance)
        if since_hours is not None:
            clauses.append(
                "datetime(timestamp) > datetime('now', ? || ' hours')"
            )
            params.append(f"-{since_hours}")

        where = "WHERE " + " AND ".join(clauses) if clauses else ""
        params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM working_memories
                {where}
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def get_by_tier(self, tier: str, limit: int = 50) -> list[dict]:
        """Get all entries at a specific tier."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM working_memories
                WHERE tier = ?
                  AND (ttl_hours IS NULL
                       OR datetime(timestamp, '+' || ttl_hours || ' hours') > datetime('now'))
                ORDER BY importance DESC, timestamp DESC
                LIMIT ?
                """,
                (tier, limit),
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def get_for_injection(
        self,
        agent: str | None = None,
        max_tokens: int = 2000,
    ) -> list[dict]:
        """Get entries suitable for prompt injection. Only decision/lesson/policy tiers."""
        clauses = ["tier IN ('decision', 'lesson', 'policy')"]
        params: list[object] = []

        clauses.append(
            "(ttl_hours IS NULL OR datetime(timestamp, '+' || ttl_hours || ' hours') > datetime('now'))"
        )

        if agent:
            clauses.append("source_agent = ?")
            params.append(agent)

        where = "WHERE " + " AND ".join(clauses)
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM working_memories
                {where}
                ORDER BY importance DESC, timestamp DESC
                LIMIT 200
                """,
                params,
            ).fetchall()

        results: list[dict] = []
        token_budget = max_tokens
        for row in rows:
            entry = self._row_to_dict(row)
            estimated_tokens = len(entry["content"]) // 4
            if estimated_tokens > token_budget:
                break
            results.append(entry)
            token_budget -= estimated_tokens
        return results

    # --- MAINTENANCE ---

    def expire_stale(self) -> int:
        """Delete entries past their TTL. Returns count deleted."""
        with self._connect() as conn:
            result = conn.execute(
                """
                DELETE FROM working_memories
                WHERE ttl_hours IS NOT NULL
                  AND datetime(timestamp, '+' || ttl_hours || ' hours') <= datetime('now')
                """
            )
        return result.rowcount

    def stats(self) -> dict:
        """Return counts by tier, agent, and age distribution."""
        with self._connect() as conn:
            tier_rows = conn.execute(
                "SELECT tier, COUNT(*) AS cnt FROM working_memories GROUP BY tier"
            ).fetchall()
            agent_rows = conn.execute(
                "SELECT source_agent, COUNT(*) AS cnt FROM working_memories GROUP BY source_agent"
            ).fetchall()
            total = conn.execute(
                "SELECT COUNT(*) AS cnt FROM working_memories"
            ).fetchone()["cnt"]
            age_rows = conn.execute(
                """
                SELECT
                    SUM(CASE WHEN datetime(timestamp) >= datetime('now', '-1 hour') THEN 1 ELSE 0 END) AS last_1h,
                    SUM(CASE WHEN datetime(timestamp) >= datetime('now', '-24 hours') THEN 1 ELSE 0 END) AS last_24h,
                    SUM(CASE WHEN datetime(timestamp) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS last_7d
                FROM working_memories
                """
            ).fetchone()
        return {
            "total": total,
            "by_tier": {row["tier"]: row["cnt"] for row in tier_rows},
            "by_agent": {row["source_agent"]: row["cnt"] for row in agent_rows},
            "age_distribution": {
                "last_1h": age_rows["last_1h"] or 0,
                "last_24h": age_rows["last_24h"] or 0,
                "last_7d": age_rows["last_7d"] or 0,
            },
        }

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict:
        """Convert a sqlite3.Row to a plain dict, deserializing tags JSON."""
        d = dict(row)
        try:
            d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        except (json.JSONDecodeError, TypeError):
            d["tags"] = []
        return d
