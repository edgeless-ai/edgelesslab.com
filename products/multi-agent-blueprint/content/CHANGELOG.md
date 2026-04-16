# Changelog

## v1.0.0 (2026-04-16)

### Added
- Full guide: "Multi-Agent Orchestration Blueprint" (~7,000 words)
- Dispatch implementation: task dispatcher with SQLite-backed queue
- Inbox implementation: file-based message passing with coordinator
- Parallel review implementation: concurrent 3-agent code review
- Agent configuration templates (YAML)
- Task type routing definitions (YAML)

### Covered Topics
- Architecture patterns (Parallel Specialists, Sequential Pipeline, Self-Organizing Swarm, Leader-Worker)
- Message bus design (file-based IPC, SQLite queues, event patterns)
- State management and conflict resolution
- Task decomposition and dependency graphs
- Spawn strategies (subprocesses, persistent workers, git worktree isolation)
- Error recovery (heartbeats, restart logic, poison messages)
- Security boundaries (tool allowlists, filesystem isolation)
- Production lessons (parallelism ceilings, cost management, observability)
