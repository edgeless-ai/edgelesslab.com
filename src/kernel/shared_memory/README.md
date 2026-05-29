# Shared Memory Contract

This module defines the runtime-agnostic memory contract for `codex`, `hermes`, and `opencode`.

## Why This Exists

The repo already has a strong memory substrate under `.claude/memory`, but that system is still oriented around Claude Code session restoration. Cross-runtime memory needs a contract that is:

- typed
- append-first
- easy to inspect and debug
- independent of any one chat client

This module keeps the current architecture, then adds a clean portability layer on top:

- `SQLite` for append-only episodic durability
- `ChromaDB` for semantic retrieval
- `Vault` for curated long-form knowledge
- `SharedMemoryService` as the cross-runtime façade
- `api.py` as the small local HTTP surface
- `promotion_worker.py` as the semantic promotion executor

## Canonical DB Path

The default episodic ledger path is:

`/Users/djm/claude-projects/data/shared_memory/events.sqlite3`

Callers can still construct a service with a different path, but the repo default should converge here so all runtimes share the same append-only ledger.

## Canonical Model

Every memory write should carry:

- `agent`
- `source_runtime`
- `session_id`
- `project`
- `memory_type`
- `content`
- `tags`
- `entity_refs`
- `confidence`
- `trace_id`
- `span_id`
- `metadata`

The `trace_id` and `span_id` fields are there so OpenTelemetry can follow memory writes across agents later.

## Minimal API Surface

This module intentionally starts with four operations:

1. `write_episode`
2. `promote_memory`
3. `search_memory`
4. `get_context`
5. `process_promotions`

### `write_episode`

Use for raw append-only runtime events, discoveries, decisions, and observations.

```python
from src.kernel.shared_memory import SharedMemoryService, WriteEpisodeRequest

service = SharedMemoryService.from_sqlite_path("data/shared_memory/events.sqlite3")
receipt = service.write_episode(
    WriteEpisodeRequest(
        agent="Hermes",
        source_runtime="hermes",
        session_id="sess-123",
        project="edgeless",
        memory_type="decision",
        content="Selected Gemini for broad recall, Codex for code changes.",
        tags=["routing", "models"],
        entity_refs=["gemini", "codex"],
        confidence=0.88,
    )
)
```

### `promote_memory`

Use to queue a durable semantic promotion into ChromaDB. This module queues the promotion in SQLite first so the system has a durable audit trail before semantic indexing happens.

```python
promotion = service.promote_memory(
    MemoryPromotionRequest(
        requested_by="Hive",
        record_id=receipt.record.id,
        reason="Routing decision should be reusable in future sessions.",
    )
)
```

### `process_promotions`

Use to drain queued promotions into ChromaDB. The worker:

- claims queued or failed promotions
- uses deterministic content-hash ids for dedupe
- marks jobs `completed` or `failed`
- stores backend result metadata in the queue table

```python
run = service.process_promotions(limit=25)
print(run.model_dump())
```

### `search_memory`

Use for unified retrieval across:

- episodic SQLite memory
- semantic ChromaDB search
- curated Vault search

The service supports episodic search immediately. Semantic and curated search are injected as callables so Hermes or a thin API server can bind the existing `.claude/memory/memory_coordinator.py` without rewriting it.

```python
results = service.search_memory(
    SearchMemoryRequest(
        query="routing decision gemini codex",
        project="edgeless",
        limit=5,
    )
)
```

### `get_context`

Use when a runtime needs a portable context bundle before acting. This returns:

- recent episodes
- related retrieved memories
- the query actually used

```python
context = service.get_context(
    ContextRequest(
        agent="Hermes",
        project="edgeless",
        session_id="sess-123",
    )
)
```

## Integration With Existing Memory Coordinator

The existing coordinator in `.claude/memory/memory_coordinator.py` should remain the semantic orchestrator. The shared service should call into it through a small adapter, not replace it.

Recommended binding:

```python
from src.kernel.shared_memory import SharedMemoryService

def semantic_search_adapter(request):
    return coordinator.search(
        request.query,
        limit=request.limit,
    )

service = SharedMemoryService.from_sqlite_path(
    "data/shared_memory/events.sqlite3",
    semantic_search=semantic_search_adapter,
)
```

The repo now also includes a ready-made adapter:

```python
from src.kernel.shared_memory import create_default_shared_memory_service

service = create_default_shared_memory_service()
```

That default service uses:

- SQLite at `data/shared_memory/events.sqlite3`
- `.claude/memory` coordinator search for `chromadb`
- `.claude/memory` coordinator search for `vault`

## Operational Rules

- Do not use Claude Code native memory files as the sole system of record.
- Do use SQLite as the universal append-only ledger.
- Do promote only reusable information into ChromaDB.
- Do keep Vault for curated human-readable artifacts and procedures.
- Do tag writes with `agent`, `source_runtime`, and `project`.
- Do attach `trace_id` and `span_id` when OTel is active.

## Recommendation

Use this contract as the shared memory bus.

- `Codex` can use the Python module directly.
- `Hermes` can use the same module or wrap it behind a local HTTP endpoint.
- `OpenCode` should hit the same typed contract rather than inventing its own memory shape.

That keeps memory shared without coupling the whole company to one runtime.

## HTTP Usage

For Hermes or OpenCode, run:

```bash
.venv/bin/python -m src.kernel.shared_memory.api
```

Then call:

- `POST /episodes`
- `POST /promotions`
- `POST /promotions/process`
- `POST /search`
- `POST /context`
- `GET /health`

## Retrieval Notes

The SQLite episodic store now uses `FTS5` for local retrieval and falls back to `LIKE` if the host SQLite build does not support FTS. Ranking combines:

- text relevance
- recency
- confidence
- exact project/agent/session matches
- query-term overlap across content, tags, and entity refs
