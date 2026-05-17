---
id: 332
title: Create /handoff skill for structured session summaries
epic: tooling
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 332: Create /handoff Skill for Structured Session Summaries

## Problem
When a Claude Code session ends (context limit, task switch, or crash), the next session starts cold. Critical context about what was attempted, what failed, and what's next is lost. Currently the user must manually explain state to fresh sessions.

## Solution
Create a `/handoff` skill that generates a structured session summary file for fresh-window continuation. Inspired by ColeMedin's 2000+ hours experience (yt:nxHKBq5ZU9U).

## Acceptance Criteria
- [ ] Skill at `.claude/skills/handoff/skill.md` with proper frontmatter
- [ ] `/handoff` generates a structured summary including: task in progress, files modified, decisions made, blockers hit, next steps
- [ ] Output written to `.claude/handoffs/handoff-<timestamp>.md`
- [ ] Summary is concise (<100 lines) and parseable by a fresh session
- [ ] Fresh session can load most recent handoff via `/handoff --resume` or explicit read
- [ ] Works with existing memory system (references relevant memory files, doesn't duplicate them)

## Related
- `.claude/skills/` -- skill directory
- `.claude/memory/` -- existing memory system (handoff complements, doesn't replace)
- `session_initializer.py` -- could be extended to auto-load latest handoff


## Completion
- Completed by agent **** on 2026-05-04
- Paperclip issue: EDGA-1052
- QA review: Approved by Ombudsman
