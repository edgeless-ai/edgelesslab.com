"""Adapters from the shared memory contract into existing repo systems."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import sys
from typing import Any, Iterable

from .models import SearchMemoryRequest


@lru_cache(maxsize=1)
def _get_session_initializer():
    project_root = Path(__file__).resolve().parents[3]
    memory_root = project_root / ".claude" / "memory"
    memory_root_str = str(memory_root)
    if memory_root_str not in sys.path:
        sys.path.insert(0, memory_root_str)

    from session_initializer import SessionInitializer  # type: ignore

    initializer = SessionInitializer()
    initializer._initialize_connectors()
    initializer._load_all_memory_sources()
    initializer._initialize_coordinator()
    return initializer


def build_claude_memory_search_adapter(source: str | None = None):
    """Return an adapter that queries the existing .claude memory coordinator."""

    def search_adapter(request: SearchMemoryRequest) -> Iterable[dict[str, Any]]:
        initializer = _get_session_initializer()
        results = initializer.search_memory(request.query, source=source)
        normalized: list[dict[str, Any]] = []
        for result in results[: request.limit]:
            metadata = dict(result.get("metadata", {}))
            backend_source = result.get("source")
            if backend_source:
                metadata.setdefault("backend_source", backend_source)
            normalized.append(
                {
                    "score": result.get("relevance_score", 0.0),
                    "content": result.get("content", ""),
                    "record_id": result.get("record_id"),
                    "agent": metadata.get("agent"),
                    "project": metadata.get("project"),
                    "session_id": metadata.get("session_id"),
                    "memory_type": metadata.get("memory_type"),
                    "created_at": result.get("timestamp"),
                    "metadata": metadata,
                }
            )
        return normalized

    return search_adapter
