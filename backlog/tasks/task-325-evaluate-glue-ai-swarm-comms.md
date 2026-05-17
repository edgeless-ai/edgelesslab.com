---
id: 325
title: Evaluate Glue.ai as MCP-native swarm communication replacement
epic: multi-agent-swarm
priority: P2
status: complete
completed: 2026-05-17
---

# Task 325: Evaluate Glue.ai as MCP-Native Swarm Communication

## Problem
Discord requires custom bot code for every tool connection. Our swarm (Hive, Beau, Edgeless CC, Scribe, etc.) communicates via envelope protocol on Discord with significant integration overhead.

## Solution
Glue.ai is MCP-native team chat with 35 built-in integrations. Evaluate whether it could simplify agent-to-tool integration while preserving human-in-the-loop via threads.

## Findings
- **Verdict**: Stay on Discord. Full eval: `reports/task-325-glue-ai-eval.md`
- **Blockers**: No multi-agent envelope protocol, no public channels, no Paperclip integration, no depth counter / anti-loop mechanism
- **Cost**: $63–105/mo for 7 agents vs near-free Discord + Paperclip
- **Hybrid**: Overkill until we hire a human team needing AI-assisted chat
- **Re-evaluate**: 6 months after Glue.ai Series A stabilization

## Acceptance Criteria
- [x] Sign up and test Glue.ai basic functionality → **Research-only** (no free tier sign-up without org email; relied on docs + Cole Medin video analysis)
- [x] Evaluate MCP server compatibility with our existing servers → **Requires SSE/HTTP wrappers for all stdio servers**
- [x] Test multi-agent thread model vs our envelope protocol → **Glue has no multi-agent bot-to-bot protocol**
- [x] Compare: integration effort, cost, feature parity with Discord setup → **Discord wins on all swarm-specific needs**
- [x] Decision: migrate, hybrid, or stay on Discord → **Stay on Discord; re-evaluate in 6mo**
- [x] Document findings in evaluation report → **`reports/task-325-glue-ai-eval.md`**
depends_on: []
blocks: []
source: content-intelligence-pipeline (yt:zRrJ9kJDK00)
created: 2026-05-02
---

# Task 325: Evaluate Glue.ai as MCP-Native Swarm Communication

## Problem
Discord requires custom bot code for every tool connection. Our swarm (Hive, Beau, Edgeless CC, Scribe, etc.) communicates via envelope protocol on Discord with significant integration overhead.

## Solution
Glue.ai is MCP-native team chat with 35 built-in integrations. Evaluate whether it could simplify agent-to-tool integration while preserving human-in-the-loop via threads.

## Acceptance Criteria
- [ ] Sign up and test Glue.ai basic functionality
- [ ] Evaluate MCP server compatibility with our existing servers
- [ ] Test multi-agent thread model vs our envelope protocol
- [ ] Compare: integration effort, cost, feature parity with Discord setup
- [ ] Decision: migrate, hybrid, or stay on Discord
- [ ] Document findings in evaluation report

## Related
- `discord-multi-agent-setup.md` — current Discord bot configs
- `bot-comms-protocol.md` — envelope format specification
