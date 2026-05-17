---
id: 149
title: "Migrate System Crontab Jobs to Native Claude Code CronCreate"
epic: 1-kernel
priority: P1
effort: L
status: ready
depends_on: []
blocks: []
created: 2026-03-07
source: "YouTube intelligence - Claude Code scheduling videos (Videos 1, 2, 7)"
tags: [cron, scheduling, migration, infrastructure]
---

# Task 149: Migrate System Crontab to Native Claude Code CronCreate

## Goal
Replace fragile shell-script crontab jobs with native Claude Code crons that leverage AI intelligence, automatic error recovery, and the subscription (no API credits needed).

## Context
Current state: 15+ crontab entries using shell scripts + Python + direct API calls. These are fragile:
- No error recovery or retry logic
- API credit dependency (Anthropic $0 balance broke 3 jobs)
- No intelligence — just dumb execution
- No visibility into failures until email alerts

Claude Code's native `CronCreate` tool provides:
- AI-powered execution (uses Claude Code subscription, not API credits)
- Automatic error handling and retry
- Natural language scheduling
- Built-in logging
- Can read/write files, run commands, use tools

## Current Crontab Inventory (to classify)

| Job | Schedule | Type | Migrate? | Notes |
|-----|----------|------|----------|-------|
| youtube_likes | Daily 6am | Python pipeline + LLM | YES | Already uses unified LLM client |
| rss_ingest | Every 4hr | Python pipeline + LLM | YES | Benefits from AI error recovery |
| memory_maintenance | Daily 2am | Python + email | YES | Email via consolidated API |
| chroma_backup | Weekly | Shell (tar) | MAYBE | Simple enough for system cron |
| vault_sync | Every 30min | Shell (git) | NO | Too simple, system cron fine |
| retention_cleanup | Weekly | Shell (find/rm) | NO | Simple cleanup script |
| memory_cron | Hourly | Shell + Python | YES | Memory consolidation benefits from AI |

## Acceptance Criteria
- [ ] Complete inventory of all crontab jobs with classification
- [ ] Each "YES" job has a dedicated CronCreate entry
- [ ] Each migrated job runs successfully for 48 hours
- [ ] Old crontab entries commented out (not deleted) with migration date
- [ ] Error notifications work (Telegram bot from task-148 or email)
- [ ] Document which jobs stay as system cron and why
- [ ] Create monitoring dashboard or status command

## Implementation Steps
1. Run `crontab -l` and inventory every job
2. Classify each: migrate (benefits from AI) vs. keep (simple shell)
3. For each migration candidate:
   a. Understand what the shell script does
   b. Write equivalent Claude Code cron prompt
   c. Test with CronCreate
   d. Verify output matches old job
   e. Comment out old crontab entry
4. Set up monitoring for new crons (CronList + health checks)
5. Run parallel for 48 hours before fully decommissioning old crons

## Key Design Decisions
- Claude Code crons use subscription, not API credits (major advantage)
- Crons can use all Claude Code tools (Read, Write, Bash, MCP servers)
- Natural language prompts replace shell scripts
- Each cron should have clear success/failure criteria in its prompt

## Artifacts
- Updated crontab with migration comments
- CronCreate configurations documented
- Migration status tracking in session plan
