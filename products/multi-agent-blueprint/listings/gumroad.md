# Gumroad Listing: Multi-Agent Orchestration Blueprint

## Short Description
4 orchestration patterns, 3 reference implementations, and the architecture guide for running multiple AI agents that actually coordinate.

## Full Description

### The pain
One Claude Code session is powerful. Three sessions writing to the same repo is chaos. Multi-agent orchestration sounds impressive until agents overwrite each other's work, deadlock on shared resources, or spin endlessly because nobody defined who does what. The coordination tax is real.

### The credential
This blueprint comes from running a 12-agent system that manages trading bots, content pipelines, knowledge bases, and infrastructure monitoring. The dispatch pattern alone has routed 2,000+ tasks across specialized agents over 4 months. The inbox system handles cross-agent communication for a fleet that runs 24/7.

### What's inside
- **4 orchestration patterns** — Parallel Specialists, Sequential Pipeline, Self-Organizing Swarm, Leader-Worker. Each with architecture diagrams, trade-offs, and when to use which.
- **3 reference implementations** — working TypeScript code you can run today
- **The full guide** (~7,000 words) — from "why multi-agent" through state management, error recovery, security boundaries, and production lessons
- **Configuration templates** — agent team configs, task type definitions, tool allowlists

### The 3 implementations
1. **Task Dispatcher** — routes work to specialized agents based on task type. SQLite-backed queue with lease-based claiming. Prevents double-processing.
2. **Inbox System** — file-based inter-agent messaging. Each agent has a JSON inbox. Coordinator distributes work and collects results with timeout handling.
3. **Parallel Review** — spawns 3 specialist agents (security, performance, style) to review code simultaneously. Synthesizes a combined report.

### Guide sections
- Why Multi-Agent (when single-agent breaks down)
- Architecture Patterns (4 patterns with trade-offs)
- The Message Bus (JSON inboxes, SQLite queues, event buses)
- State Management (conflict resolution, the "last write wins" trap)
- Task Decomposition (dependency graphs, the granularity sweet spot)
- Spawn Strategies (subprocesses, headless CLI, git worktree isolation)
- Error Recovery (heartbeats, stuck agent detection, poison messages)
- Security Boundaries (tool allowlists, least privilege for AI agents)
- Production Lessons (the 12-agent ceiling, cost management, monitoring)

### Who it's for
- Developers running multiple Claude Code sessions on the same project
- Teams building AI agent systems that need to coordinate
- Architects designing multi-agent infrastructure

### Who it's NOT for
- People using a single Claude Code session (you don't need orchestration yet)
- Teams looking for a hosted orchestration platform (this is self-hosted patterns)

### What you get
- 3 TypeScript implementations (dispatcher, inbox, parallel review)
- Agent configuration templates (YAML)
- Task type definitions (YAML)
- 1 comprehensive guide (PDF + Markdown, ~7,000 words)
- README with < 5 minute setup

## Price
$39

## Permalink
multi-agent-blueprint

## Category
Software & Development

## Cross-sell
- AI Agent Cookbook ($39)
- Autonomous Agent Safety Patterns ($19)
