# Hermes Memory Contract Reference

**Issue:** EDGA-632
**Updated:** 2026-05-28
**Purpose:** Ground Hermes agents to the shared memory contract used by `.claude/memory` and Codex memory bridges, without assuming Claude Code runtime features.

---

## What Hermes Should Read

Hermes agents should reference the **shared memory contract** at:

```
/Users/djm/claude-projects/src/kernel/shared_memory/README.md
```

### Primary Read Paths

| Layer | Location | Purpose | Read Frequency |
|-------|----------|---------|----------------|
| **Episodic Ledger** | `data/shared_memory/events.sqlite3` | Raw runtime events, decisions, observations | Every session start |
| **Semantic Index** | ChromaDB via coordinator | Reusable patterns, searchable knowledge | On-demand queries |
| **Curated Vault** | `claude-vault/` | Human-readable artifacts, procedures, runbooks | Reference during tasks |
| **Paperclip Tasks** | `http://127.0.0.1:3100/api` | Active work items, acceptance criteria | Before picking work |

### EdgelessLab Deployment Knowledge

Before any website publish, rollback, DNS diagnosis, or Pages investigation,
Hermes agents must read:

```text
/Users/djm/claude-projects/docs/runbooks/edgelesslab-github-pages-deployment.md
```

The production repository is `edgeless-ai/edgelesslab.com`. The personal fork
`thedavidmurray/edgelesslab.com` does not own the custom domain. A successful
fork deployment is not evidence that `edgelesslab.com` changed.

### Current Chroma Contract

The canonical semantic retrieval collection is `knowledge_spine`, as defined in
`config/chroma-collections.yaml`.

Legacy collections such as `youtube_transcripts`, `youtube_summaries`, and
`paperclip_issues` are preserved for compatibility. Hermes agents should not
describe `unified_knowledge` as the canonical store unless a current caller or
config file proves it is still in use.

The YouTube corpus is not hypothetical. It exists across the vault, ChromaDB
legacy collections, and the `knowledge_spine` migration path. Before proposing
new YouTube, Obsidian, Chroma, or memory architecture, agents should inspect the
current docs and query existing stores.

### Key SQLite Tables (Episodic)

```sql
-- Episodic events (append-only)
SELECT * FROM episodes
WHERE agent = 'Builder'
  AND project = 'edgeless'
ORDER BY created_at DESC
LIMIT 50;

-- Promotion queue status
SELECT * FROM promotion_queue
WHERE status IN ('queued', 'failed')
ORDER BY requested_at;
```

### Required Read Operations

1. **Session Context Loading**
   ```python
   from src.kernel.shared_memory import create_default_shared_memory_service

   service = create_default_shared_memory_service()
   context = service.get_context(
       ContextRequest(
           agent="Builder",           # Your agent identity
           project="edgeless",        # From Paperclip issue context
           session_id="sess-123",     # Unique per Hermes session
       )
   )
   ```

2. **Semantic Search**
   ```python
   results = service.search_memory(
       SearchMemoryRequest(
           query="authentication pattern",
           project="edgeless",
           limit=5,
       )
   )
   ```

---

## Where Durable Cross-Agent Memory Belongs

### 1. Episodic SQLite Ledger (Default Write Target)

**Path:** `data/shared_memory/events.sqlite3`

**What goes here:**
- Raw runtime events
- Agent decisions and reasoning
- Tool call traces
- Session boundaries
- Discoveries and observations
- Confidence scores

**Why here:**
- Append-only durability
- Fast writes
- All runtimes can read
- OTel trace correlation ready

