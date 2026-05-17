---
created: 2026-03-10
status: done
priority: P1
epic: 1-kernel
effort: M
depends_on: []
blocks: [139, 142, 176]
tags: [skills, architecture, conventions, mcollina, meta]
---

# Task 178: Adopt mcollina/skills Architecture Patterns

## Context

Matteo Collina's `github.com/mcollina/skills` repo represents the current best practice for structuring AI agent knowledge. The content is Node.js-specific (skip), but the meta-architecture should be our skill standard.

Source: https://github.com/mcollina/skills

## What to Adopt

### 1. Discoverability Filter for CLAUDE.md (HIGHEST VALUE)
Before adding any line to CLAUDE.md, apply the filter: "Can an agent discover this by reading the repo?" If yes, remove it. Only keep:
- Non-discoverable landmines and gotchas
- Workflow conventions that break if violated
- Critical paths that would cause data loss

### 2. YAML Frontmatter Standard for skill.md Files
Every skill.md gets mandatory frontmatter:
```yaml
---
name: skill-name
description: >
  Long description packed with trigger terms for AI routing.
  Include synonyms, use-case phrases, and keyword matches so
  the agent knows WHEN to activate without being told.
metadata:
  tags: tag1, tag2, tag3
  tier: general | task-specific
  domain: kernel, ingestion, observability, etc.
---
```

### 3. Index Contract
If a skill has sub-files (scripts/, rules/, etc.), SKILL.md MUST explicitly link every file. No orphans. Adding/removing a file requires updating the index.

### 4. Standardized Sections
Every skill.md follows:
```markdown
## When to Use
<Conditions for activation — trigger terms, scenarios>

## Instructions
<Step-by-step behavioral instructions>

## Rules / Reference
<Links to rules/*.md for detailed content>
```

### 5. Rules Subdirectory for Complex Skills
Skills exceeding ~200 lines get a `rules/` subdirectory with individual focused documents.

### 6. Validation Checkpoints
Multi-step skills include explicit checkpoints: "Confirm X before proceeding to next step."

### 7. Cross-Skill Delegation
Skills explicitly reference other skills they delegate to: "For TypeScript linting, delegate to typescript-magician."

## Acceptance Criteria

- [x] CLAUDE.md audited with discoverability filter (61% reduction achieved — 983→385 words)
- [x] YAML frontmatter template created and documented (in skill-creator skill)
- [x] 5 highest-use skills converted to new format as proof of concept (memory-system, verify-completion, backlog-sync, session-planning, skill-creator)
- [x] Index contract documented in skill-creator skill
- [x] skill-creator skill updated to generate new format
- [x] Before/after token count comparison for CLAUDE.md (report: `reports/claude-md-discoverability-audit-2026-03-14.md`)

## Completion Evidence (2026-03-15)
- CLAUDE.md: 201→98 lines, ~61% token reduction
- Skills converted: memory-system, verify-completion, backlog-sync, session-planning, skill-creator
- Changes: added `allowed-tools`, `metadata` (tags/tier/domain), expanded `description` with trigger terms
- Fixed: angle brackets in memory-system frontmatter (`<2s` → `under 2s`)
- Audit report: `reports/claude-md-discoverability-audit-2026-03-14.md`
- Skills audit: `reports/skills-audit-2026-03-14.md`

## Relationship to Existing Tasks

- **Supersedes aspects of task-139** (Audit Skills Against Anthropic Standards) — this provides the specific standard to audit against
- **Informs task-142** (Progressive Disclosure Refactor) — the frontmatter enables tiered loading
- **Informs task-176** (Skill Applicability Metadata) — same concept, now with a proven format

## Source

User request to review https://github.com/mcollina/skills (2026-03-10)
