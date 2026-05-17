---
id: task-132
title: Ingest and adapt Charlie CFO skill architecture patterns
epic: 4-knowledge
status: completed
completed: 2026-03-10
priority: P3
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: S (1-2 hours)
tags: [skill-ingestion, charlie-cfo, every-inc, reference-architecture, financial]
source: https://github.com/EveryInc/charlie-cfo-skill
---

# Task 132: Ingest Charlie CFO Skill

## Goal
Study the Charlie CFO skill's architecture and adopt its best patterns into our skill system. Optionally install it if the financial frameworks are useful.

## Why This Matters
Charlie demonstrates several patterns we should adopt:
1. **Reference-driven architecture** — Core skill.md stays lean, delegates to `references/` subdirectory for deep content (metrics, benchmarks, case studies). This IS progressive disclosure done right.
2. **Contextual activation** — Triggers on intent ("Should we make this hire?") not just explicit commands. Shows how skills can be ambient.
3. **Philosophical grounding** — Embeds a value system ("profit is a constraint, not a goal") that shapes ALL recommendations coherently. Our skills lack this.
4. **Case study integration** — Grounds abstract principles in concrete examples (Mailchimp, Zapier, Basecamp).

## Step-by-Step

### Step 1: Clone and Study
```bash
git clone https://github.com/EveryInc/charlie-cfo-skill /tmp/charlie-cfo-skill
```
Read: SKILL.md, references/metrics-benchmarks.md, references/case-studies.md

### Step 2: Extract Patterns
Document which architectural patterns to adopt:
- Reference subdirectory pattern → apply to our existing skills
- Intent-matching activation → could improve our skill trigger logic
- Philosophical framing → apply to mental models (task-124)

### Step 3: Adapt for Our Use
If useful as-is, install: `cp -r /tmp/charlie-cfo-skill .claude/skills/charlie-cfo/`
If not, extract the architectural patterns into our Prompt Engineering Framework.

## Acceptance Criteria
- [ ] Skill architecture studied and patterns documented
- [ ] At least 1 pattern adopted into our skill system or framework
- [ ] Decision documented: install as-is vs. extract patterns only

## Completion Notes (2026-03-10)

Decision: **Install as-is** — the financial frameworks are directly useful for task-188 (SMB Revenue Strategy) and any product monetization decisions.

Installed to: `.claude/skills/charlie-cfo/` (SKILL.md + references/)

Key patterns adopted:
1. **Reference subdirectory** — lean SKILL.md with deep content in `references/`. Already used in our skill-creator template.
2. **Intent-matching activation** — skill triggers on financial questions like "should we make this hire?" without explicit commands.
3. **Philosophical framing** — "Profit is a constraint, not a goal" shapes all advice coherently.

## Artifacts
- `.claude/skills/charlie-cfo/SKILL.md`
- `.claude/skills/charlie-cfo/references/metrics-benchmarks.md`
- `.claude/skills/charlie-cfo/references/case-studies.md`
