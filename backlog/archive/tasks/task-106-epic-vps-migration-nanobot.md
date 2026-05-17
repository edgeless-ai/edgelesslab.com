---
id: 106
title: "EPIC: VPS Migration & nanobot Deployment"
epic: kernel
status: done
priority: P2
effort: L
owner: david
created: 2026-02-03
depends_on: []
blocks: []
tags: [epic, infrastructure, vps, nanobot, cost-optimization]
deadline: 2026-02-28
---

# EPIC 106: VPS Migration & nanobot Deployment

## The Problem

Current Hostinger KVM 8 VPS is:
- **Massively over-provisioned**: Using 2% CPU, 6% RAM, 3% storage
- **Overpriced**: $43.99/mo renewal (3x original price of $15/mo)
- **Wasteful**: Paying $1,056/2yr for resources used at 2-6%

## The Solution

1. Migrate to Hetzner CPX21 (~$10/mo, right-sized)
2. Deploy nanobot (lightweight 4k-line AI assistant)
3. Use Kimi K2.5 via OpenRouter (85% cheaper than Claude for routine tasks)
4. Migrate Pamela bot to new infrastructure

## Cost Impact

| Item | Current | Target | Savings |
|------|---------|--------|---------|
| VPS (2yr) | $1,056 | ~$240 | **$816** |
| API/mo | Claude rates | Kimi K2.5 | ~85% reduction |

## Deadline

**Hostinger expires: 2026-02-28** - Must complete migration before then.

## Success Criteria

### Quantitative
- [ ] VPS monthly cost <$12
- [ ] API monthly cost <$20
- [ ] Response latency <2s
- [ ] Uptime >99%
- [ ] Zero data loss from migration

### Qualitative
- [ ] Telegram bot responds to messages
- [ ] Can perform web searches
- [ ] Scheduled tasks execute
- [ ] Pamela bot operational after migration
- [ ] Claude fallback works when needed

## Sub-Tasks

| ID | Title | Status | Effort | Blocks |
|----|-------|--------|--------|--------|
| 107 | Gather API keys and Telegram credentials | pending | S | 108 |
| 108 | Provision Hetzner VPS and configure security | pending | M | 109 |
| 109 | Install and configure nanobot | pending | M | 110 |
| 110 | Migrate Pamela bot from Hostinger | pending | M | 111 |
| 111 | Configure Tailscale and final verification | pending | S | 112 |
| 112 | Disable Hostinger renewal and monitor | pending | S | - |

## Implementation Plan

See: `/Users/djm/claude-projects/nanobot-vps/IMPLEMENTATION-PLAN.md`

## Research Report

See: `/Users/djm/claude-projects/claude-vault/03-Knowledge/Research-Sessions/2026-02-03-vps-migration-nanobot-research.md`

## Key Links

- **Hetzner Console**: https://console.hetzner.cloud/
- **nanobot GitHub**: https://github.com/HKUDS/nanobot
- **OpenRouter**: https://openrouter.ai/keys
- **Kimi K2.5**: https://openrouter.ai/moonshotai/kimi-k2.5

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration breaks Pamela | Medium | High | Full backup before migration |
| nanobot doesn't meet needs | Low | Medium | OpenClaw as fallback |
| Kimi K2.5 quality issues | Low | Low | Claude fallback configured |
| OpenRouter downtime | Low | Medium | Direct Anthropic key backup |

---

*Epic created 2026-02-03 from research session*
*Deadline: 2026-02-28 (Hostinger expiration)*
