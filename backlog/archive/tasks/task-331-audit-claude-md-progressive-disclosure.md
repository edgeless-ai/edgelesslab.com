---
id: 331
title: Audit CLAUDE.md size and apply progressive disclosure
epic: infrastructure
priority: P3
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 331: Audit CLAUDE.md Size and Apply Progressive Disclosure

## Problem
ColeMedin (yt:goOZSXmrYQ4) recommends keeping global rules under 240 lines with on-demand reference docs for domain-specific guidance. Our root CLAUDE.md loads heavy context every session including RSS pipeline details, YouTube pipeline details, VPS access info, and multi-agent swarm docs. Tiered skill loading (EDGA-89) solved this for skills but the root config itself is still monolithic.

## Solution
Audit CLAUDE.md line count, identify sections that are domain-specific (not needed every session), and extract them into on-demand reference docs that skills or commands can load when relevant.

## Acceptance Criteria
- [x] Current CLAUDE.md line count documented (baseline): 291 lines
- [x] Sections classified as "always needed" vs "domain-specific": 164 always-needed, 124 domain-specific
- [x] At least 3 domain-specific sections extracted to reference docs: 6 sections → `docs/reference/pipeline-details.md`
- [x] CLAUDE.md reduced by >30% in line count: 291 → 181 (38% reduction)
- [x] Extracted sections loadable via explicit read of `docs/reference/pipeline-details.md`
- [x] All existing functionality preserved (pointers to reference doc in place)

## Related
- `/Users/djm/claude-projects/CLAUDE.md` -- root config
- `.claude/skills/load-task-skills.py` -- existing tiered loading mechanism
- EDGA-89 -- tiered skill loading precedent


## Completion
- Completed by agent **** on 2026-05-05
- Paperclip issue: EDGA-1051
- QA review: Approved by Ombudsman
