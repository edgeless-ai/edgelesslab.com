---
created: 2026-03-10
status: done
priority: P1
epic: 1-kernel
effort: S
depends_on: []
blocks: []
tags: [agency-agents, quality, verification, evidence-collector]
---

# Task 183: Adopt Evidence Collector Pattern from agency-agents

## Context

The Evidence Collector agent from agency-agents defaults to FAIL and requires Playwright screenshots as proof of task completion. This is the strongest QA pattern in the repo and directly improves our verify-completion hook.

## What to Adopt

1. **Default to FAIL** — completion must be proven, not claimed
2. **Require evidence artifacts** — screenshots, test output, metric values
3. **Multi-viewport testing** — 1920x1080, 768x1024, 375x667 for any UI work
4. **Structured verdict format** — PASS/FAIL with evidence links

## Acceptance Criteria

- [x] Update `verify-completion.py` hook to require evidence artifacts
- [x] Add "evidence" field to task completion checklist
- [x] Document evidence types per task category (code: tests pass, UI: screenshots, infra: health check)
- [x] Test with 3 recent completed tasks

## Verification (2026-03-14)
Already implemented in `verify-completion.py` and `completion-criteria.yaml`:
- Default-to-FAIL pattern is core to the verifier
- 7 evidence types supported: test_output, screenshot, health_check, metric_value, diff, file_content, command_output
- Per-project-type criteria (python, typescript, go, rust, general, kernel)
- Task-specific criteria support (e.g., task-92)
- Hook tested: `python verify-completion.py --type general --verbose` returns structured PASS/FAIL

## Source
Ported from `testing/testing-evidence-collector.md` in agency-agents repo
