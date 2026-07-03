---
slug: 12-dollar-ai-operations-team
title: I Run a $12/Week AI Operations Team. This is the Cost Breakdown.
description: Enterprise AI ops costs $50K+/month. I run 5 agents, 24/7, for $12/week.
  The architecture, the model routing, and why cheap doesn't mean fragile.
date: '2026-04-19'
tags:
- Multi-Agent
- AI Infrastructure
- Cost Optimization
- Claude Code
readTime: 8 min
productSlug: multi-agent-blueprint
isLaunch: true
editorial: true
ctaHook: 'The complete Paperclip OS blueprint: configs, routing logic, and the cost
  calculator behind this post.'
---

# I Run a $12/Week AI Operations Team. This is the Cost Breakdown.

Enterprise AI operations run $50,000 per month for a modest setup. The bill breaks down predictably: API calls at scale, managed vector databases, orchestration platforms with per-seat pricing, and the human team to manage the agents that are supposed to reduce labor.

I run five AI agents 24/7 for $12 per week. They handle code review, research synthesis, content triage, knowledge base maintenance, and production monitoring. The architecture isn't a demo. It's been running for three months, survived a corrupted session recovery, and processed 8,000+ tasks without a manual restart.

This is the complete cost breakdown and the specific technical decisions that make cheap infrastructure reliable.

## The Weekly Cost Stack

:::metric
$12 | Weekly total
5 | Active agents
8,000+ | Tasks processed
$0 | Orchestration cost
:::

:::bar-chart Weekly Cost Breakdown
Agent inference | $4.20
ChromaDB storage | $2.80
KB synthesis | $3.50
Dev/test cycles | $1.50
Orchestration | $0.00
File sync | $0.00
Telegram | $0.00
:::

The $50K enterprise equivalent runs managed vector DB (Pinecone Pro: $2,400/mo), orchestration platform (LangSmith Teams: $1,500/mo), API costs at volume (OpenAI Enterprise: ~$3,000/mo), and the engineering time to wire it together (0.5 FTE: $8,000/mo). I've written separately about [what production agents cost at enterprise scale](/blog/real-cost-ai-agents-production-2026/) if you want that side of the ledger.

The difference isn't provider choice. It's architecture decisions that eliminate managed-service dependencies.

## The Agent Topology

Five agents run in [the dispatch/worker topology](/blog/agents-that-talk-to-each-other/) I've written about before. This isn't decorative. It's the simplest structure that solves the actual production problems.

:::flow Agent Topology
Human -> Hermes (CoS) -> Dispatch (COO) -> Builder
Dispatch (COO) -> Researcher
Dispatch (COO) -> Verifier
:::

**Hermes (Chief of Staff)**: My primary session agent. Receives all human requests, decides whether to execute directly or delegate. Runs on Kimi K2.5 via Fireworks. [Hermes runs 24/7 on a $5 VPS](/blog/ai-agent-never-sleeps-hermes-vps/), so it's always reachable. Context window management is the constraint: it sees the full project state and delegates to specialists when the task requires specific tools or extended processing.

**Dispatch (COO)**: A Paperclip-managed agent that never executes tasks directly. Its only job is routing: receive task requests from Hermes, assign to appropriate workers, track state machine transitions, escalate stuck tasks. It runs on a lighter model (DeepSeek V3.2) because its cognitive load is lower, it's matching patterns, not reasoning about code.

**Builder**: Claude Code agent on a VPS. Handles all code changes: feature implementation, bug fixes, refactoring. Runs on Anthropic Claude via standard API. The VPS isolates it from my local machine state, which means it can run overnight without my laptop being open.

**Researcher**: Deep research agent. Consumes RSS feeds, YouTube transcripts, arXiv papers, synthesizes findings into structured reports. Runs Kimi K2.5 with extended context. Its output feeds directly into the knowledge base.

**Verifier**: Quality control agent. Reviews Builder's output, runs tests, checks for security issues, validates against acceptance criteria. Acts as a gate before deployment.

The topology solves three specific failure modes I've hit with single-agent approaches:

1. **Context pollution**: When a single agent switches between coding and research, it drops relevant context from the earlier task. Specialists keep their context focused.

2. **Tool confusion**: Agents with 20+ tools start calling the wrong ones. Specialists have 4-6 tools each. The tool selection accuracy is visibly higher.

3. **State loss on crash**: A single long-running session that crashes loses everything. Distributed state means any single agent can restart without losing the system's progress.

## Model Routing: Four Different Brains

The routing isn't random. Each model has a specific operational profile:

:::bar-chart Weekly Task Volume by Model
DeepSeek V3.2 | 340 tasks
Kimi K2.5 | 180 tasks
Codex (GPT-5.4) | 40 tasks
Claude Opus 4 | 25 tasks
:::

:::bar-chart Cost per Million Tokens (Output)
Claude Opus 4 | $75.00
Codex (GPT-5.4) | $12.00
Kimi K2.5 | $2.00
DeepSeek V3.2 | $1.10
:::