**Example write:**
```python
from src.kernel.shared_memory import SharedMemoryService, WriteEpisodeRequest

service = SharedMemoryService.from_sqlite_path(
    "data/shared_memory/events.sqlite3"
)
receipt = service.write_episode(
    WriteEpisodeRequest(
        agent="Builder",                # Your Paperclip agent name
        source_runtime="hermes",        # Always "hermes" for Hermes agents
        session_id="sess-123",          # Unique per session
        project="edgeless",             # From Paperclip company context
        memory_type="decision",         # decision|observation|discovery|error|tool_call
        content="Selected curl over requests library for API calls",
        tags=["api", "http", "tool-selection"],
        entity_refs=["curl", "requests"],
        confidence=0.92,
        trace_id="trace-abc-123",       # From OTel context if available
        span_id="span-def-456",
        metadata={
            "issue_id": "EDGA-632",
            "tool_used": "terminal",
        }
    )
)
```

### 2. ChromaDB Semantic Index (Promotion Target)

**Access:** Via coordinator or promotion worker

**What goes here:**
- Reusable patterns (only high-confidence, reusable knowledge)
- API integration recipes
- Debugging patterns
- Security procedures
- Tool usage conventions
- Durable YouTube/RSS/memory/vault material promoted into `knowledge_spine`

**How it gets here:**
```python
# Queue for promotion (durable audit trail first)
promotion = service.promote_memory(
    MemoryPromotionRequest(
        requested_by="Builder",
        record_id=receipt.record.id,      # From write_episode receipt
        reason="API pattern is reusable across similar integrations",
    )
)

# Process promotions (idempotent worker)
run = service.process_promotions(limit=25)
```

### 3. Vault Knowledge Base (Curated Artifacts)

**Path:** `claude-vault/`

**What goes here:**
- Human-readable documentation
- KB articles from enrichment tasks
- Process runbooks
- Architecture decision records

**Written by:**
- Scribe agents (enrichment)
- Humans (curated content)
- Hermes agents (when explicitly creating documentation tasks)

### 4. Paperclip Backlog (Task State)

**Access:** Via Paperclip API

**What goes here:**
- Active work items
- Acceptance criteria
- Assignment state
- Completion status

**NOT for:**
- Raw episodic memory
- Tool traces
- Intermediate reasoning

---

## What NOT to Store

### Never Store in SQLite Episodic Ledger

| Don't Store | Where It Actually Belongs | Why |
|-------------|---------------------------|-----|
| Full tool output dumps | Terminal session logs, ephemeral | Bloated, low signal |
| Large binary data | File system with path reference | SQLite not for BLOBs |
| Secrets/API keys | `.env`, keychain, Paperclip secrets | Security |
| Raw HTML/JSON responses | Parse and store semantic extraction | Noise |
| Duplicate content | Deduplicate via content-hash | Waste |
| Temporary scratch data | `/tmp/`, don't persist | Ephemeral by design |

### Never Store in ChromaDB Semantic Index

| Don't Store | Why |
|-------------|-----|
| Single-use observations | Episodic only, not reusable |
| Low-confidence guesses | Pollutes retrieval quality |
| Task-specific state | Belongs in Paperclip issues |
| Unvalidated patterns | Validate before promotion |
| Test/debug output | Development noise |

### Never Store in Vault

| Don't Store | Why |
|-------------|-----|
| Raw tool traces | Wrong format, wrong layer |
| In-progress reasoning | Ephemeral, changes |
| Auto-generated content without review | Quality gate required |
| Large binary assets | Storage cost, wrong medium |

---

## How Hermes Should Hand Off State to Paperclip/Backlog

### State Handoff Pattern

Hermes agents operate in **ephemeral sessions**. Durable work state lives in Paperclip issues. The handoff must be explicit:

