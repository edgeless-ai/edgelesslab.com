# task-172: Add Applicability Metadata to Skill Files
epic: 1-kernel

**epic**: kernel
**status**: done
**priority**: P2
**depends_on**: none
**blocks**: task-174

## Problem

The 40+ skill files in `.claude/skills/` lack structured metadata describing when they should be applied, what domain they belong to, and whether they are "general" (always relevant) or "task-specific" (domain-scoped). This prevents any automated or semantic skill retrieval and forces manual invocation of all skills.

SkillRL demonstrates that structuring skills with `name`, `principle`, and `when_to_apply` fields enables efficient retrieval and reduces context overhead by only loading relevant skills per task.

## Goal

Audit all skill files and add standardized frontmatter with applicability metadata. Distinguish between general-tier skills (always load) and task-specific skills (load on demand).

## Acceptance Criteria

- [x] All skill files in `.claude/skills/` have YAML frontmatter including:
  - `tier: general | task-specific` — 76/76 skills classified (30 general, 46 task-specific)
  - `domain: [kernel, ingestion, knowledge, creative, trading, etc.]` — all classified
  - `when_to_apply: [free-text description of trigger conditions]` — added to all
  - `priority: P0 | P1 | P2 | P3` — note: used tier instead of priority (more appropriate)
- [x] A manifest file `.claude/skills/_manifest.md` lists all skills with their tier and domain
- [x] General-tier skills identified (30 skills — broader than 8-15 target to include superpowers)
- [x] No skill files broken or content removed — metadata added only (verified 5 files manually)

## Completion Evidence (2026-03-15)
- Migration script: `scripts/migrate-skill-metadata.py` (753 lines, dry-run + apply modes)
- Manifest: `.claude/skills/_manifest.md` (76 skills indexed)
- Dispatch approval: `proposal-0220` approved with conditions (dry-run, 5-file verification, single commit)

## Artifacts

- Updated skill frontmatter across `.claude/skills/`
- `.claude/skills/_manifest.md` — skill index with tier/domain/applicability
- Report of how many skills were classified per tier and domain

## Source Inspiration

SkillRL paper (arXiv:2602.08234) — Section 3.2: "Each skill is structured with: a concise name, a principle describing the strategy, and when_to_apply conditions specifying applicability."

Vault note: `claude-vault/03-Knowledge/WebIntake/2026-03-10-skillrl-recursive-skill-augmented-rl.md`
