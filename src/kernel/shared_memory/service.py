"""Coordinator-friendly shared memory service."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Iterable
from uuid import uuid4

from .adapters import build_claude_memory_search_adapter
from .config import DEFAULT_SHARED_MEMORY_DB_PATH
from .models import (
    ContextBundle,
    ContextRequest,
    MemoryPromotionReceipt,
    MemoryPromotionRequest,
    PromotionRunReceipt,
    SearchHit,
    SearchMemoryRequest,
    SearchMemoryResponse,
    SearchSource,
    WriteEpisodeReceipt,
    WriteEpisodeRequest,
)
from .promotion_worker import PromotionWorker
from .sqlite_store import SQLiteMemoryStore


SemanticSearchFn = Callable[[SearchMemoryRequest], Iterable[dict[str, Any]]]
CuratedSearchFn = Callable[[SearchMemoryRequest], Iterable[dict[str, Any]]]


class SharedMemoryService:
    """Thin façade over episodic SQLite plus optional semantic/curated search."""

    def __init__(
        self,
        episode_store: SQLiteMemoryStore,
        *,
        semantic_search: SemanticSearchFn | None = None,
        curated_search: CuratedSearchFn | None = None,
    ):
        self.episode_store = episode_store
        self.semantic_search = semantic_search
        self.curated_search = curated_search

    @classmethod
    def from_sqlite_path(
        cls,
        db_path: str | Path,
        *,
        semantic_search: SemanticSearchFn | None = None,
        curated_search: CuratedSearchFn | None = None,
    ) -> "SharedMemoryService":
        return cls(
            SQLiteMemoryStore(db_path),
            semantic_search=semantic_search,
            curated_search=curated_search,
        )

    def write_episode(self, request: WriteEpisodeRequest) -> WriteEpisodeReceipt:
        record = self.episode_store.write_episode(request)
        return WriteEpisodeReceipt(
            record=record,
            storage_path=str(self.episode_store.db_path),
        )

    def promote_memory(self, request: MemoryPromotionRequest) -> MemoryPromotionReceipt:
        created_at = datetime.now(timezone.utc)
        promotion_id = str(uuid4())
        payload = self._build_promotion_payload(request)
        self.episode_store.queue_promotion(
            promotion_id=promotion_id,
            record_id=request.record_id,
            requested_by=request.requested_by,
            target_collection=request.target_collection,
            reason=request.reason,
            payload=payload,
            metadata=request.metadata,
            status="queued",
            created_at=created_at,
        )
        return MemoryPromotionReceipt(
            promotion_id=promotion_id,
            record_id=request.record_id,
            target_collection=request.target_collection,
            queued_at=created_at,
        )

    def search_memory(self, request: SearchMemoryRequest) -> SearchMemoryResponse:
        hits: list[SearchHit] = []

        if request.include_episodes:
            hits.extend(self.episode_store.search_episodes(request))

        if request.include_semantic and self.semantic_search:
            hits.extend(
                self._normalize_external_hit(raw_hit, default_source=SearchSource.SEMANTIC)
                for raw_hit in self.semantic_search(request)
            )

        if request.include_curated and self.curated_search:
            hits.extend(
                self._normalize_external_hit(raw_hit, default_source=SearchSource.CURATED)
                for raw_hit in self.curated_search(request)
            )

        hits.sort(key=lambda hit: hit.score, reverse=True)
        return SearchMemoryResponse(query=request.query, hits=hits[: request.limit])

    def get_context(self, request: ContextRequest) -> ContextBundle:
        recent = self.episode_store.recent_episodes(
            agent=request.agent,
            project=request.project,
            session_id=request.session_id,
            limit=request.recent_limit,
        )
        query = request.query
        if not query and recent:
            query = recent[0].content[:200]

        related_memories: list[SearchHit] = []
        if query:
            related_memories = self.search_memory(
                SearchMemoryRequest(
                    query=query,
                    limit=request.related_limit,
                    agent=request.agent,
                    project=request.project,
                    session_id=request.session_id,
                )
            ).hits

        return ContextBundle(
            query_used=query,
            recent_episodes=recent,
            related_memories=related_memories,
        )

    def process_promotions(self, limit: int = 10) -> PromotionRunReceipt:
        worker = PromotionWorker(self.episode_store)
        return worker.run_once(limit=limit)

    def _build_promotion_payload(self, request: MemoryPromotionRequest) -> dict[str, Any]:
        if request.record_id:
            record = self.episode_store.get_record(request.record_id)
            if not record:
                raise ValueError(f"memory record not found: {request.record_id}")
            payload = {
                "record_id": record.id,
                "agent": record.agent,
                "source_runtime": record.source_runtime,
                "session_id": record.session_id,
                "project": record.project,
                "memory_type": record.memory_type,
                "content": record.content,
                "tags": sorted(set(record.tags + request.tags)),
                "entity_refs": sorted(set(record.entity_refs + request.entity_refs)),
                "confidence": record.confidence,
                "metadata": {**record.metadata, **request.metadata},
            }
            return payload

        return {
            "content": request.content,
            "tags": request.tags,
            "entity_refs": request.entity_refs,
            "metadata": request.metadata,
        }

    @staticmethod
    def _normalize_external_hit(
        raw_hit: dict[str, Any],
        *,
        default_source: SearchSource,
    ) -> SearchHit:
        source = raw_hit.get("source", default_source)
        if source not in {item.value for item in SearchSource}:
            metadata = dict(raw_hit.get("metadata", {}))
            if raw_hit.get("source"):
                metadata.setdefault("backend_source", raw_hit["source"])
            raw_hit = {**raw_hit, "metadata": metadata}
            source = default_source
        created_at = raw_hit.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        return SearchHit(
            source=source,
            score=float(raw_hit.get("score", raw_hit.get("relevance_score", 0.0))),
            content=raw_hit.get("content", ""),
            record_id=raw_hit.get("record_id"),
            agent=raw_hit.get("agent"),
            project=raw_hit.get("project"),
            session_id=raw_hit.get("session_id"),
            memory_type=raw_hit.get("memory_type"),
            created_at=created_at,
            metadata=raw_hit.get("metadata", {}),
        )


@lru_cache(maxsize=1)
def create_default_shared_memory_service() -> SharedMemoryService:
    """Construct the default cross-runtime memory service for this repo."""

    return SharedMemoryService.from_sqlite_path(
        DEFAULT_SHARED_MEMORY_DB_PATH,
        semantic_search=build_claude_memory_search_adapter(source="chromadb"),
        curated_search=build_claude_memory_search_adapter(source="vault"),
    )
