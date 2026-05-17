---
id: 333
title: Evaluate meta-skill pattern for autonomous skill improvement
epic: tooling
priority: P2
status: completed
depends_on: [330]
blocks: []
source: content-intelligence-pipeline
created: 2026-05-03
---

# Task 333: Evaluate Meta-Skill Pattern for Autonomous Skill Improvement

## Problem
Our 75-skill library requires manual maintenance. Rebelitics (yt:aZOq3QxMC7E) demonstrated a "one-skill-to-rule-them-all" pattern: a meta-skill that watches work sessions and autonomously improves all skills including itself. They reported 600+ improvements across 40 skills via scheduled Mon/Wed/Fri sessions.

## Solution
Evaluate whether a meta-skill can meaningfully improve our skill library by analyzing usage patterns, identifying undertriggered skills, and suggesting description/content improvements. Depends on task-330 (skill description audit) for baseline data.

## Acceptance Criteria
- [ ] Prototype meta-skill at `.claude/skills/meta-skill-improver/skill.md`
- [ ] Meta-skill can: (1) read all skill frontmatter, (2) analyze recent session logs for skill usage, (3) suggest improvements
- [ ] Run once manually, producing at least 5 concrete improvement suggestions
- [ ] At least 2 suggestions accepted and applied (measured improvement in triggering or quality)
- [ ] Safety: meta-skill changes require human review (no auto-commit to skill files)
- [ ] Decision: adopt scheduled runs (like Rebelitics) or keep manual-only

## Related
- `.claude/skills/*/skill.md` -- 75 skill files
- `.claude/skills/_manifest.md` -- skill index
- Task 330: Skill description audit (provides baseline)
- EDGA-89 -- tiered skill loading


## Completion
- Completed by agent **** on 2026-05-04
- Paperclip issue: EDGA-1053
- QA review: Approved by Ombudsman
