---
id: 139
title: "Audit Existing Skills Against Anthropic Standards"
epic: 1-kernel
priority: P1
effort: M
status: done
depends_on: []
blocks: []
created: 2026-03-07
source: "The Complete Guide to Building Skills for Claude (Anthropic)"
tags: [skills, anthropic, audit, compliance]
---

# Task 139: Audit Existing Skills Against Anthropic Standards

## Description

Audit all 40+ skills in `.claude/skills/` against the official Anthropic skill specification from their January 2026 guide.

## Acceptance Criteria

- [x] Scan all skill directories for compliance issues (73 skills scanned)
- [x] Validate SKILL.md exact naming — note: Claude Code loader works with lowercase `skill.md`
- [x] Verify folder names are kebab-case — 1 non-compliant (`_shared`)
- [x] Check YAML frontmatter has `---` delimiters (all have)
- [x] Verify `name` field is kebab-case matching folder name (20 mismatches logged)
- [x] Verify `description` includes WHAT + WHEN — top 5 skills fixed in task-178
- [x] Check for forbidden XML angle brackets in frontmatter (5 found, fixed in memory-system)
- [x] Flag skills >5000 words (2 found: ui-ux-pro-max 6466w, ce-orchestrating-swarms 5758w)
- [x] Generate compliance report: `reports/skills-audit-2026-03-14.md`
- [x] Fix critical issues in top 5 skills (task-178)

## Completion Evidence (2026-03-15)
- Report: `reports/skills-audit-2026-03-14.md` (22 PASS, 44 NEEDS_UPDATE, 7 CRITICAL)
- Top 5 skills fixed: memory-system, verify-completion, backlog-sync, session-planning, skill-creator
- Remaining NEEDS_UPDATE skills (44) are tracked — can be fixed incrementally via task-176

## Technical Specification

### Validation Checks
```python
# Required checks from Anthropic guide:
1. SKILL.md exists (exact case)
2. No README.md in skill folder
3. Folder name matches kebab-case pattern: ^[a-z0-9]+(-[a-z0-9]+)*$
4. YAML frontmatter present with --- delimiters
5. name field: kebab-case, matches folder
6. description field: <1024 chars, includes trigger phrases
7. No < or > in frontmatter (security)
8. No "claude" or "anthropic" in name (reserved)
9. SKILL.md body <5000 words (progressive disclosure)
```

### Report Output
- Generate `reports/skill-audit-YYYY-MM-DD.md`
- Summary table: skill name, issues found, severity
- Detailed breakdown per skill

## Artifacts
- [ ] `scripts/audit_skills.py` - Audit script
- [ ] `reports/skill-audit-*.md` - Compliance report

## Dependencies
- Reference: `claude-vault/03-Knowledge/WebIntake/2026-03-07-complete-guide-building-skills-for-claude.md`
