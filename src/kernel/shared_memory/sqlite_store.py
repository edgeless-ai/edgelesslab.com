"""SQLite-backed append-only episodic memory store."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from .models import (
    MemoryRecord,
    PromotionStatus,
    SearchHit,
    SearchMemoryRequest,
    SearchSource,
    WriteEpisodeRequest,
)


class SQLiteMemoryStore:
    """Small SQLite store for durable episodic memory and promotion queueing."""

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._fts_enabled = False
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(str(self.db_path))
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS memory_episodes (
                    id TEXT PRIMARY KEY,
                    agent TEXT NOT NULL,
                    source_runtime TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    project TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tags_json TEXT NOT NULL,
                    entity_refs_json TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    trace_id TEXT,
                    span_id TEXT,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_memory_episodes_created_at
                    ON memory_episodes(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_memory_episodes_agent
                    ON memory_episodes(agent);
                CREATE INDEX IF NOT EXISTS idx_memory_episodes_project
                    ON memory_episodes(project);
                CREATE INDEX IF NOT EXISTS idx_memory_episodes_session
                    ON memory_episodes(session_id);

                CREATE TABLE IF NOT EXISTS memory_promotions (
                    id TEXT PRIMARY KEY,
                    record_id TEXT,
                    requested_by TEXT NOT NULL,
                    target_collection TEXT NOT NULL,
                    reason TEXT,
                    content_hash TEXT,
                    payload_json TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    last_error TEXT,
                    processed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_memory_promotions_status
                    ON memory_promotions(status, created_at);
                """
            )
            try:
                connection.execute(
                    """
                    CREATE VIRTUAL TABLE IF NOT EXISTS memory_episodes_fts USING fts5(
                        id UNINDEXED,
                        content,
                        tags_text,
                        entity_refs_text
                    )
                    """
                )
                self._fts_enabled = True
            except sqlite3.OperationalError:
                self._fts_enabled = False
            self._ensure_column(
                connection,
                table_name="memory_promotions",
                column_name="content_hash",
                column_definition="TEXT",
            )
            self._ensure_column(
                connection,
                table_name="memory_promotions",
                column_name="attempts",
                column_definition="INTEGER NOT NULL DEFAULT 0",
            )
            self._ensure_column(
                connection,
                table_name="memory_promotions",
                column_name="last_error",
                column_definition="TEXT",
            )
            self._ensure_column(
                connection,
                table_name="memory_promotions",
                column_name="processed_at",
                column_definition="TEXT",
            )
            self._ensure_column(
                connection,
                table_name="memory_promotions",
                column_name="updated_at",
                column_definition="TEXT",
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_memory_promotions_hash
                    ON memory_promotions(content_hash)
                """
            )
            if self._fts_enabled:
                self._rebuild_fts_index(connection)

    def write_episode(self, request: WriteEpisodeRequest) -> MemoryRecord:
        record = MemoryRecord(
            id=str(uuid4()),
            agent=request.agent,
            source_runtime=request.source_runtime,
            session_id=request.session_id,
            project=request.project,
            memory_type=request.memory_type,
            content=request.content,
            tags=request.tags,
            entity_refs=request.entity_refs,
            confidence=request.confidence,
            trace_id=request.trace_id,
            span_id=request.span_id,
            metadata=request.metadata,
            created_at=datetime.now(timezone.utc),
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO memory_episodes (
                    id, agent, source_runtime, session_id, project, memory_type,
                    content, tags_json, entity_refs_json, confidence,
                    trace_id, span_id, metadata_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.agent,
                    record.source_runtime,
                    record.session_id,
                    record.project,
                    record.memory_type,
                    record.content,
                    json.dumps(record.tags),
                    json.dumps(record.entity_refs),
                    record.confidence,
                    record.trace_id,
                    record.span_id,
                    json.dumps(record.metadata),
                    record.created_at.isoformat(),
                ),
            )
            if self._fts_enabled:
                connection.execute(
                    """
                    INSERT INTO memory_episodes_fts (id, content, tags_text, entity_refs_text)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        record.id,
                        record.content,
                        " ".join(record.tags),
                        " ".join(record.entity_refs),
                    ),
                )
        return record

    def get_record(self, record_id: str) -> MemoryRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM memory_episodes WHERE id = ?",
                (record_id,),
            ).fetchone()
        return self._row_to_record(row) if row else None

    def recent_episodes(
        self,
        *,
        agent: str | None = None,
        project: str | None = None,
        session_id: str | None = None,
        limit: int = 10,
    ) -> list[MemoryRecord]:
        clauses: list[str] = []
        params: list[object] = []
        if agent:
            clauses.append("agent = ?")
            params.append(agent)
        if project:
            clauses.append("project = ?")
            params.append(project)
        if session_id:
            clauses.append("session_id = ?")
            params.append(session_id)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.append(limit)
        with self._connect() as connection:
            rows = connection.execute(
                f"""
                SELECT * FROM memory_episodes
                {where}
                ORDER BY created_at DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def search_episodes(self, request: SearchMemoryRequest) -> list[SearchHit]:
        with self._connect() as connection:
            try:
                if self._fts_enabled:
                    rows = self._search_episodes_via_fts(connection, request)
                else:
                    rows = self._search_episodes_via_like(connection, request)
            except sqlite3.OperationalError:
                rows = self._search_episodes_via_like(connection, request)
        return [self._row_to_hit(row, request) for row in rows]

    def queue_promotion(
        self,
        *,
        promotion_id: str,
        record_id: str | None,
        requested_by: str,
        target_collection: str,
        reason: str | None,
        payload: dict,
        metadata: dict,
        status: str,
        created_at: datetime,
    ) -> None:
        payload_content = payload.get("content", "")
        content_hash = hashlib.sha256(payload_content.encode("utf-8")).hexdigest()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO memory_promotions (
                    id, record_id, requested_by, target_collection,
                    reason, content_hash, payload_json, metadata_json, status,
                    attempts, last_error, processed_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    promotion_id,
                    record_id,
                    requested_by,
                    target_collection,
                    reason,
                    content_hash,
                    json.dumps(payload),
                    json.dumps(metadata),
                    status,
                    0,
                    None,
                    None,
                    created_at.isoformat(),
                    created_at.isoformat(),
                ),
            )

    def claim_pending_promotions(self, limit: int = 10) -> list[dict[str, Any]]:
        claimed: list[dict[str, Any]] = []
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM memory_promotions
                WHERE status IN (?, ?)
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (PromotionStatus.QUEUED, PromotionStatus.FAILED, limit),
            ).fetchall()
            for row in rows:
                now = datetime.now(timezone.utc).isoformat()
                updated = connection.execute(
                    """
                    UPDATE memory_promotions
                    SET status = ?, attempts = attempts + 1, updated_at = ?
                    WHERE id = ? AND status IN (?, ?)
                    """,
                    (
                        PromotionStatus.PROCESSING,
                        now,
                        row["id"],
                        PromotionStatus.QUEUED,
                        PromotionStatus.FAILED,
                    ),
                )
                if updated.rowcount:
                    claimed.append(self._promotion_row_to_dict({**dict(row), "status": PromotionStatus.PROCESSING, "updated_at": now, "attempts": row["attempts"] + 1}))
        return claimed

    def mark_promotion_completed(
        self,
        promotion_id: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        with self._connect() as connection:
            existing = connection.execute(
                "SELECT metadata_json FROM memory_promotions WHERE id = ?",
                (promotion_id,),
            ).fetchone()
            merged_metadata = json.loads(existing["metadata_json"]) if existing else {}
            if metadata:
                merged_metadata.update(metadata)
            now = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE memory_promotions
                SET status = ?, metadata_json = ?, processed_at = ?, updated_at = ?, last_error = NULL
                WHERE id = ?
                """,
                (
                    PromotionStatus.COMPLETED,
                    json.dumps(merged_metadata),
                    now,
                    now,
                    promotion_id,
                ),
            )

    def mark_promotion_failed(self, promotion_id: str, error: str) -> None:
        with self._connect() as connection:
            now = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE memory_promotions
                SET status = ?, last_error = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    PromotionStatus.FAILED,
                    error,
                    now,
                    promotion_id,
                ),
            )

    def get_promotion(self, promotion_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM memory_promotions WHERE id = ?",
                (promotion_id,),
            ).fetchone()
        return self._promotion_row_to_dict(row) if row else None

    def has_completed_promotion_for_hash(self, content_hash: str) -> bool:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT 1
                FROM memory_promotions
                WHERE content_hash = ? AND status = ?
                LIMIT 1
                """,
                (content_hash, PromotionStatus.COMPLETED),
            ).fetchone()
        return bool(row)

    def _search_episodes_via_fts(
        self,
        connection: sqlite3.Connection,
        request: SearchMemoryRequest,
    ) -> list[sqlite3.Row]:
        fts_query = self._build_fts_query(request.query)
        clauses = ["memory_episodes_fts MATCH ?"]
        params: list[object] = [fts_query]
        clauses.extend(self._build_filter_clauses(request, params, table_alias="e"))
        sql = f"""
            SELECT e.*, bm25(memory_episodes_fts, 1.8, 0.5, 0.4) AS text_rank
            FROM memory_episodes_fts
            JOIN memory_episodes AS e ON e.id = memory_episodes_fts.id
            WHERE {' AND '.join(clauses)}
            ORDER BY text_rank ASC, e.created_at DESC
            LIMIT ?
        """
        params.append(max(request.limit * 5, request.limit))
        return connection.execute(sql, params).fetchall()

    def _search_episodes_via_like(
        self,
        connection: sqlite3.Connection,
        request: SearchMemoryRequest,
    ) -> list[sqlite3.Row]:
        clauses = ["(content LIKE ? OR tags_json LIKE ? OR entity_refs_json LIKE ?)"]
        like_query = f"%{request.query}%"
        params: list[object] = [like_query, like_query, like_query]
        clauses.extend(self._build_filter_clauses(request, params, table_alias=None))
        sql = f"""
            SELECT *, 999.0 AS text_rank
            FROM memory_episodes
            WHERE {' AND '.join(clauses)}
            ORDER BY created_at DESC
            LIMIT ?
        """
        params.append(max(request.limit * 5, request.limit))
        return connection.execute(sql, params).fetchall()

    def _build_filter_clauses(
        self,
        request: SearchMemoryRequest,
        params: list[object],
        *,
        table_alias: str | None,
    ) -> list[str]:
        prefix = f"{table_alias}." if table_alias else ""
        clauses: list[str] = []
        if request.agent:
            clauses.append(f"{prefix}agent = ?")
            params.append(request.agent)
        if request.project:
            clauses.append(f"{prefix}project = ?")
            params.append(request.project)
        if request.session_id:
            clauses.append(f"{prefix}session_id = ?")
            params.append(request.session_id)
        if request.memory_types:
            placeholders = ", ".join("?" for _ in request.memory_types)
            clauses.append(f"{prefix}memory_type IN ({placeholders})")
            params.extend(request.memory_types)
        return clauses

    @staticmethod
    def _build_fts_query(query: str) -> str:
        terms = [term.strip('"').strip() for term in query.split() if term.strip()]
        if not terms:
            return '""'
        return " AND ".join(f'"{term}"' for term in terms)

    def _row_to_hit(self, row: sqlite3.Row, request: SearchMemoryRequest) -> SearchHit:
        record = self._row_to_record(row)
        metadata = dict(record.metadata)
        text_rank = float(row["text_rank"]) if "text_rank" in row.keys() else 999.0
        score = self._compute_hit_score(record, request, text_rank=text_rank)
        metadata["text_rank"] = text_rank
        return SearchHit(
            source=SearchSource.EPISODIC,
            score=score,
            content=record.content,
            record_id=record.id,
            agent=record.agent,
            project=record.project,
            session_id=record.session_id,
            memory_type=record.memory_type,
            created_at=record.created_at,
            metadata=metadata,
        )

    def _compute_hit_score(
        self,
        record: MemoryRecord,
        request: SearchMemoryRequest,
        *,
        text_rank: float,
    ) -> float:
        haystacks = [
            record.content.lower(),
            " ".join(record.tags).lower(),
            " ".join(record.entity_refs).lower(),
        ]
        query_terms = [term.lower() for term in request.query.split() if term.strip()]
        overlap = sum(1 for term in query_terms if any(term in haystack for haystack in haystacks))
        lexical_score = overlap / max(len(query_terms), 1)
        recency_days = max((datetime.now(timezone.utc) - record.created_at).total_seconds() / 86400.0, 0.0)
        recency_score = 1.0 / (1.0 + recency_days)
        text_score = 1.0 / (1.0 + max(text_rank, 0.0))
        exact_match_bonus = 0.0
        if request.agent and request.agent == record.agent:
            exact_match_bonus += 0.35
        if request.project and request.project == record.project:
            exact_match_bonus += 0.35
        if request.session_id and request.session_id == record.session_id:
            exact_match_bonus += 0.2
        tag_bonus = min(0.3, 0.1 * overlap)
        final_score = (
            (2.2 * lexical_score)
            + (1.4 * text_score)
            + (0.8 * recency_score)
            + (0.9 * record.confidence)
            + exact_match_bonus
            + tag_bonus
        )
        return round(final_score, 4)

    @staticmethod
    def _ensure_column(
        connection: sqlite3.Connection,
        *,
        table_name: str,
        column_name: str,
        column_definition: str,
    ) -> None:
        columns = {
            row["name"]
            for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
        }
        if column_name not in columns:
            connection.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
            )

    def _rebuild_fts_index(self, connection: sqlite3.Connection) -> None:
        connection.execute("DELETE FROM memory_episodes_fts")
        connection.execute(
            """
            INSERT INTO memory_episodes_fts (id, content, tags_text, entity_refs_text)
            SELECT id, content, tags_json, entity_refs_json
            FROM memory_episodes
            """
        )

    @staticmethod
    def _promotion_row_to_dict(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
        payload = row if isinstance(row, dict) else dict(row)
        return {
            "id": payload["id"],
            "record_id": payload["record_id"],
            "requested_by": payload["requested_by"],
            "target_collection": payload["target_collection"],
            "reason": payload.get("reason"),
            "content_hash": payload.get("content_hash"),
            "payload": json.loads(payload["payload_json"]),
            "metadata": json.loads(payload["metadata_json"]),
            "status": payload["status"],
            "attempts": payload.get("attempts", 0),
            "last_error": payload.get("last_error"),
            "processed_at": payload.get("processed_at"),
            "created_at": payload["created_at"],
            "updated_at": payload.get("updated_at"),
        }

    @staticmethod
    def _row_to_record(row: sqlite3.Row) -> MemoryRecord:
        return MemoryRecord(
            id=row["id"],
            agent=row["agent"],
            source_runtime=row["source_runtime"],
            session_id=row["session_id"],
            project=row["project"],
            memory_type=row["memory_type"],
            content=row["content"],
            tags=json.loads(row["tags_json"]),
            entity_refs=json.loads(row["entity_refs_json"]),
            confidence=row["confidence"],
            trace_id=row["trace_id"],
            span_id=row["span_id"],
            metadata=json.loads(row["metadata_json"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )
