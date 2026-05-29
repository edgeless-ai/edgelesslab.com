"""Pydantic models for a runtime-agnostic shared memory contract."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MemoryType(str, Enum):
    """Supported memory shapes for cross-runtime exchange."""

    EPISODE = "episode"
    FACT = "fact"
    DECISION = "decision"
    ARTIFACT = "artifact"
    PREFERENCE = "preference"


class SourceRuntime(str, Enum):
    """Known runtimes that may read/write shared memory."""

    CODEX = "codex"
    HERMES = "hermes"
    OPENCODE = "opencode"
    CLAUDE_CODE = "claude_code"
    OTHER = "other"


class SearchSource(str, Enum):
    """Backends that can contribute results to unified search."""

    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    CURATED = "curated"


class PromotionStatus(str, Enum):
    """Lifecycle state for queued semantic promotions."""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SharedMemoryModel(BaseModel):
    """Base model with strict validation."""

    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class WriteEpisodeRequest(SharedMemoryModel):
    """Append-only episodic write request."""

    agent: str = Field(min_length=1, description="Logical agent name.")
    source_runtime: SourceRuntime = Field(description="Runtime issuing the write.")
    session_id: str = Field(min_length=1, description="Session or conversation id.")
    project: str = Field(min_length=1, description="Project or workspace name.")
    memory_type: MemoryType = Field(default=MemoryType.EPISODE)
    content: str = Field(min_length=1, description="Raw memory content.")
    tags: list[str] = Field(default_factory=list)
    entity_refs: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    trace_id: str | None = Field(default=None, description="Optional OTel trace id.")
    span_id: str | None = Field(default=None, description="Optional OTel span id.")
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("agent", "session_id", "project", "content")
    @classmethod
    def strip_required_strings(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @field_validator("tags", "entity_refs")
    @classmethod
    def normalize_string_lists(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            item = value.strip().lower()
            if not item or item in seen:
                continue
            normalized.append(item)
            seen.add(item)
        return normalized


class MemoryRecord(SharedMemoryModel):
    """Normalized persisted memory record."""

    id: str
    agent: str
    source_runtime: SourceRuntime
    session_id: str
    project: str
    memory_type: MemoryType
    content: str
    tags: list[str] = Field(default_factory=list)
    entity_refs: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    trace_id: str | None = None
    span_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class WriteEpisodeReceipt(SharedMemoryModel):
    """Receipt for an episodic write."""

    status: str = "written"
    record: MemoryRecord
    storage_path: str


class MemoryPromotionRequest(SharedMemoryModel):
    """Request to promote episodic memory into a semantic store."""

    requested_by: str = Field(min_length=1)
    record_id: str | None = None
    content: str | None = None
    reason: str | None = None
    target_collection: str = "unified_knowledge"
    tags: list[str] = Field(default_factory=list)
    entity_refs: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def require_record_or_content(self) -> "MemoryPromotionRequest":
        if not self.record_id and not self.content:
            raise ValueError("either record_id or content is required")
        return self


class MemoryPromotionReceipt(SharedMemoryModel):
    """Receipt for a queued semantic promotion."""

    status: str = "queued"
    promotion_id: str
    record_id: str | None = None
    target_collection: str
    queued_at: datetime


class PromotionRunReceipt(SharedMemoryModel):
    """Summary of a promotion-worker execution pass."""

    processed: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: list[str] = Field(default_factory=list)


class SearchMemoryRequest(SharedMemoryModel):
    """Unified search request across episodic and semantic memory."""

    query: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=100)
    agent: str | None = None
    project: str | None = None
    session_id: str | None = None
    memory_types: list[MemoryType] = Field(default_factory=list)
    include_episodes: bool = True
    include_semantic: bool = True
    include_curated: bool = False

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class SearchHit(SharedMemoryModel):
    """Normalized search hit from any backend."""

    source: SearchSource
    score: float = Field(ge=0.0)
    content: str
    record_id: str | None = None
    agent: str | None = None
    project: str | None = None
    session_id: str | None = None
    memory_type: MemoryType | None = None
    created_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchMemoryResponse(SharedMemoryModel):
    """Unified search response."""

    query: str
    hits: list[SearchHit]


class ContextRequest(SharedMemoryModel):
    """Fetch recent episodic context plus related search hits."""

    agent: str | None = None
    project: str | None = None
    session_id: str | None = None
    query: str | None = None
    recent_limit: int = Field(default=8, ge=1, le=50)
    related_limit: int = Field(default=6, ge=1, le=50)


class ContextBundle(SharedMemoryModel):
    """Portable context bundle for injection into any runtime."""

    query_used: str | None = None
    recent_episodes: list[MemoryRecord] = Field(default_factory=list)
    related_memories: list[SearchHit] = Field(default_factory=list)
