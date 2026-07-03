---
slug: edgeless-memory-v1-passive-recall
title: 'edgeless-memory v1.0: One Install, Three Tiers, Passive Recall'
description: Agent-agnostic persistent memory that ships as one CLI. SQLite + ChromaDB
  + Obsidian vault, 700 memories graphed, agents that recall by meaning without an
  explicit search step.
date: '2026-06-21'
tags:
- AI Agents
- Memory
- Open Source
- Infrastructure
- edgeless-memory
readTime: 7 min
productSlug: claude-memory-kit
ctaHook: 'The complete memory system for Claude Code power users: 12 templates and
  5 stack libraries built on the same three-tier design edgeless-memory ships.'
---

# edgeless-memory v1.0: One Install, Three Tiers, Passive Recall

We shipped edgeless-memory v1.0 today. It is a single-file, three-tier memory substrate that any agent, from a single assistant to a five-node swarm, can install in one shell line and start using immediately.

```bash
curl -fsSL https://raw.githubusercontent.com/edgeless-ai/edgeless-memory/main/install.sh | bash
```

That is the whole install story. The package is 595 lines of Python, no framework dependencies, no service to run, no lock-in. SQLite for hot state, ChromaDB for semantic search, an Obsidian-compatible vault for human reading. All three are initialized for you; ChromaDB pulls its embedding model on first write. One CLI exposes write, search, status, and decay.

## Why Passive Recall Matters

The default agent memory interaction is pull-based: the agent decides it needs context, calls a tool, scans results. [The one-file memory pattern this grew out of](/blog/one-file-memory-system/) works that way, and so does [file-based memory for Claude Code](/blog/how-claude-code-memory-works/). Pull works, but it costs a turn, and it fails when the agent does not know to ask. Certain classes of memory (the user prefers direct informal tone, the team rejected this exact approach three weeks ago, this file path is canonical) are load-bearing for any reasonable answer but invisible to an agent that has no reason to query.

edgeless-memory v1.0 ships a passive recall hook. The agent tags an event with the type of memory it expects to find (the install prints the recommended tag set), and on the next session start the relevant memories are surfaced automatically as prepended context. The agent does not search. The search already happened. The cost is amortized across the whole swarm, not paid per turn by the model.

## What Actually Ships

The core is 424 lines: a SQLite schema for memories with importance and last-accessed timestamps, a ChromaDB collection for semantic similarity, and a vault directory that mirrors the hot store as Markdown with frontmatter so a human can browse and edit by hand. It is [the SQLite + ChromaDB + vault stack](/blog/building-ai-agent-infrastructure-solo/) our own infrastructure runs on, distilled. A separate 87-line file, `sia_loop.py`, is the self-improving review loop: propose the highest-value gap from memory, record a generation's outcome, review generations, flag regressions.

- **Hot tier:** SQLite, sub-millisecond read/write, ranked by importance and recency.
- **Warm tier:** ChromaDB, semantic cosine similarity, embedding model lazy-loaded.
- **Cold tier:** Obsidian-compatible Markdown vault, graph-aware tag inference, human-editable.
- **Decay:** importance and last-accessed both decay; `EDGELESS_MEMORY_DECAY` is now configurable.
- **Telemetry:** off by default. There is no phoning home.

The optional Hermes adapter (just 84 lines) registers every profile in a multi-agent swarm into the same shared memory with `EDGELESS_MEMORY_AGENT=<profile>` and `EDGELESS_MEMORY_DB` stamped into each profile's `.env`. Generic users never touch it.

## The 700-Memory Graph

The repo ships a pre-loaded demo vault: 700 memories tessellated across trading rules, infrastructure incidents, user preferences, project notes, and agent-private workspace state. After install, `edgeless-memory status` prints the live graph: node count, edges, decay distribution, and the top ten most-importance memories right now.

The point is not the number. The point is that the demo proves recall works on a corpus that is already past the toy threshold. If your agent is going to live in a memory substrate for months, you should be able to see what 700 entries looks like before you commit. And if you want to see what happens to a memory corpus when nobody circulates it, read [our knowledge-base circulation audit](/blog/kb-audit-circulation/).

## What Did Not Ship

We rejected three things during review and we are noting them here so the trade-offs are explicit:

- **A web dashboard.** Memory is for agents. Humans can read it in Obsidian. The vault tier exists for that exact reason.
- **Auto-tagging by LLM.** Tags are derived from graph structure and document type, with a deterministic inference rule. It is testable, fast, and not a function of which model happens to be loaded.
- **Cloud sync.** Memory is local by default. Sync is a feature flag, opt-in per agent, off in v1. The decay and importance model do not handle cross-device ranks well yet.

## How to Try It

The install is one line and reversible. The CLI is the entire API surface: `write`, `search`, `status`, `decay`. If you are running a Hermes swarm, run the adapter after install:

```
python3 adapters/hermes.py sync     # mark every profile into shared memory
python3 adapters/hermes.py count    # how many profiles registered
```

Pre-release review caught the four issues that mattered: honesty about decay, an agent filter for per-profile isolation, telemetry confirmed off, and packaging + tests clean. v1.0 is the first tag we are willing to ship as production.

The repo is at [github.com/edgeless-ai/edgeless-memory](https://github.com/edgeless-ai/edgeless-memory). The demo GIF shows the full install + a 700-node vault graph rendered live.

Memory is not a feature. It is the substrate an agent lives on. v1.0 is out.