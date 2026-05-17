---
created: 2026-03-10
status: done
priority: P1
epic: 2-ingestion
effort: M
depends_on: []
blocks: []
tags: [gmail, newsletter, backlog, automation, gws]
---

# Task 170: Build Python Newsletter Reply Handler Skill

## Context

Replace the n8n-based YouTube newsletter reply handler with a native Python skill. Now that `gws` CLI is fully configured (OAuth2, djm.claude.assistant@gmail.com), this has zero external dependencies — no Docker, no n8n needed.

## Current State

- n8n workflow was broken (task-169 fixing it, but n8n is heavyweight)
- `gws` CLI fully configured: `gws gmail +triage`, `gws gmail +watch`, `gws gmail +send`
- `consolidated_email_api.py` handles Gmail sending via thedavidmurray@gmail.com
- `llm_client.py` provides unified LLM (OpenRouter → Gemini)
- Newsletter generates suggested backlog tasks (added this session)
- `knowledge_router.py` has `create_backlog_tasks()` with file creation logic

## Design

```
.claude/skills/newsletter-reply-handler/
├── skill.md           # Skill documentation
└── scripts/
    └── process_replies.py  # Main handler
```

### Flow:
1. `gws gmail +triage` or `gws gmail users messages list` to find unread replies to "YouTube Intelligence" emails
2. `gws gmail users messages get <id>` to read reply content
3. Load matching newsletter from `claude-vault/13-Reports/YouTube-Newsletter/`
4. Generate AI response using unified LLM client (OpenRouter → Gemini)
5. Send reply via `gws gmail +send` or `consolidated_email_api`
6. Mark original as read via `gws gmail users messages modify`
7. **Parse reply for backlog commands and create task files**

### Backlog Task Creation (CORE FEATURE):
- Newsletter includes "SUGGESTED BACKLOG TASKS" with numbered items
- User replies "approve 1, 3" or "approve all" or "create task: <description>"
- Handler parses approval numbers and freeform task requests
- Creates task markdown files in `backlog/tasks/task-{next_id}-{slug}.md`
- Uses frontmatter schema from existing tasks (epic, priority, status, etc.)
- Confirms created tasks in reply email
- Also supports: "reject 2", "modify 1: change priority to P1"

### Additional Reply Intelligence:
- "add to backlog: <freeform task description>" → creates new task
- "research: <topic>" → creates research task
- "remind me: <thing>" → creates reminder task with date parsing
- Links in reply → auto-ingest via link-ingest skill

### Trigger:
- Pragmatic: `/loop 5m /process-newsletter-replies` or cron
- Alternative: `gws gmail +watch` (streaming NDJSON, needs persistent process)

## Acceptance Criteria

- [ ] Skill created at `.claude/skills/newsletter-reply-handler/`
- [ ] Detects unread YouTube Intelligence replies via `gws` CLI
- [ ] Loads matching newsletter from vault for context
- [ ] Generates thoughtful AI response via unified LLM client
- [ ] Sends reply keeping email thread intact
- [ ] Marks processed replies as read (no duplicates)
- [ ] **Creates backlog task files from "approve N" commands**
- [ ] **Creates backlog task files from freeform "add to backlog:" commands**
- [ ] **Auto-increments task ID (reads existing task files to find next ID)**
- [ ] **Confirms created tasks in reply email with task IDs**
- [ ] Rate limiting to prevent email loops
- [ ] Dry-run mode for testing

## Infrastructure Available

| Tool | Location | Purpose |
|------|----------|---------|
| `gws` CLI | `~/.local/bin/gws` | Gmail read/send/modify |
| `consolidated_email_api.py` | `src/tools/email/` | Alt Gmail send |
| `llm_client.py` | `src/tools/` | AI response generation |
| `knowledge_router.py` | `src/youtube_intelligence/` | `create_backlog_tasks()` |
| Backlog tasks | `backlog/tasks/` | Task file creation target |
| Newsletter archive | `claude-vault/13-Reports/YouTube-Newsletter/` | Context loading |

## Artifacts

- `.claude/skills/newsletter-reply-handler/skill.md`
- `.claude/skills/newsletter-reply-handler/scripts/process_replies.py`

## Source

User request via Telegram (session 2026-03-10)
Updated: backlog task creation confirmed as core feature
