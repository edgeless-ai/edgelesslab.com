---
created: 2026-03-10
updated: 2026-03-11
status: done
completed: 2026-03-21
completion_note: Hermes deployed and running on VPS with 85 tools, 8 cron jobs
priority: P1
epic: 1-kernel
effort: L
depends_on: []
blocks: [task-149, task-162]
tags: [agent-framework, nous-research, hermes, mcp, evaluation, open-source, vps, telegram, trading]
---

# Task 171: Deploy Hermes Agent on VPS as Persistent Trading & Automation Hub

## Context

User emailed (Mar 1, forwarded again Mar 6) requesting backlog task after seeing Hermes Agent announcement. Hermes Agent is an open-source (MIT), self-improving AI agent framework by Nous Research, launched Feb 2026. Powered by Hermes-3 (Llama 3.1 base), trained with Atropos RL for tool-calling and long-range planning.

**2026-03-11 UPDATE**: Bumped to P1. Goal expanded from "evaluate" to "deploy on Hetzner VPS and link to new Telegram bot". Hermes Agent becomes the persistent autonomous agent running all VPS-side operations including trading bots, whale tracking, cron jobs, and making money.

## Why It Matters

Hermes Agent solves several problems in our backlog:
- **Persistent scheduling** (task-149) — has native cron with natural language scheduling
- **VPS agent persistence** (task-162) — designed for server deployment with 6 execution backends
- **Multi-platform messaging** — single gateway for Telegram, Discord, Slack, WhatsApp
- **MCP compatibility** — native MCP server integration, cleanest bridge to Claude Code
- **Revenue generation** — run Pamela (Polymarket), Toast (DeFi), whale tracker, and future trading strategies autonomously 24/7

## Key Capabilities

1. **Persistent Multi-Level Memory** — FTS5 cross-session recall + LLM summarization (more mature than our 4-connector system)
2. **Self-Improving Skill System** — writes "Skill Documents" as procedural memory (similar to our `.claude/skills/`)
3. **6 Execution Backends** — Local, Docker, SSH, Daytona, Singularity (HPC), Modal (serverless)
4. **Subagent Spawning** — isolated subagents for parallel workstreams
5. **40+ Built-in Tools** — web search, browser automation, vision, image gen, TTS, code execution

## Deployment Plan (Hetzner VPS)

### Phase 1: Install & Configure
- Install Hermes Agent on Hetzner VPS (89.167.52.198) via Docker or native
- Create NEW Telegram bot for Hermes (separate from @mobeau_bot used by Claude Code)
- Configure Telegram gateway as primary control interface
- Set up MCP bridge to allow Claude Code to delegate tasks to Hermes

### Phase 2: Integrate Trading Bots
- Connect Hermes to Pamela (Polymarket) — run as managed subprocess or MCP tool
- Connect Hermes to Toast (DeFi) — future integration
- Deploy whale tracker (scripts/polymarket-whale-tracker.py) as Hermes cron job (daily)
- Set up revenue tracking and daily P&L Telegram reports

### Phase 3: Autonomous Operations
- Migrate VPS cron jobs to Hermes native scheduler (natural language)
- Enable self-improving skills for trading pattern learning
- Set up monitoring/alerting via Telegram for all VPS operations
- Use Hermes (free Llama 3.1) for cost-free routine tasks, Claude for high-reasoning

## Integration Paths

| Path | Description | Effort | Priority |
|------|-------------|--------|----------|
| VPS deployment | Install Hermes on Hetzner, Docker or native | Medium | P0 |
| Telegram bot | New bot linked to Hermes for VPS control | Low | P0 |
| Pamela integration | Hermes manages Pamela process + cron | Medium | P1 |
| Whale tracker cron | Daily refresh via Hermes scheduler | Low | P1 |
| MCP bridge | Hermes exposes tools as MCP server for Claude Code | Medium | P1 |
| Memory patterns | Evaluate FTS5 + summarization vs ChromaDB + Serena | Medium | P2 |
| Skill doc format | Compare their skill format vs our `.claude/skills/` | Low | P2 |

## Acceptance Criteria

- [ ] Hermes Agent running on Hetzner VPS (Docker or native)
- [ ] New Telegram bot created and connected to Hermes
- [ ] Can send commands to Hermes via Telegram and get responses
- [ ] Hermes manages Pamela bot (start/stop/restart/status via Telegram)
- [ ] Whale tracker runs as Hermes cron job (daily refresh)
- [ ] MCP bridge tested — Claude Code can delegate tasks to Hermes
- [ ] Daily P&L summary sent via Telegram automatically
- [ ] Compare skill document format vs our skill system
- [ ] Evaluate persistent memory approach vs our 4-connector system
- [ ] Document integration patterns and create follow-up tasks

## Resources

- Site: https://hermes-agent.nousresearch.com/
- Docs: https://hermes-agent.nousresearch.com/docs/
- GitHub: https://github.com/nousresearch
- License: MIT (no vendor lock-in)
- VPS: Hetzner 89.167.52.198 (ssh: hetzner-VPS)

## Source

User email to djm.claude.assistant@gmail.com (2026-03-01, forwarded 2026-03-06)
X/Twitter link: https://x.com/KSimback/status/2028212426563330392
Telegram request: 2026-03-11 — bump to P1, deploy on VPS, link to Telegram, run trading bots
