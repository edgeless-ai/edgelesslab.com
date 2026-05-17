---
id: 335
title: "Owl Alpha Eval: Anomaly runs a full system health check"
status: completed
priority: P1
epic: owl-alpha-eval
agent: anomaly
depends_on: []
blocks: []
created: 2026-05-03
---

# Owl Alpha Eval: Anomaly Health Check

## Objective
Evaluate Owl Alpha's capability as the Anomaly agent's LLM by having it perform a real system health check — Anomaly's core job.

## Task
Anomaly should:
1. Check all 6 Hermes Discord gateway statuses (launchctl list)
2. Check Paperclip API health (curl 127.0.0.1:3100/api/companies)
3. Check cron health (list active crons, identify any that haven't fired recently)
4. Check disk usage on key paths (chroma-data, claude-vault, backlog)
5. Produce a structured health report with status indicators

## Acceptance Criteria
- [ ] Report covers all 5 check categories
- [ ] Correctly identifies any services that are down or degraded
- [ ] Report is structured (not rambling prose)
- [ ] Completes within 5 minutes
- [ ] No hallucinated statuses — every claim backed by actual command output

## Eval Scoring
- **Pass**: All criteria met, report is actionable
- **Partial**: Report exists but misses categories or has inaccuracies
- **Fail**: Can't complete, hallucinates, or takes >10 minutes


## Completion
- Completed by agent **** on 2026-05-04
- Paperclip issue: EDGA-1065
- QA review: Approved by Ombudsman
