---
id: task-216
title: Integrate Karpathy AI Jobs Exposure Data
status: backlog
priority: P2
epic: 2-ingestion
created: 2026-03-15
depends_on: []
blocks: []
---

# Integrate Karpathy AI Jobs Exposure Data

## Context
David requested integration of https://karpathy.ai/jobs/ (AI exposure visualization for 342 US occupations) into two systems.

## Acceptance Criteria
1. **Pamela Integration**: Parse AI exposure data as a market signal for AI-exposed sectors. Use occupation exposure scores to inform sector-level trading signals (e.g., high AI exposure in finance → bet on fintech disruption themes).
2. **Digest Integration**: Include AI exposure insights as research content in newsletter digests. Surface interesting trends and occupation-level data points.

## Implementation Notes
- Source: https://karpathy.ai/jobs/ — interactive visualization
- Data likely needs scraping or API extraction
- 342 US occupations with AI exposure scores
- Could correlate with sector ETFs or Polymarket themes

## Artifacts
- [ ] Data extraction script
- [ ] Pamela signal integration
- [ ] Digest content template
