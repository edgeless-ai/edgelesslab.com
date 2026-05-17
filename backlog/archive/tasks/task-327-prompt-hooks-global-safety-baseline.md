---
id: 327
title: Upgrade hook system with prompt hooks and global safety baseline
epic: security
priority: P1
status: completed
depends_on: [321]
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 327: Upgrade Hook System with Prompt Hooks and Global Safety Baseline

## Problem
Our 10 active hooks use only deterministic pattern matching (regex, string checks). Novel dangerous commands that don't match known patterns slip through. No global-level safety baseline exists -- all hooks are project-scoped.

## Solution
Add three new hook capabilities inspired by IndyDevDan's hook taxonomy (yt:VqDs46A8pqE):

1. **Prompt hooks**: LLM-evaluated catch-all that reviews commands not caught by deterministic hooks. Runs a cheap model (DeepSeek via OpenRouter) to classify risk.
2. **Global safety baseline**: Add baseline hooks at `~/.claude/settings.json` that apply across all projects (prevent `rm -rf /`, credential exfiltration, force push to main).
3. **Path protection levels**: Define zero-access, readonly, and no-delete zones in a `patterns.yaml` config for easier hook management.

## Acceptance Criteria
- [ ] At least one prompt hook deployed that catches a novel dangerous command not covered by existing regex hooks
- [ ] Global hooks in `~/.claude/settings.json` block `rm -rf /`, `git push --force` to main, and reading `.env` files via cat/head
- [ ] `patterns.yaml` config file defines path protection levels, consumed by `damage-control.py`
- [ ] Prompt hook latency < 2 seconds (measured on 10 sample commands)
- [ ] Existing deterministic hooks still run first (prompt hook is fallback only)
- [ ] All 10 existing hooks pass regression test after changes

## Related
- Task 321: Audit bash/MCP security (prerequisite -- audit first, then harden)
- `.claude/hooks/damage-control.py` -- existing bash guard to extend
- `~/.claude/settings.json` -- global config target


## Completion
- Completed by agent **** on 2026-05-07
- Paperclip issue: EDGA-1047
- QA review: Approved by Ombudsman
