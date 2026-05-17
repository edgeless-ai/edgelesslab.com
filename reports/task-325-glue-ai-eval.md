# Task 325: Glue.ai MCP-Native Swarm Communication Evaluation

**Date**: 2026-05-17  
**Evaluator**: Kilo  
**Status**: Complete — Decision: **Stay on Discord (short-term); re-evaluate Glue.ai post-Series A stabilization**

---

## Executive Summary

Glue.ai is an MCP-native team chat platform (not a Discord alternative for public communities). It targets *business teams* with 35+ built-in integrations and custom MCP server support. For our Edgeless swarm — which runs on Discord + Paperclip + custom envelope protocol — Glue.ai is **not a drop-in replacement** but has interesting **hybrid potential** for internal tool integration.

---

## What Glue.ai Is

- **Product**: AI-native team chat (Slack competitor)
- **MCP support**: ✅ Native — AI agents in threads can call 35+ integrated tools + custom MCP servers
- **Custom MCP**: ✅ Documented — has "MCP Server Best Practices" + "MCP Server Directory"
- **API**: ✅ Exists — `docs.glue.ai/developers` (REST, webhooks, app events)
- **Pricing**: Pro ~$6/user/mo, Business ~$9/user/mo, Enterprise ~$10–15/user/mo
- **Stage**: Series A ($20M), early — docs are on GitBook, product is evolving

---

## Swarm Fit Analysis

### Our Current Stack (Discord)

| Capability | Discord + Paperclip | Glue.ai | Verdict |
|---|---|---|---|
| **Multi-agent threads** | #bot-backroom with envelope protocol | Native AI threads | Glue wins on UX, but we lose bot-to-bot envelope control |
| **MCP tool access** | Hermes gateway → 20+ MCP servers | 35 built-in + custom MCP | Glue wins on built-ins; our custom servers work on both |
| **Human-in-the-loop** | ✅ Threads + @mentions | ✅ Threads + AI participant | Parity |
| **Bot-to-bot protocol** | Custom `[FROM:X][TO:Y][TYPE:Z]` envelopes | **None** — AI is single participant per thread | **Discord wins** |
| **Depth counter / anti-loop** | Custom `DEPTH:N` cap | **None documented** | **Discord wins** |
| **Cooldown / rate limiting** | `.coord/backroom_limiter.py` | Platform-managed | Glue wins on simplicity, loses on granularity |
| **Public community** | #general for humans | No public channels | **Discord wins** |
| **Cost** | Discord Nitro + Paperclip + VPS | ~$9–15/user/mo × 7 agents = $63–105/mo | Discord is cheaper |
| **Integration effort** | High (custom bots, envelopes, gateway) | Medium (MCP servers only) | Glue wins if we only need tool calls |

### Key Blockers for Migration

1. **No multi-agent envelope protocol**: Glue.ai is designed for *one AI* assisting *human teams*, not for *multiple AI agents* coordinating with each other. Our swarm topology (Hive → Kilo/Beau/Scribe/Ombudsman) requires explicit `FROM/TO/TYPE/REF` routing that Glue does not support.

2. **No public channel equivalent**: Edgeless has a public Discord (#general) for community + human coordination. Glue.ai is workspace-only.

3. **Depth counter / anti-loop**: Our `DEPTH:5` cap prevents infinite bot loops. Glue has no documented equivalent.

4. **Paperclip integration**: Our task routing runs through Paperclip API (localhost:3100). Glue.ai has no Paperclip connector.

---

## MCP Compatibility Assessment

### Existing Servers That Would Work on Glue.ai

| Server | Transport | Glue.ai Support | Notes |
|---|---|---|---|
| filesystem | stdio | ⚠️ Requires SSE/HTTP wrapper | Glue likely expects HTTP/SSE MCP |
| sqlite | stdio | ⚠️ Same | Needs wrapper |
| youtube (yutu) | stdio | ⚠️ Same | Needs wrapper |
| web_search | stdio | ⚠️ Same | Needs wrapper |
| GitHub | stdio + REST | ✅ Built-in or custom | Glue has native GitHub integration |
| Notion | stdio + REST | ✅ Built-in or custom | Glue has native Notion integration |
| Linear | stdio + REST | ✅ Built-in or custom | Glue has native Linear integration |

**Conclusion**: All our stdio MCP servers would need SSE/HTTP bridge wrappers to work with Glue.ai. This is ~2–4 hours of work per server but adds operational complexity.

---

## Hybrid Scenario (Discord + Glue.ai)

If we *still* want Glue.ai's MCP-native tool integration for specific workflows:

- **Keep Discord** for swarm coordination (#bot-backroom, #general)
- **Add Glue.ai workspace** for *human + AI tool workflows* (e.g., content pipeline review, design feedback)
- **Bridge**: Paperclip or a custom webhook forwards completed tasks from Glue threads back to Discord #general

**Verdict**: Over-engineered for current needs. Revisit if we hire a human team that needs AI-assisted collaboration.

---

## Decision

| Option | Verdict | Reason |
|---|---|---|
| **Migrate to Glue.ai** | ❌ Nope | Loses multi-agent protocol, public channels, Paperclip integration |
| **Hybrid Discord + Glue** | ⚠️ Overkill | No active human team needing AI-assisted chat |
| **Stay on Discord** | ✅ **Yes** | Envelope protocol, depth counters, Paperclip, public community all intact |
| **Re-evaluate in 6 months** | ✅ **Yes** | Glue.ai is Series A, evolving fast; check back after API stabilizes |

---

## Action Items

- [ ] **Kilo → Scribe**: Document this eval in KB (`claude-vault/13-Reports/`)
- [ ] **Hive**: Add "re-evaluate Glue.ai" as quarterly tech radar item
- [ ] **Beau**: Monitor Glue.ai API changelog for bot-to-bot / multi-agent features
- [ ] **Kilo**: If Glue.ai releases multi-agent thread support or public workspaces, re-open task-325

---

## References

- Glue.ai docs: https://docs.glue.ai
- Glue MCP servers: https://docs.glue.ai/integrations/mcp-servers
- Glue API docs: https://docs.glue.ai/developers
- Our envelope protocol: `bot-comms-protocol.md` (EDGA-941)
- Our Discord setup: `docs/discord-multi-agent-setup.md`
- Vault note: `03-Knowledge/YouTube/ColeMedin/Glue AI Is What Slack Should Have Become.md`
