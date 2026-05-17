---
id: task-133
title: Ingest and evaluate Compound Engineering plugin
epic: 1-kernel
status: completed
completed: 2026-03-10
priority: P2
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: M (2-3 hours)
tags: [plugin-ingestion, compound-engineering, every-inc, workflows, multi-agent-review]
source: https://github.com/EveryInc/compound-engineering-plugin
---

# Task 133: Ingest Compound Engineering Plugin

## Goal
Evaluate and selectively adopt the Compound Engineering plugin's workflow patterns. This plugin was highlighted as "very pragmatic, well-designed" in the awesome-claude-code community.

## Why This Matters
The core philosophy — "each unit of engineering work should make subsequent units easier, not harder" — directly aligns with our retrospective learning skill and meta-improvement goals. The plugin operationalizes this with four commands:

| Command | Function | Our Equivalent |
|---------|----------|---------------|
| `/workflows:plan` | Convert ideas → implementation plans | EnterPlanMode (built-in) |
| `/workflows:work` | Execute plans with worktrees + task tracking | TodoWrite + Task tool |
| `/workflows:review` | Multi-agent code review before merge | `/code-review` skill (partial) |
| `/workflows:compound` | Document learnings for reusability | `/retrospective` skill |

The **80/20 planning-to-execution ratio** inverts the typical approach and may explain their quality claims.

## Step-by-Step

### Step 1: Install and Explore
```bash
# Option A: Plugin install (if marketplace available)
claude plugin install compound-engineering

# Option B: Clone and study
git clone https://github.com/EveryInc/compound-engineering-plugin /tmp/compound-engineering
```

### Step 2: Study Architecture
Focus on:
- How agents/ directory structures multi-agent review
- How skills/ captures reusable knowledge
- How commands/ orchestrates the plan→work→review→compound loop
- How learnings feed back into future cycles (the compound part)

### Step 3: Gap Analysis
Compare their patterns vs ours:
- Their `/workflows:review` vs our `/code-review` — is theirs better?
- Their `/workflows:compound` vs our `/retrospective` — what do they capture that we don't?
- Their planning approach vs our EnterPlanMode — is the 80/20 ratio worth adopting?

### Step 4: Selective Adoption
Don't wholesale replace — cherry-pick the best patterns:
- Upgrade `/code-review` with their multi-agent review approach?
- Enhance `/retrospective` with their compound learning loop?
- Add their planning rigor to our workflow?

## Acceptance Criteria
- [ ] Plugin architecture fully understood
- [ ] Gap analysis completed against our existing skills
- [ ] At least 2 patterns adopted or documented for adoption
- [ ] Decision: install whole plugin vs. cherry-pick patterns

## Artifacts
- Gap analysis document
- Updated skills (if patterns adopted)
- Serena memory with findings
