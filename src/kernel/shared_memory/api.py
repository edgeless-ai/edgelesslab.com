"""Small FastAPI surface for the shared memory contract."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI

from .config import DEFAULT_SHARED_MEMORY_DB_PATH
from .models import (
    ContextBundle,
    ContextRequest,
    MemoryPromotionReceipt,
    MemoryPromotionRequest,
    PromotionRunReceipt,
    SearchMemoryRequest,
    SearchMemoryResponse,
    WriteEpisodeReceipt,
    WriteEpisodeRequest,
)
from .service import create_default_shared_memory_service


app = FastAPI(
    title="Shared Memory API",
    description="Cross-runtime shared memory surface for Codex, Hermes, and OpenCode.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "shared-memory",
        "db_path": str(DEFAULT_SHARED_MEMORY_DB_PATH),
    }


@app.post("/episodes", response_model=WriteEpisodeReceipt)
def write_episode(request: WriteEpisodeRequest) -> WriteEpisodeReceipt:
    return create_default_shared_memory_service().write_episode(request)


@app.post("/promotions", response_model=MemoryPromotionReceipt)
def promote_memory(request: MemoryPromotionRequest) -> MemoryPromotionReceipt:
    return create_default_shared_memory_service().promote_memory(request)


@app.post("/search", response_model=SearchMemoryResponse)
def search_memory(request: SearchMemoryRequest) -> SearchMemoryResponse:
    return create_default_shared_memory_service().search_memory(request)


@app.post("/context", response_model=ContextBundle)
def get_context(request: ContextRequest) -> ContextBundle:
    return create_default_shared_memory_service().get_context(request)


@app.post("/promotions/process", response_model=PromotionRunReceipt)
def process_promotions(limit: int = 10) -> PromotionRunReceipt:
    return create_default_shared_memory_service().process_promotions(limit=limit)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8042)
