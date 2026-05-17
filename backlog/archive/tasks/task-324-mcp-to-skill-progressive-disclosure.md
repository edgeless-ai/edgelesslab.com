---
id: 324
title: Convert MCP servers to skills with progressive disclosure
epic: cost-optimization
priority: P2
status: completed
depends_on: []
blocks: []
source: content-intelligence-pipeline (yt:jYMhDEzNAN0 - ColeMedin second brain)
created: 2026-05-02
---

# Task 324: Convert MCP Servers to Skills with Progressive Disclosure

## Problem
4+ MCP servers (supadata, chrome, codex, twozero_td) load all tool schemas into context upfront. This wastes thousands of tokens on tools rarely used in a given session. CLAUDE.md itself exceeds the recommended 240-line limit for global rules.

## Solution
ColeMedin's pattern: Python proxy script converts MCP servers into skills. Tool schemas load only when the skill is invoked, not at session start. Extends our existing tiered skill loading (EDGA-89).

## Acceptance Criteria
- [ ] Build MCP-to-Skill proxy that wraps MCP tool calls in a skill interface
- [ ] Convert at least 2 MCP servers (supadata, codex) to skill-wrapped versions
- [ ] Measure context token reduction before/after
- [ ] Verify tool functionality is preserved (same inputs/outputs)
- [ ] Update `.mcp.json` and skill manifest accordingly

## Related
- `.mcp.json` — current MCP config
- `.claude/skills/_manifest.md` — skill index
- EDGA-89 — tiered skill loading (31 general, 47 task-specific)
