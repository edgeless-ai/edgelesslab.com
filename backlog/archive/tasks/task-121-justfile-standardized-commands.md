---
id: task-121
title: Implement JustFile standardized project commands
epic: 1-kernel
status: ready
priority: P3
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: S (1 hour)
tags: [justfile, developer-experience, automation, indydevdan]
source: youtube-meta-review-2026-02-04
---

# Task 121: JustFile Standardized Project Commands

## Goal
Add a `justfile` to the claude-projects root providing consistent, discoverable commands for common operations.

## Context
IndyDevDan recommends JustFile as a standardized command runner in "Stop Installing Codebases Manually." It creates a single entry point for all project commands, replacing scattered shell scripts and ad-hoc commands. This improves DX for both human and agent use — agents can discover available commands via `just --list`.

## Step-by-Step Instructions

### Step 1: Install just
```bash
brew install just
```

### Step 2: Audit Current Commands
Inventory commonly-used operations:
- YouTube pipeline: heartbeat, newsletter, full scan
- Memory system: initialization, health check, search
- Email: send test email, check token
- Backlog: sync, list tasks, create task
- Cron: check health, view logs
- Tests: run test suite
- Vault: SLO check, dashboard update

### Step 3: Create justfile
```justfile
# Claude Projects - Standardized Commands

# List all available commands
default:
    @just --list

# --- YouTube Intelligence ---
youtube-heartbeat:
    .venv/bin/python -m src.youtube_intelligence.cli heartbeat

youtube-newsletter mode="evening":
    scripts/youtube_intelligence/run_newsletter.sh {{mode}}

# --- Memory System ---
memory-init:
    .venv/bin/python .claude/memory/session_initializer.py

memory-health:
    .venv/bin/python .claude/memory/session_initializer.py --test-only

# --- Backlog ---
backlog-sync:
    # Trigger backlog sync skill
    cat backlog/ACTIVE-BACKLOG.md

backlog-list:
    ls backlog/tasks/task-*.md | wc -l

# --- Health ---
cron-health:
    .venv/bin/python scripts/cron_failure_alerter.py --check-logs

# --- Tests ---
test:
    .venv/bin/python -m pytest tests/ -v
```

### Step 4: Test Commands
Run each command and verify it works correctly.

### Step 5: Document in Claude.md
Add one-liner reference: "Use `just --list` to see available project commands."

## Acceptance Criteria
- [ ] `just` installed and on PATH
- [ ] `justfile` exists at project root
- [ ] `just --list` shows all commands with descriptions
- [ ] Each command executes successfully
- [ ] Claude.md references justfile

## Artifacts
- `justfile` at project root
- One-line addition to Claude.md
