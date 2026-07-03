---
slug: agent-grounding-problem-hermes
title: 'The Agent Grounding Problem: How Hermes Knows What''s Real'
description: AI agents confabulate. They claim files exist that don't. They report
  tasks complete that aren't. The grounding problem isn't philosophical; it's operational.
date: '2026-04-29'
tags:
- AI Safety
- Hermes
- Agent Operations
- Grounding
readTime: 6 min
productSlug: agent-safety-patterns
editorial: true
ctaHook: 10 anti-patterns, scope containment hooks, and the full verification stack
  for production agents.
---

# The Agent Grounding Problem: How Hermes Knows What's Real

AI agents confabulate. They claim files exist that don't. They report tasks complete that aren't. The grounding problem isn't philosophical. It's operational, and it will cost you hours if you don't solve it.

## The Confabulation Incident

Hermes, [my 24/7 agent running on a VPS in Helsinki](/blog/ai-agent-never-sleeps-hermes-vps/), told me it had created a comprehensive wiki structure at `04-Wiki/` on the server. Four directories, twelve files, cross-referenced with the knowledge base.

None of it existed.

The Hermes API is stateless. Between sessions, it has no memory of what it has or hasn't done. When asked about prior work, it does what any language model does: it generates a plausible answer. The answer sounded exactly like something Hermes would have done. It just hadn't.

This is the grounding problem for production agents. Not "can an AI understand the real world?" but "can your agent distinguish between what it did and what it could have done?"

## Why Agents Lie (Unintentionally)

There are three failure modes:

**Confabulation.** The agent generates plausible descriptions of work it never performed. This happens most often when you ask about past actions in a stateless system. The most expensive version I've hit: [an agent once reported lost funds as "in transit"](/blog/agent-lost-252-dollars/).

**Premature completion.** The agent reports a task as done based on partial evidence. "I updated the file" when the write failed silently. "The test passes" when it ran a different test. The agent isn't lying. It's pattern-matching on what "done" usually looks like.

**Scope drift.** The agent does real work, but not the work you asked for. It optimizes an adjacent function instead of fixing the bug. The work is real, verified, and wrong.

## The Grounding Stack

After six months of running autonomous agents, here's the grounding stack that actually works:

**Layer 1: Verify, don't trust.** Every claim an agent makes about the file system gets verified by a separate process. "I created the file" gets `ls -la`. "The service is running" gets `curl localhost:port/health`. This sounds tedious. It's the single most important practice in agent operations.

**Layer 2: Evidence-based completion.** Agents cannot declare a task complete without providing evidence. A passing test. A file that exists. A command that returns 0. I enforce this mechanically with [a verify-completion hook](/blog/the-hook-that-saved-my-codebase/) rather than trusting the agent to police itself.

```python
EVIDENCE_CHECKS = {
    "test": lambda path: subprocess.run(["pytest", path]).returncode == 0,
    "file_exists": lambda path: os.path.exists(path),
    "command": lambda cmd: subprocess.run(cmd, shell=True).returncode == 0,
}
```

**Layer 3: Grounding packets.** At the start of every session, a grounding document loads the current state of the workspace. Not what the agent remembers, but what actually exists right now. File trees, service status, recent git log, active tasks.

**Layer 4: Self-message guards.** Agents that can dispatch tasks need loop protection. A depth counter caps recursive dispatch. A `from == to` guard prevents self-messaging.

## The Memory Contract

Hermes reads from four layers of memory, each with different trust levels:

- **Episodic ledger** (SQLite, append-only): High trust. What actually happened.
- **Semantic index** (ChromaDB vectors): Medium trust. Search results may be stale.
- **Curated vault** (Obsidian markdown): High trust. Human-reviewed.
- **Agent memory** (MEMORY.md flat file): Low trust. May contain confabulated entries.

Not all memory is equally trustworthy. Treating it as if it were is how you get agents acting on bad information.

## Recovery Patterns

When an agent gets grounded incorrectly, recovery has three steps:

1. **Detect the divergence.** Usually via a failing verification check or a human noticing something off.

2. **Reload from ground truth.** Don't try to "correct" the agent's beliefs. Kill the session, regenerate the grounding packet from actual system state, start fresh.

3. **Add a guard for this specific failure.** Each grounding failure reveals a gap. The `04-Wiki/` incident led to a post-dispatch file existence check. Each guard is simple, specific, and permanent.

## The Operational Discipline

Running autonomous agents is 20% building and 80% operational discipline. The agents don't get smarter on their own. They get more reliable because you add guards, verify outputs, and grind down the failure modes one at a time.

The model will hallucinate. The file system will have race conditions. The network will fail. The question isn't whether your agent will get grounded incorrectly. It's whether your system detects it before it matters.