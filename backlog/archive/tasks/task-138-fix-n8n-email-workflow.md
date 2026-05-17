---
id: 138
title: "Fix n8n YouTube Newsletter Reply Handler Workflow"
epic: 2-ingestion
priority: P1
effort: M
status: superseded
superseded_by: task-169
depends_on: []
blocks: []
created: 2026-03-06
source: "Failed session - Claude Code made a mess of this"
tags: [n8n, workflow, youtube, email, automation]
---

# Task 138: Fix n8n YouTube Newsletter Reply Handler Workflow

## Problem

The YouTube Newsletter Reply Handler workflow in n8n is broken. Multiple issues accumulated from repeated failed fix attempts:

1. **Anthropic API credits exhausted** - Original model can't be used
2. **Gemini model not properly configured** - Attempted switch was incomplete
3. **LangChain Agent node configuration issues** - "No prompt specified" errors
4. **Trigger polling inconsistencies** - Sometimes polls, sometimes doesn't

## Current State

- Workflow ID: `yLHqDaguHOMY993f`
- Location: `/Users/djm/claude-projects/n8n-workflows/`
- Database: `n8n-data/database.sqlite`
- n8n version: 1.113.3

## What the Workflow Should Do

1. Gmail Trigger polls for emails from `thedavidmurray@gmail.com`
2. AI generates a response with optional ACTION block for task creation
3. Email is sent back, ACTION block stripped
4. If action detected, write to `.claude/inbox/actions.jsonl`
5. Claude Code processes actions into backlog tasks

## Acceptance Criteria

- [ ] Workflow executes without errors
- [ ] Uses working LLM (Gemini or another with valid credits)
- [ ] AI responses include ACTION blocks when appropriate
- [ ] Actions are written to queue file
- [ ] Email replies are sent successfully
- [ ] Signs as "- djm assistant"

## Recommended Approach

1. Open n8n UI at http://localhost:5678
2. Manually configure the workflow visually (stop editing via database)
3. Test each node individually
4. Verify Gemini credentials work with a simple test workflow first
5. Then wire up the full pipeline

## Files

- Workflow JSON (exported): `workflows/youtube-newsletter-reply-handler.json`
- Action queue: `.claude/inbox/actions.jsonl`
- Action processor: `.claude/inbox/process-actions.py`
- Docker config: `docker-compose.yml`

## Notes

Don't try to fix this via database manipulation again. Use the n8n UI.
