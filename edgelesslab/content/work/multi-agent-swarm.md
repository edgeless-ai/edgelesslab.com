---
title: "Multi-Agent Swarm Architecture"
description: "How we built a self-coordinating AI agent swarm using Discord, Hermes, and Paperclip for continuous autonomous operation."
date: 2026-05-15
tags: ["agents", "swarm", "hermes", "paperclip", "architecture"]
---

## Overview

Edgeless Lab operates as a **multi-agent swarm** — 8+ autonomous AI agents running continuously, coordinating through Discord and Paperclip, each with distinct roles and responsibilities. No human touch required for routine execution.

## Core Architecture

```
Human (David)
    ↓ Discord mentions
Hive (Coordinator) — routes to specialists
    ↓ Structured handoffs (#bot-backroom)
[ Beau | Kilo | Scribe | Edgeless CC | Pamela | Atlas ]
    ↓ Paperclip API
Task Queue → Execution → Completion
```

## Key Components

### 1. Hermes Gateway
- One gateway per agent profile
- Runs as macOS LaunchAgent (persistent)
- Handles Discord connection + model routing
- Fireworks K2.6 + Nous qwen3.6-plus stack

### 2. Paperclip Orchestration
- Task/issues API at localhost:3100
- Agent registry with role mappings
- Automatic retry + escalation (5min cron)
- Web UI for tracking + intervention

### 3. Discord Coordination
- Structured handoff tags: `[FROM:X][TO:Y][TYPE:Z]`
- #bot-backroom exclusively for bot-to-bot
- #general for human coordination only
- Anti-loop protocol prevents circular mentions

### 4. Memory System
- ChromaDB (vector + semantic search)
- Obsidian vault (12K+ files, canonical knowledge)
- Honcho (dialectic reasoning, profile-specific)
- Session search (cross-conversation recall)

## Agent Roster

| Agent | Role | Model | Primary Channel |
|-------|------|-------|-----------------|
| Hive | Coordinator, human interface | Kimi K2.6 | #general |
| Beau | VPS planning, research, cron | Kimi K2.6 (VPS) | #bot-backroom |
| Kilo | Code execution specialist | Codex gpt-5.3 | #bot-backroom |
| Scribe | Knowledge curation | Kimi K2.6 | #bot-backroom |
| Edgeless CC | Engineering lead | Kimi K2.6 | #bot-backroom |
| Pamela | Trading, Polymarket | Codex gpt-5.3 | #polymarket |
| Atlas | Project management | Kimi K2.6 | #bot-backroom |
| Ombudsman | Compliance, audit | Kimi K2.6 | #bot-backroom |

## Coordination Patterns

### Goal Loop
Self-evaluating execution cycle: plan → act → test → review → iterate (max 5 cycles). Used for ambitious, open-ended objectives like "make edgelesslab.com one of the best sites on the internet."

### Structured Handoff
```
[FROM:Hive][TO:Kilo][TYPE:EXECUTE][TASK:EDGA-147][PRIORITY:high]
ContentView.swift implementation needed. See thread for context.
Acceptance: Compile + basic UI test. Reply with 🔥 when complete.
```

### Heartbeat + Queue
Beau runs depth-worker at 12-hour intervals:
- Read hive-queue.jsonl
- Dedupe against hive-results.jsonl  
- Claim via claims/<id>.claim (atomic)
- Post summary to #hive-depth

## Results

**Operational since:** April 2026
**Issues completed:** 200+
**Daily autonomous hours:** 18-22
**Human touch required:** <5% of workflow
**System uptime:** 95%+ (gateways need occasional restarts)

## Lessons Learned

1. **Structured tags beat @mentions** — Hermes gateway "⚡ Interrupting..." loops killed our first prototype
2. **Separate tokens per bot** — Single token shared across gateways causes "already in use" errors
3. **Memory discipline matters** — 12K vault files without taxonomy = unretrievable knowledge
4. **Recovery > Prevention** — Auto-escalation cron (EDGA-2776 pattern) catches stranded issues faster than trying to prevent all failures
5. **Skill isolation prevents drift** — 75+ skills with clear boundaries keeps each agent focused

## Future Direction

- Goal loops for company objectives (not just technical tasks)
- Cross-agent learning (shared skill improvements)
- Reduced human coordination overhead
- Autonomous overnight goal pursuit
