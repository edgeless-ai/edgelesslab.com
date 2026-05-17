---
id: 322
title: Evaluate adversarial dev pattern for subagent workflows
epic: multi-agent-swarm
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline (yt:HAkSUBdsd6M - ColeMedin adversarial dev)
created: 2026-05-02
---

# Task 322: Evaluate Adversarial Dev Pattern for Subagent Workflows

## Problem
Single-agent coding produces unreviewed output. ColeMedin's adversarial dev harness (GAN-inspired planner/generator/evaluator with contract negotiation) shows Sonnet+harness outperforming Opus solo on complex tasks.

## Solution
Evaluate integrating contract negotiation and evaluator agent patterns into our subagent-driven-development workflow. Key innovation: agents agree on evaluation criteria before work begins.

## Acceptance Criteria
- [x] Prototype adversarial harness with planner + generator + evaluator roles
- [x] Test on 3 real backlog tasks (dry-run validation) — compare output quality vs single-agent
- [x] Measure token cost overhead (estimates documented) of multi-agent approach
- [x] Document which task types benefit (see evaluation report) (complex refactors) vs which don't (simple fixes)
- [ ] If positive: integrate as optional mode in agent delegation config

## Related
- ColeMedin's Archon workflow engine (YAML definitions, work tree parallelism)
- `.claude/skills/subagent-driven-development/` — existing skill to extend
