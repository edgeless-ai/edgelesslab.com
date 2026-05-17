---
id: 128
title: "ML Prediction A/B Testing - Compare ML vs Rule-Based"
epic: kernel
status: blocked
priority: P2
effort: L
depends_on: [116]
blocks: []
created: 2026-02-04
completion_criteria:
  required:
    - file_exists: "scripts/ml-ab-test-results.json"
      description: "A/B test results saved"
---

# Task 128: ML Prediction A/B Testing - Compare ML vs Rule-Based

## Objective
Quantify whether the PyTorch ML system adds value over the existing rule-based strategies.

## Blocked On
- Task 116 must complete first (need enough training data)

## Design

### Shadow Mode A/B Test
1. For each trade opportunity, get predictions from both:
   - **Control**: Current rule-based strategy (whale + momentum + statArb)
   - **Treatment**: PyTorch ML prediction
2. Execute based on rule-based (don't let ML control real money yet)
3. Track what ML *would have done* vs what actually happened

### Metrics to Compare
| Metric | Rule-Based | ML Prediction | Winner |
|--------|-----------|---------------|--------|
| Win rate | ? | ? | ? |
| Avg PnL per trade | ? | ? | ? |
| False positive rate | ? | ? | ? |
| Missed opportunities | ? | ? | ? |
| Risk-adjusted return | ? | ? | ? |

### Success Criteria for ML Graduation
- ML must outperform rule-based on risk-adjusted return by >5%
- Over minimum 100 prediction opportunities
- With statistical significance (p < 0.05)

## Implementation Approach
1. Add shadow prediction logging to trade evaluator
2. Record both predictions + actual outcome
3. After 100+ samples, run statistical comparison
4. If ML passes: gradually increase ML weight in decisions
5. If ML fails: diagnose and retrain or disable

## Risk Mitigation
- ML never controls real trades during A/B test
- All ML predictions logged for analysis
- Easy kill switch to disable ML component
