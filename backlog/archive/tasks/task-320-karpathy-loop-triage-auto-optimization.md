---
id: 320
title: Implement Karpathy loop for triage scorer auto-optimization
epic: knowledge-tools
priority: P1
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline (yt:xnG8h3UnNFI)
created: 2026-05-02
---

# Task 320: Implement Karpathy Loop for Triage Scorer Auto-Optimization

## Problem
RSS/YouTube triage scorers use hand-tuned signal weights. No mechanism to detect drift or optimize based on actual outcomes. We process 1,000+ items but never close the feedback loop on scoring quality.

## Solution
Apply Karpathy's auto-research pattern: define accuracy metric against a labeled golden set, constrain optimization to signal weight edits in scorer files, run overnight loop that proposes weight changes, evaluates against golden set, and commits improvements.

## Acceptance Criteria
- [ ] Create labeled golden set of 50+ triage items with human-assigned routes (SKIP/ENRICH/TICKET)
- [ ] Define accuracy metric (e.g., route agreement rate, precision@TICKET)
- [ ] Build optimization loop that proposes weight changes to `youtube_triage_scorer.py` and `rss_triage_scorer.py`
- [ ] Evaluate proposed weights against golden set before applying
- [ ] Add trace logging to score breakdowns for observability
- [ ] Run one full optimization cycle and report improvement delta

## Related
- `scripts/lib/youtube_triage_scorer.py` — YouTube signal weights
- `scripts/lib/rss_triage_scorer.py` — RSS signal weights
- `scripts/lib/triage_core.py` — shared routing logic


## Completion
- Completed by agent **** on 2026-05-05
- Paperclip issue: EDGA-1040
- QA review: Approved by Ombudsman
