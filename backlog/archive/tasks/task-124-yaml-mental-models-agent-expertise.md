---
id: task-124
title: Implement YAML mental models for agent domain expertise
epic: 4-knowledge
status: ready
priority: P2
depends_on: []
blocks: []
created: 2026-02-04
owner: david
estimated_effort: M (2-3 hours)
tags: [mental-models, yaml, agent-expertise, domain-knowledge, indydevdan]
source: youtube-meta-review-2026-02-04
---

# Task 124: YAML Mental Models for Agent Expertise

## Goal
Create structured YAML expertise files that capture domain knowledge for our agents, enabling them to make better decisions without consuming excessive context.

## Context
IndyDevDan's "Agent Experts" video introduces "mental models" — YAML files that capture domain expertise while keeping source code as the single source of truth. These enable:
- Agents to have domain-specific knowledge without loading entire codebases
- Multi-agent systems where specialized experts work in parallel
- Continuous learning by updating expertise files based on outcomes
- Meta-agentic systems where agents can modify their own expertise

This is distinct from our existing Serena memories (unstructured markdown) and ChromaDB documents (semantic search). Mental models are structured, schema-driven, and designed for agent consumption.

## Step-by-Step Instructions

### Step 1: Design Schema
```yaml
# .claude/mental-models/schema.yaml
mental_model:
  domain: string           # e.g., "trading", "youtube-pipeline", "memory-system"
  version: string          # semantic versioning
  last_updated: date
  confidence: float        # 0.0-1.0

  principles:              # Core rules that rarely change
    - name: string
      rule: string
      evidence: string     # Why we believe this

  patterns:                # Recurring patterns to recognize
    - name: string
      trigger: string      # When to apply
      action: string       # What to do
      anti_pattern: string # What NOT to do

  tools:                   # Relevant tools and how to use them
    - name: string
      when: string
      command: string

  failure_modes:           # Known failure modes to avoid
    - scenario: string
      symptoms: string
      fix: string
```

### Step 2: Create Initial Mental Models
Start with the domains where we have the most experience:

**Trading (Pamela/Toast):**
- Position sizing rules
- Market type recognition
- Risk management patterns
- Known failure modes (e.g., event markets, low liquidity)

**YouTube Pipeline:**
- Shorts detection heuristics
- Transcript extraction patterns
- Newsletter generation rules
- Common failure modes and their fixes

**Memory System:**
- When to use ChromaDB vs Serena vs Obsidian
- Query patterns that work well
- Known limitations of each connector

**Infrastructure:**
- Cron scheduling patterns (heartbeat-before-newsletter)
- VPS management rules
- Hook configuration patterns

### Step 3: Integrate with Agent Loading
Create a skill or hook that loads relevant mental models based on task context:
```python
# .claude/hooks/load-mental-model.py
# Pre-tool hook that detects task domain and loads relevant model
# e.g., if editing files in src/youtube_intelligence/, load youtube-pipeline.yaml
```

### Step 4: Create Update Workflow
Mental models should evolve. After each significant session:
```yaml
# Append to mental model:
learned:
  - date: 2026-02-04
    insight: "playlistItems API provides liked_at timestamps, myRating=like does not"
    confidence_delta: +0.1
```

## Acceptance Criteria
- [ ] Schema defined and documented
- [ ] At least 3 mental models created (trading, youtube, memory)
- [ ] Each model has 3+ principles, 3+ patterns, 2+ failure modes
- [ ] Models are valid YAML and parseable
- [ ] Integration hook loads relevant model based on file context
- [ ] Update workflow documented

## Artifacts
- `.claude/mental-models/schema.yaml`
- `.claude/mental-models/trading.yaml`
- `.claude/mental-models/youtube-pipeline.yaml`
- `.claude/mental-models/memory-system.yaml`
- `.claude/mental-models/infrastructure.yaml`
- `.claude/hooks/load-mental-model.py`

## Risks
- Over-engineering: Keep models lean, don't try to encode everything
- Staleness: Models must be updated or they become misleading
- Context cost: Loading too many models defeats the purpose
- Mitigation: Start with 3 models, measure usefulness before expanding
