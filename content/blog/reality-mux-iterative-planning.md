---
slug: reality-mux-iterative-planning
title: Reality-MUX - Iterative Planning When Everything Changes
description: A planning loop for software where nothing stays still. Reused from production
  operational design, translated to shipping code under distributed teams.
date: '2026-06-14'
tags:
- planning
- operational-design
- rmuxp
readTime: 1 min
editorial: true
---

# Reality-MUX - Iterative Planning When Everything Changes

Every plan has a horizon. After that horizon, you are guessing.

## Why linear roadmaps fail

Linear roadmaps assume stability. They say "Phase 1 in January, Phase 2 in March." Reality does not care. A dependency moves. A market changes. A teammate gets pulled onto an incident.

When the horizon is short, that is fine. When you are designing systems across months, it is not.

## The Reality-MUX loop

Reality-MUX is a planning loop:

1. Define the current state clearly.
2. Define the ideal state with testable outcomes.
3. List the smallest set of changes that reduce the distance.
4. Execute one slice.
5. Recompute the current state.

It is iterative by default. There is no failure state, only a missing cycle.

## Operational behavior

- Small slices reduce risk.
- Explicit current-state definitions prevent drift.
- Completed milestones are durable evidence.
- Definitions of done are public.

## Why this matters for shipping

Self-evaluating goal loops prevent the comment section pattern: lots of discussion, missing artifacts. If you are not adding files, you are not executing.

The branch between planning and execution is small. The branch between a shipped plan and an academic plan is huge.

## The answer

Iterate. Ship. Evaluate. Repeat.