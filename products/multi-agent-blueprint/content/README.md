# Multi-Agent Orchestration Blueprint

A practical guide to building multi-agent systems with Claude Code. Includes 3 working implementations, configuration templates, and 7,000 words of engineering lessons from production deployments.

## What's Inside

```
guide.md                          # The full guide (~7,000 words)
implementations/
  dispatch/                       # Task dispatcher with SQLite queue
    dispatcher.ts                 # Routes work to specialist agents
    task-queue.ts                 # SQLite-backed queue with lease claiming
    types.ts                      # Shared TypeScript types
  inbox/                          # File-based message passing
    inbox.ts                      # JSON inbox read/write operations
    coordinator.ts                # Work distribution + timeout handling
  parallel-review/                # Concurrent code review
    review.ts                     # Spawns 3 reviewers, synthesizes results
    agents.ts                     # Agent definitions (security, perf, style)
config/
  agent-config-example.yaml       # 5-agent team configuration
  task-types-example.yaml         # Task-to-agent routing rules
```

## Prerequisites

- **Node.js 20+** or **Bun 1.0+**
- **Claude Code** installed and authenticated (`claude` CLI available)
- **SQLite** (ships with Node.js 22+ via `node:sqlite`, or use `better-sqlite3`)
- Basic familiarity with TypeScript and subprocess management

## Quick Start

### 1. Install dependencies

```bash
npm install better-sqlite3
# or if using Bun:
bun add better-sqlite3
```

### 2. Run the dispatch example

```bash
cd implementations/dispatch
npx tsx dispatcher.ts
```

### 3. Run the parallel review example

```bash
cd implementations/parallel-review
npx tsx review.ts path/to/file.ts
```

### 4. Run the inbox example

```bash
cd implementations/inbox
npx tsx coordinator.ts
```

## Adapting to Your Stack

The implementations use `child_process.spawn` to launch Claude Code agents. If you prefer a different runtime:

- **Bun**: Replace `child_process` with `Bun.spawn`. Everything else works as-is.
- **Python**: The patterns translate directly. Replace SQLite calls with `sqlite3` stdlib. Replace subprocess spawning with `asyncio.create_subprocess_exec`.
- **Docker**: Each agent can run in its own container. Mount a shared volume for the inbox directory or use the SQLite queue over a network volume.

## Key Concepts

**Agents are subprocesses.** Each agent is a separate Claude Code process with its own context window, tool permissions, and system prompt. They communicate through files or a shared database, not through shared memory.

**The queue is the coordination layer.** Whether you use SQLite (dispatch pattern) or JSON files (inbox pattern), the message store is what prevents race conditions, enables retry logic, and makes the system observable.

**Tool allowlists are security boundaries.** Every agent gets the minimum set of tools it needs. A code reviewer should not have write access to the filesystem. A researcher should not be able to execute shell commands.

## License

Commercial license. One copy per purchaser. Do not redistribute.
