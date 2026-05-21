---
title: "Case Study: Paperclip AI Platform"
date: 2026-05-15T09:00:00-07:00
description: "How Edgeless Lab built a 3-AI-agent orchestration system for $12/week — complete architecture, config, scripts, and video walkthrough."
author: "Edgeless Lab"
tags: ["multi-agent", "orchestration", "paperclip", "hermes", "platform"]
image: "/og/default.webp"
draft: false
---

**Case Study #1** | Project: Paperclip AI | Web Dev: Jacob — March 2026

---

## Problem

Solo developers who want AI agents to work *for* them end up with a stack of disconnected tools — Discord bots, cron jobs, local LLMs, GitHub repos — with no unified control plane. Every new agent costs time: new tokens, new routing, new monitoring, new failure modes.

Edgeless Lab's clients needed to know: *can we run a production-grade AI ops team at solo-founder prices, without DevOps overhead?*

---

## What We Built: Paperclip OS

**Paperclip AI** is a complete multi-agent orchestration system designed for single developers running 3–5 autonomous agents. The system cost: ~$12/week in API calls ($49 commercial product, self-hosted version $0 once configured).

### Core Architecture

```
Hive (Coordinator)  ────────  Hermes Gateway
        │                          │
   [ARCH] tags                  Discord
        │                    + Cron bridge
        ▼
Edgeless CC (COO) ──[ARCH]──► Kilo (Code Execution)
        │
   [TYPE:EXECUTE]
        │
        ▼
Beau / Scribe / Pamela (workers)
```

- **Hive** ingests work, triages, assigns tags
- **Edgeless CC** plans architecture, decomposes tasks
- **Kilo** executes code (codex CLI, aggressive shipping)
- **Beau** runs cron-based research + site health (VPS/Kimi)
- **Scribe** curates knowledge, enriches KB articles
- **Pamela** running a trading loop on Hetzner VPS

### Anti-Loop Coordination

The system prevents circular bot-to-bot pings with a structured tag protocol:

```
[FROM:Hive][TO:Kilo][TYPE:EXECUTE][TASK:EDGA-147][PRIORITY:high]
ContentView.swift implementation needed. Thread 14985xxxx for context.
Acceptance: Compile + basic UI test. Reply with 🔥 when complete.
```

No `@mentions` in bot channels — structured tags only. Hermes gateway detects `@Hive` pings and generates "⚡ Interrupting..." which causes loops. Tags fix the problem.

---

## The Product: What Clients Get

### Paperclip OS — $49 digital product

```
paperclip-os/
├── PROTOCOL.md              # Full agent communication spec
├── architecture/            # system-diagram.excalidraw + data-flow.png
├── config/                  # hermes.env.template, mastra.config.yaml, crontabs
├── scripts/                 # install-hermes.sh, inbox-watcher.py, cost-tracker.py
├── skills/                  # dispatch-skill.md, mcp-servers.yaml, model-router.sh
└── monitoring/              # health-check.sh, session-monitor.py, cost-tracker.py
```

### KB Loop Kit — $29 add-on

NotebookLM-based knowledge base loop: ChromaDB → topic clustering → NotebookLM upload → manifest tracking. Tested to 21.2% enrichment on 1,172 YouTube notes in one session.

### Hermes Deployment Guide — $29 add-on

```
hermes-deployment-guide/
├── VPS setup (Hetzner)
├── Discord gateway config (DISCORD_ALLOW_BOTS=mentions)
├── Cron health patterns (staggering, backpressure)
├── Memory tier selection (honcho/proximate)
└── Security hardening (redact_secrets, SSH key rotation)
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Control plane** | Paperclip AI (localhost:3100) | Issue/task MCP, audit log, event sourcing |
| **Gateway** | Hermes (Kimi K2.6 via Fireworks) | Long context + codegen, per-agent profiles |
| **Router** | Structured tags vs @mentions | Prevents circular "⚡ Interrupting" loops |
| **Worker models** | Mix: K2.6 (coordination) + gpt-5.3-codex (execution) | Balance reasoning vs code quality |
| **VPS** | Hetzner 89.167.52.198 | Pamela trading bot + Beau cron health |
| **ChromaDB** | localhost:8100 (IPv6-bound) | Knowledge store, 6,300+ docs |
| **Memory** | Honcho + Obsidian vault | 3-layer: vector + backup + editorial |

---

## Measurable Outcomes

| Metric | Result |
|---|---|
| Agents running | 8 (Hive, Beau, Kilo, Scribe, Edgeless CC, Pamela, Atlas, Ombudsman) |
| API cost/month | ~$36 ($12/week at production scale) |
| Lighthouse score (edgelesslab.com) | 96–100 across all four metrics |
| YouTube enrichment baseline | 0% → 21.2% in one multi-agent session |
| KB articles created (Scribe) | 10 articles, avg 13.4 score, ~117KB knowledge added |
| Discord sync issue | ✓ Anti-loop protocol deployed 2026-04-27 |
| VPS crash recovery | ✓ Paperclip auto-escalation cron every 5 min |

---

## What Clients Say / Packaged For

- Solo developer wanting autonomous agent stack for "12/week"
- Indie hacker looking for production-grade orchestration patterns
- Teams needing multi-agent routing without dedicated DevOps
- AI ops team: Loic Berthelot's "The Agentic OS" Notion playbook competitor

---

## Changelog

- 2026-05-15: Griffin Heritage (cé·ram·ic·gy) — Photography brief
- 2026-05-14: Added paperclip-os/lean-research/PROTOCOL.md snippet
- 2026-05-14: Updated paperclip-os/lean-research/experiment.md
