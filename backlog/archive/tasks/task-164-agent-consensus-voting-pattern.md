---
id: 164
title: "Implement Multi-Agent Consensus/Voting Pattern for Critical Decisions"
epic: 1-kernel
priority: P3
effort: M
status: ready
depends_on: [151, 125]
blocks: []
created: 2026-03-07
source: "YouTube intelligence - Multi-agent consensus video (Video 14)"
tags: [multi-agent, consensus, voting, decision-making]
---

# Task 164: Multi-Agent Consensus/Voting Pattern

## Goal
For critical decisions (architecture changes, security-sensitive code, production deployments), run multiple agent instances and require consensus before proceeding.

## Pattern
```
Decision Point → Spawn 3 agents → Each evaluates independently → Vote → Proceed if 2/3+ agree
```

## Use Cases
- Architecture decisions (ADRs)
- Security review of sensitive code
- Production deployment approval
- Breaking change assessment
- Dependency upgrade decisions

## Voting Mechanics
- **Unanimous**: All agents must agree (highest safety)
- **Majority**: 2/3 or 3/5 must agree (balanced)
- **Any-flag**: Any agent can veto (security-focused)

## Acceptance Criteria
- [ ] Consensus orchestrator implemented
- [ ] Configurable voting thresholds per decision type
- [ ] Each agent gets independent context (no cross-contamination)
- [ ] Disagreements produce detailed comparison report
- [ ] Integration with builder/validator pattern (task-152)
- [ ] At least 1 real decision processed through consensus

## Relates To
- task-125: F-thread multi-agent consensus (original stub)
- task-152: Builder/validator pairs

## Artifacts
- Consensus orchestrator
- Decision templates per type
- Voting result reports
