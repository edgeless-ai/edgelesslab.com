---
id: 98
title: Answer Subagent Calibration Questionnaire
epic: knowledge
status: completed
priority: P2
effort: S
owner: DAVID (human task - not agent executable)
created: 2026-01-27
depends_on: []
blocks: []
tags: [meta, preferences, agent-calibration, human-task]
---

# Task 98: Answer Subagent Calibration Questionnaire

## Summary

Complete the working preferences questionnaire that captures implicit decision-making patterns. This calibration data will help all subagents (architect, developer, research, quality, writer) work more effectively by understanding YOUR quality bar, completion signals, and decision triggers.

## Why This Matters

Five subagents reflected on what they wish they knew about you. Common gaps:
- **Decision triggers**: What makes something survive vs get abandoned?
- **Completion signals**: When is "thorough" actually done?
- **Context preservation**: What does "losing insights" actually mean?
- **Quality bar**: What makes you say "ship it" vs "stale af"?

Without this calibration, agents optimize for generic quality rather than YOUR quality bar.

## Owner

**DAVID** - This is a human task. The agent cannot answer these questions for you.

## Location

**Email**: "Subagent Calibration Questionnaire - What We Wish We Knew" (sent 2026-01-27)

**Markdown file**: `claude-vault/03-Knowledge/vault/david-working-preferences-questionnaire.md`

## Sections

1. **Decision Triggers** (2 questions) - abandon vs integrate, losing insights
2. **Completion & Quality** (3 questions) - when done, ship vs stale, complexity style
3. **Technical Preferences** (4 questions) - errors, testing, types, performance
4. **Documentation** (3 questions) - why before how, sources, comments
5. **Operational Context** (3 questions) - night owl, surface area, active decisions
6. **Knowledge Baseline** (3 questions) - canonical sources, contrarian views, interests

## Estimated Time

15-30 minutes

## Acceptance Criteria

- [ ] All 18 questions answered (even brief answers count)
- [ ] Answers provided via email reply OR markdown file edit
- [ ] Agent notified to persist answers to ChromaDB + Serena memory

## After Completion

Tell Claude: "I answered the questionnaire" and provide the answers or point to the filled-out file. Agent will:
1. Persist to ChromaDB (semantic search)
2. Create Serena memory (agent reference)
3. Update cross-source profile with calibration data

---

*Generated from subagent reflection process analyzing Claude.ai history + MindTrap data*
