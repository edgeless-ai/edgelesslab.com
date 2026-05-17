---
id: 155
title: "Implement Self-Improving Subagents with Persistent YAML Memory"
epic: 1-kernel
priority: P2
effort: M
status: ready
depends_on: [124]
blocks: []
created: 2026-03-07
source: "YouTube intelligence - Self-improving agents video (Video 19)"
tags: [subagents, yaml, memory, self-improving, learning]
---

# Task 155: Self-Improving Subagents with Persistent YAML Memory

## Goal
Enable subagents to learn from their executions and improve over time by maintaining persistent YAML memory files that capture patterns, preferences, and domain expertise.

## Context
Current subagents start fresh each invocation. The self-improving pattern adds:
1. **Pre-execution**: Agent reads its YAML memory file for context
2. **Execution**: Agent performs task with learned context
3. **Post-execution**: Agent updates YAML memory with new learnings

This creates agents that get better at their specific domain over time.

## YAML Memory Schema
```yaml
# .claude/agent-memory/research-agent.yaml
agent: research-agent
version: 3
last_updated: 2026-03-07

preferences:
  search_depth: thorough
  preferred_sources: [arxiv, github, hacker-news]
  output_format: structured-markdown

learned_patterns:
  - pattern: "Academic papers need abstract + key findings extraction"
    confidence: 0.95
    learned_from: "session-2026-02-15"
  - pattern: "GitHub repos need README + architecture analysis"
    confidence: 0.88
    learned_from: "session-2026-02-20"

domain_knowledge:
  - "User prefers bullet points over paragraphs"
  - "Always include code examples when available"
  - "Link to source material"

error_history:
  - error: "Timeout on large repos"
    resolution: "Use shallow clone + targeted file reads"
    date: 2026-02-18
```

## Acceptance Criteria
- [ ] YAML memory schema defined and documented
- [ ] Memory read/write integrated into Agent tool wrapper
- [ ] At least 3 agent types have persistent memory (research, code-review, ingestion)
- [ ] Memory files stored in `.claude/agent-memory/`
- [ ] Learning extraction happens automatically after each agent run
- [ ] Memory pruning to prevent unbounded growth
- [ ] Measurable improvement in agent task completion quality over time

## Relates To
- task-124: YAML mental models for agent domain expertise (original stub)
- task-92: Agent RLM audit

## Artifacts
- YAML memory schema specification
- Agent wrapper with memory integration
- Memory files for core agent types