Kimi K2.5 handles 70% of tasks because it's the cheapest generalist that doesn't hallucinate tools. DeepSeek takes the high-volume, low-cognitive-load work (formatting, simple transformations, status checks). Claude Opus is reserved for security-sensitive reviews; it's expensive but catches issues the cheaper models miss. Codex handles bulk code generation where context length matters more than nuance.

The routing decision happens at the dispatch layer. Tasks include a complexity tag (low/medium/high) and a security flag. Low complexity + no security flag → DeepSeek. High complexity or security flag → Kimi or Opus depending on domain.

This routing alone cuts costs 10x versus using a single model for everything.

## The Knowledge Base Loop

Every agent operation feeds a knowledge base. Not as an afterthought, as a core system function.

:::flow Knowledge Base Loop
Capture -> Synthesize -> Verify -> Inject -> Agents -> Capture
:::

The loop works like this:

1. **Capture**: All agent outputs, research findings, error logs, and human corrections write to ChromaDB with embeddings.

2. **Synthesize**: A nightly batch job (separate agent) queries for related documents, detects themes, and writes synthesized summaries.

3. **Verify**: Another agent samples the synthesized notes, checks for factual drift or contradictions, flags issues.

4. **Inject**: The verified synthesis becomes retrievable context for all agents.

The loop means agents have more than tools: they have memory of what the system has learned. When Builder encounters an error, it can query: "how did we solve similar errors before?" The answer comes from actual previous sessions, not generic training data.

The KB infrastructure costs $2.80/week (self-hosted ChromaDB on a €6.50 Hetzner instance). The managed equivalent (Pinecone, Weaviate Cloud) runs $200-400/month.

## File-Based Agent Communication

The agents communicate through two channels:

**Agent Bus**: Real-time MCP connection on port 9800. Handles urgent coordination: task assignment, status updates, human escalation. Messages route through a local daemon that queues for offline agents.

**Async Inboxes**: File-based system synced via rsync every 60 seconds. Each agent has an inbox directory. Dispatch writes task files, workers read and write results. The filesystem is the message queue.

Why files instead of a proper message queue (RabbitMQ, Redis)?

1. **Observability**: I can `cat /inbox/builder/task-4821.json` and see exactly what was sent.

2. **Recovery**: If a task fails, the file is right there with full context. No log archaeology.

3. **Zero ops**: No database to manage, no connection pools, no retry logic. The filesystem has been reliable for 50 years.

The latency is higher (60s sync cycle) but the reliability is perfect. For tasks that need real-time, the Agent Bus handles it. Most tasks are fine with 60s latency.

## The Failure Modes

Cheap infrastructure has specific failure modes. I've hit them, including [agents that die silently](/blog/self-healing-ai-infrastructure/) and stay dead until something notices.

**Session poisoning**: An agent corrupted its own skill definitions through repeated partial updates. The corruption spread to other agents that read the shared skill file. Detection took 6 hours. Recovery required restoring from backup and adding versioned skill files.

The fix: skill files now include a checksum. Agents verify before loading. Corrupted skills fail closed (agent stops) rather than open (agent runs with bad definitions).

**Model degradation**: Kimi K2.5 had a quality regression on one Fireworks deployment. The routing layer detected elevated error rates and automatically shifted load to the backup deployment. Total impact: 4 minutes of degraded service.

The fix: health checks on model endpoints, automatic failover, circuit breaker pattern for failing providers.

**Resource exhaustion**: ChromaDB hit its memory limit during a large embedding batch. The indexer kept retrying, filling logs, failing silently. The KB synthesizer agent detected the backlog growth and alerted before the disk filled.

The fix: resource-aware batch sizing, explicit memory limits, and monitoring on queue depth, not only error rates.

## What This Architecture Can't Do

Honest limitations:

- **No high-availability guarantee**: Single VPS, single Mac. If Hetzner has an outage, the remote agents stop. Recovery is manual.
- **No multi-region redundancy**: 60s rsync is fine for async tasks, but real-time coordination can't survive a network partition.
- **No formal verification**: The state machine is tested, not proven. Edge cases exist.
- **No enterprise compliance**: No SOC 2, no audit logs for regulators. This is a solo operation.

The architecture optimizes for "good enough for one person" not "good enough for 1,000 customers."

## Getting Started

You don't need five agents on day one. Start with two: one primary, one specialist for your most common task type. Add the dispatch layer when you're tired of manually routing tasks. Add workers when you hit the cognitive limits of your existing agents.

The infrastructure I described, the model routing, the KB loop, the file-based communication, ships as the Paperclip OS. It's the blueprint, the config files, the monitoring setup, and the failure patterns I documented so you don't have to discover them.

The [Paperclip OS](/products) is $49. That pays for itself the first time it prevents a corrupted session or routes a task to the cheapest model that can handle it.

The $12/week isn't the point. The point is that cheap infrastructure can be reliable if you design for the actual failure modes instead of the theoretical ones.