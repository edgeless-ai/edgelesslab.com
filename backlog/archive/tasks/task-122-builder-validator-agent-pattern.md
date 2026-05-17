---
id: task-122
title: Implement Builder/Validator agent pattern as a hook
epic: 1-kernel
status: ready
priority: P2
depends_on: []
blocks: [125]
created: 2026-02-04
owner: david
estimated_effort: M (2-3 hours)
tags: [agent-pattern, builder-validator, hooks, quality, indydevdan]
source: youtube-meta-review-2026-02-04
---

# Task 122: Builder/Validator Agent Pattern

## Goal
Implement a post-tool hook or skill that automatically spawns a validator agent after significant code changes, catching issues before they reach the user.

## Context
IndyDevDan's "Claude Code Task System" and "The One Agent to RULE them ALL" videos recommend builder/validator pairs as a core agent pattern. The builder agent writes code; the validator agent independently reviews it. This is the agent-native equivalent of code review.

Our existing `/code-review` skill (using zen-mcp's codereview tool) partially addresses this, but it requires manual invocation. This task automates it.

### How It Differs From Existing Tools
- `/code-review` — manual invocation, reviews already-written code
- `verify-completion.py` — checks completion criteria, not code quality
- **This task** — automatic, triggered after Write/Edit, catches issues in-flight

## Step-by-Step Instructions

### Step 1: Design the Trigger Logic
Determine when validation should fire:
- After N consecutive Write/Edit operations (e.g., 3+)
- After editing files matching patterns (e.g., `*.py`, `*.ts`, not `*.md`)
- NOT after trivial edits (single-line, config files)
- Gate behind a threshold to avoid excessive validation

### Step 2: Implement Post-Tool Hook
Create `.claude/hooks/post-tool-validator.py`:
```python
# Pseudo-logic:
# 1. Track Write/Edit operations in session
# 2. After threshold reached, spawn validator sub-agent
# 3. Validator reviews recent changes with fresh context
# 4. Report issues back to main agent
# 5. Reset counter
```

Hook should use the existing Task tool pattern with `subagent_type="quality"`.

### Step 3: Create Validator Prompt Template
Create `.claude/skills/validator/skill.md`:
- Review the last N file changes
- Check for: security vulnerabilities, logic errors, missing error handling, breaking changes
- Output structured assessment: PASS / WARN / FAIL with specifics
- Keep context minimal — only the changed files + immediate dependencies

### Step 4: Configure Thresholds
Add to `.claude/settings.json` or similar:
```json
{
  "validator": {
    "trigger_after_edits": 5,
    "file_patterns": ["*.py", "*.ts", "*.js"],
    "exclude_patterns": ["*.md", "*.json", "*.yaml"],
    "auto_enable": false
  }
}
```

Start with `auto_enable: false` — opt-in while testing.

### Step 5: Test with Real Workflow
Run a multi-file coding task with the validator enabled. Measure:
- False positive rate (flags that aren't issues)
- Catch rate (issues it finds that you missed)
- Context overhead (tokens consumed by validation)
- Time overhead (does it slow workflow noticeably?)

## Acceptance Criteria
- [ ] Post-tool hook fires after configurable number of edits
- [ ] Validator sub-agent spawns with minimal context
- [ ] Structured output (PASS/WARN/FAIL) returned to main agent
- [ ] File pattern filtering works (only code files)
- [ ] Can be disabled/enabled per-session
- [ ] Does not fire during plan mode or research tasks

## Risks
- Context overhead: Validator agent consumes tokens
- False positives: May flag non-issues and annoy user
- Latency: Sub-agent spawn adds time to workflow
- Mitigation: Start opt-in, tune thresholds based on data

## Related
- `/code-review` skill (existing manual review)
- `verify-completion.py` hook (completion verification)
- task-125: F-thread pattern (related multi-agent approach)
