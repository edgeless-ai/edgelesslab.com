"""Shared memory contract for cross-runtime agent memory."""

from .adapters import build_claude_memory_search_adapter
from .config import DEFAULT_CHROMA_DB_PATH, DEFAULT_SHARED_MEMORY_DB_PATH
from .models import (
    ContextBundle,
    ContextRequest,
    MemoryPromotionRequest,
    MemoryPromotionReceipt,
    MemoryRecord,
    MemoryType,
    PromotionRunReceipt,
    PromotionStatus,
    SearchHit,
    SearchMemoryRequest,
    SearchMemoryResponse,
    SourceRuntime,
    WriteEpisodeRequest,
    WriteEpisodeReceipt,
)
from .promotion_worker import ChromaPromoter, PromotionWorker
from .service import SharedMemoryService, create_default_shared_memory_service
from .sqlite_store import SQLiteMemoryStore

__all__ = [
    "build_claude_memory_search_adapter",
    "ContextBundle",
    "ContextRequest",
    "create_default_shared_memory_service",
    "ChromaPromoter",
    "DEFAULT_CHROMA_DB_PATH",
    "DEFAULT_SHARED_MEMORY_DB_PATH",
    "MemoryPromotionRequest",
    "MemoryPromotionReceipt",
    "MemoryRecord",
    "MemoryType",
    "PromotionRunReceipt",
    "PromotionStatus",
    "PromotionWorker",
    "SearchHit",
    "SearchMemoryRequest",
    "SearchMemoryResponse",
    "SharedMemoryService",
    "SQLiteMemoryStore",
    "SourceRuntime",
    "WriteEpisodeRequest",
    "WriteEpisodeReceipt",
]
