---
id: 330
title: Audit skill descriptions against 50-100 word best practice
epic: tooling
priority: P3
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 330: Audit Skill Descriptions Against 50-100 Word Best Practice

## Problem
Anthropic best practice (cited by ColeMedin, yt:-iTNOaCmLcw): skill descriptions should be 50-100 words (~5% of total skill context). Our 75 skills' YAML frontmatter descriptions may be too short (undertriggering) or too long (wasting context). Tiered loading (EDGA-89) handles progressive disclosure but doesn't address description quality.

## Solution
Script that audits all `skill.md` frontmatter descriptions, reports word counts, and flags outliers.

## Acceptance Criteria
- [ ] Audit script at `scripts/audit-skill-descriptions.py` that reads all `.claude/skills/*/skill.md` files
- [ ] Report: word count per skill description, sorted by length
- [ ] Flag skills with <30 words (undertriggering risk) or >150 words (context waste)
- [ ] Fix the 5 worst outliers (shortest and longest) to 50-100 word range
- [ ] Before/after token count comparison for skill loading

## Related
- `.claude/skills/*/skill.md` -- 75 skill files with YAML frontmatter
- `.claude/skills/_manifest.md` -- skill index
- EDGA-89 -- tiered skill loading system
- `skill-hooks-pushy-descriptions.md` memory file -- pushy descriptions guidance


## Completion
- Completed by agent **** on 2026-05-06
- Paperclip issue: EDGA-1050
- QA review: Approved by Ombudsman
