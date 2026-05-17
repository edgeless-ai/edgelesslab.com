---
id: 223
title: Build phone-accessible status dashboard
status: ready
priority: P2
effort: M
epic: Product/Platform
created: 2026-03-21
depends_on: []
blocks: []
---

# Task 223: Phone-Accessible Status Dashboard

## Goal
Build a dashboard David can check from his phone showing:
- Active backlog tasks by status/priority
- In-flight agent work (inbox/outbox state)
- Hermes cron job status
- Recent agent responses

## Options to Evaluate
1. Static HTML served locally (simple, fast)
2. Telegram daily summary from Hermes (already has cron infra)
3. Simple web app on VPS accessible via Tailscale
4. Obsidian dashboard note updated by cron

## Acceptance Criteria
- [ ] Viewable on iPhone without SSH
- [ ] Updates at least every hour
- [ ] Shows task counts by status, top 5 P1 items, agent activity
