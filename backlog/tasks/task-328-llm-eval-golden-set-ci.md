---
id: 328
title: Add LLM eval golden set to CI for triage pipelines
epic: knowledge-tools
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 328: Add LLM Eval Golden Set to CI for Triage Pipelines

## Problem
When LLM providers silently update models or we switch providers (e.g., Fireworks -> OpenRouter migration), triage scoring quality can degrade without detection. No automated regression mechanism exists for the content intelligence pipeline.

## Solution
Create a golden test set of 50 labeled items (25 YouTube, 25 RSS) with expected score ranges and routes. Run as a CI check (or pre-commit/cron) using Promptfoo or a lightweight custom harness. Fail if >10% of items drift outside expected route.

## Acceptance Criteria
- [ ] Golden set of 50 items with labeled expected routes (SKIP/ENRICH/TICKET) in `tests/golden/`
- [ ] Eval script that runs all 50 through both `youtube_triage_scorer.py` and `rss_triage_scorer.py`
- [ ] Pass/fail threshold: >90% route agreement with golden labels
- [ ] Script runnable via `python tests/eval_triage_golden.py` with clear pass/fail output
- [ ] At least one provider regression scenario documented (e.g., what happens when DeepSeek V3 -> V4 changes output format)

## Related
- `scripts/lib/youtube_triage_scorer.py` -- YouTube scorer
- `scripts/lib/rss_triage_scorer.py` -- RSS scorer
- `scripts/lib/content_intelligence.py` -- LLM extraction pipeline
- Source: yt:i2gdSmY1TR8 (DeepSeek V4 / provider regression risk)
