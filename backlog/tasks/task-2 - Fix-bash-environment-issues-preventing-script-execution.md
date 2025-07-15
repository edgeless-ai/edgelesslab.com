---
id: task-2
title: Fix bash environment issues preventing script execution
status: To Do
assignee: []
created_date: '2025-07-14'
labels:
  - 'type:bug'
  - 'priority:critical'
dependencies: []
---

## Description
Claude encounters persistent bash environment issues when trying to execute scripts directly. Error: "no such file or directory: /var/folders/.../claude-shell-snapshot". This prevents direct script execution and requires Python wrapper workarounds.

## Root Cause
The Claude Code environment seems to have issues with shell session persistence or environment variable loading.

## Impact
- Cannot run bash scripts directly
- Must create Python wrappers for all shell operations
- Slows down development workflow

## Acceptance Criteria
- [ ] Identify root cause of bash environment issue
- [ ] Find permanent solution or reliable workaround
- [ ] Document the solution in CLAUDE.md
- [ ] Test solution across different script types