```python
# 1. Write episode (always do this)
service.write_episode(WriteEpisodeRequest(
    agent="Builder",
    source_runtime="hermes",
    session_id=current_session,
    project="edgeless",
    memory_type="decision",
    content="Implemented OAuth flow, blocked on token refresh",
    tags=["oauth", "blocked", "handoff-needed"],
    entity_refs=["EDGA-123"],
    confidence=0.85,
    metadata={
        "issue_id": "EDGA-123",
        "handoff_required": True,
        "blocker": "OAuth token refresh 401 error",
    }
))

# 2. Update Paperclip issue (the durable source of truth)
curl -s -X PATCH "http://127.0.0.1:3100/api/issues/EDGA-123" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "description": "OAuth flow implemented. BLOCKED on token refresh (401). See episode sess-123 for trace."
  }'

# 3. Post comment with handoff context
curl -s -X POST "http://127.0.0.1:3100/api/issues/EDGA-123/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "[HANDOFF] Session sess-123 completed.\n\nProgress:\n- OAuth flow implemented\n- Token acquisition working\n\nBlocker:\n- Refresh token returns 401\n- Needs credential re-auth\n\nNext agent: Run `hermes auth:refresh` before continuing."
  }'
```

### Handoff Metadata Contract

Every episode that requires handoff should include:

```yaml
metadata:
  issue_id: "EDGA-XXX"           # Required - links to Paperclip
  handoff_required: true          # Signals state transfer needed
  status: "blocked|complete|partial"  # Completion state
  blocker: "Description of blocker"   # If blocked
  next_steps: ["step1", "step2"]  # Actionable continuation
  artifacts:                      # Files/paths created
    - "path/to/file.md"
  session_id: "sess-123"          # For trace correlation
```

### Paperclip as Source of Truth

| System | Role | Durability |
|--------|------|------------|
| **Paperclip Issues** | Durable work items, acceptance criteria, assignment | Permanent |
| **SQLite Episodes** | Runtime trace, reasoning, tool calls | 90 days (configurable) |
| **ChromaDB** | Reusable semantic knowledge | Indefinite |
| **Vault** | Curated documentation | Indefinite |

### Session-to-Session Continuity

Hermes does not have native session memory like Claude Code. Use the shared contract:

```python
# At session start, load previous context
context = service.get_context(
    ContextRequest(
        agent="Builder",
        project="edgeless",
        session_id=new_session_id,  # New session
    )
)

# Search for relevant prior work
results = service.search_memory(
    SearchMemoryRequest(
        query="EDGA-632 memory contract",
        project="edgeless",
        agent="Builder",  # My own prior work
        limit=10,
    )
)
```

---

## Operational Checklist for Hermes Agents

### Before Starting Work

- [ ] Query Paperclip API for assigned issues
- [ ] Load session context from shared memory
- [ ] Search for relevant prior episodes
- [ ] Identify active blockers from metadata

### During Work

- [ ] Write episode for every significant decision
- [ ] Tag episodes with `issue_id` for traceability
- [ ] Use `memory_type` consistently (decision|observation|discovery|error|tool_call)
- [ ] Include confidence scores
- [ ] Reference entities (tools, APIs, agents)

### When Blocked

- [ ] Write episode with `handoff_required: true`
- [ ] Update Paperclip issue status
- [ ] Post detailed handoff comment
- [ ] Include next_steps and artifact paths

### When Complete

- [ ] Write completion episode
- [ ] Promote reusable patterns to ChromaDB
- [ ] Mark Paperclip issue done
- [ ] Post summary comment with key outcomes

---

## Key Differences from Claude Code

| Feature | Claude Code | Hermes |
|--------|-------------|--------|
| Memory system | Native `.claude/memory/` files | Explicit shared contract |
| Session continuity | Built-in | Load via `get_context()` |
| Memory writes | Automatic | Explicit `write_episode()` |
| Semantic search | Automatic | Explicit `search_memory()` |
| Task state | Inferred from context | Explicit Paperclip API calls |
| AGENTS.md | Auto-loaded | Not available (explicit context only) |
| Subdirectory hints | Auto-detected | Not available |

---

## References

- **Shared Memory Contract:** `/Users/djm/claude-projects/src/kernel/shared_memory/README.md`
- **Memory Coordinator:** `/Users/djm/claude-projects/.claude/memory/README.md`
- **Paperclip API:** `http://127.0.0.1:3100/api`
- **This Document:** `/Users/djm/claude-projects/docs/hermes-memory-contract.md`
