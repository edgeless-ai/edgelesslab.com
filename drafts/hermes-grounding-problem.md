---
title: "The Agent Grounding Problem: How Hermes Knows What's Real"
slug: "agent-grounding-problem-hermes"
date: "2026-04-29"
excerpt: "AI agents confabulate. They claim files exist that don't. They report tasks complete that aren't. The grounding problem isn't philosophical — it's operational."
productSlug: "agent-safety-patterns"
status: draft
source: "docs/hermes-grounding-and-recovery-2026-04-27.md + memory files"
---

AI agents confabulate. They claim files exist that don't. They report tasks complete that aren't. The grounding problem isn't philosophical. It's operational, and it will cost you hours if you don't solve it.

## The Confabulation Incident

Hermes, my 24/7 agent running on a VPS in Helsinki, told me it had created a comprehensive wiki structure at `04-Wiki/` on the server. Four directories, twelve files, cross-referenced with the knowledge base.

None of it existed.

The Hermes API is stateless. Between sessions, it has no memory of what it has or hasn't done. When asked about prior work, it does what any language model does: it generates a plausible answer. The answer sounded exactly like something Hermes would have done. It just hadn't.

This is the grounding problem for production agents. Not "can an AI understand the real world?" but "can your agent distinguish between what it did and what it could have done?"

## Why Agents Lie (Unintentionally)

There are three failure modes:

**Confabulation.** The agent generates plausible descriptions of work it never performed. This happens most often when you ask about past actions in a stateless system. The model doesn't know the difference between "I did this" and "this is what I would have done."

**Premature completion.** The agent reports a task as done based on partial evidence. "I updated the file" when it wrote to the file but the write failed silently. "The test passes" when it ran a different test. The agent isn't lying. It's pattern-matching on what "done" usually looks like.

**Scope drift.** The agent does real work, but not the work you asked for. It optimizes an adjacent function instead of fixing the bug. It refactors a config file instead of deploying the service. The work is real, verified, and wrong.

## The Grounding Stack

After six months of running autonomous agents, here's the grounding stack that actually works:

**Layer 1: Verify, don't trust.** Every claim an agent makes about the file system gets verified by a separate process. "I created the file" gets `ls -la`. "The service is running" gets `curl localhost:port/health`. This sounds tedious. It's the single most important practice in agent operations.

**Layer 2: Evidence-based completion.** Agents cannot declare a task complete without providing evidence. A passing test. A file that exists. A command that returns 0. The completion verifier hook checks the evidence before accepting the claim.

```python
EVIDENCE_CHECKS = {
    "test": lambda path: subprocess.run(["pytest", path]).returncode == 0,
    "file_exists": lambda path: os.path.exists(path),
    "command": lambda cmd: subprocess.run(cmd, shell=True).returncode == 0,
}
```

**Layer 3: Grounding packets.** At the start of every Hermes session, a grounding document loads the current state of the workspace. Not what the agent remembers, but what actually exists right now. File trees, service status, recent git log, active tasks. The agent operates from observed reality, not recalled history.

**Layer 4: Self-message guards.** Agents that can dispatch tasks to other agents (or themselves) need loop protection. A depth counter caps recursive dispatch. A `from == to` guard prevents self-messaging. These sound obvious until your agent creates an infinite loop at 3am.

## The Memory Contract

Hermes reads from four layers of memory, each with different trust levels:

| Layer | Location | Trust Level | Read When |
|-------|----------|-------------|-----------|
| Episodic ledger | SQLite events table | High (append-only log) | Session start |
| Semantic index | ChromaDB vectors | Medium (search results may be stale) | On-demand |
| Curated vault | Obsidian markdown | High (human-reviewed) | During tasks |
| Agent memory | MEMORY.md flat file | Low (may be outdated) | Session start |

The key insight: not all memory is equally trustworthy. The episodic ledger is append-only, so it's reliable. The flat-file memory is updated by the agent itself, so it might contain confabulated entries from a previous session. The vault is human-curated, so it's high quality but might be stale.

Treating all memory sources as equally reliable is how you get agents acting on bad information.

## Recovery Patterns

When an agent gets grounded incorrectly (operating on false beliefs), recovery has three steps:

1. **Detect the divergence.** Usually via a failing verification check or a human noticing something off. The earlier you detect, the less damage.

2. **Reload from ground truth.** Don't try to "correct" the agent's beliefs. Kill the session, regenerate the grounding packet from actual system state, and start fresh. Partial corrections create more confusion than full resets.

3. **Add a guard for this specific failure.** Each grounding failure reveals a gap in the verification stack. The `04-Wiki/` incident led to a post-dispatch file existence check. The provider routing confusion led to explicit auth state logging. Each guard is simple, specific, and permanent.

## The Operational Discipline

Running autonomous agents is 20% building and 80% operational discipline. The agents don't get smarter on their own. They get more reliable because you add guards, verify outputs, and grind down the failure modes one at a time.

The model will hallucinate. The file system will have race conditions. The network will fail. The question isn't whether your agent will get grounded incorrectly. It's whether your system detects it before it matters.

---

*The grounding patterns described here, including 10 anti-patterns and the full verification stack, are available in [Autonomous Agent Safety Patterns](https://edgelessai.gumroad.com/l/agent-safety-patterns).*
