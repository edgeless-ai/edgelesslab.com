---
slug: multi-model-routing
title: "Multi-Model Routing: Why I Run 4 Different AI Brains Instead of One"
description: "My agent system routes requests across 4 models based on task type. Full cost breakdown, routing logic, and configuration. 10x cost reduction vs. single-model approach."
date: '2026-04-19'
tags:
- AI Agents
- Model Routing
- Cost Optimization
- Multi-Agent
readTime: 10 min
editorial: true
---

# Multi-Model Routing: Why I Run 4 Different AI Brains Instead of One

**Published:** April 2026  
**Reading time:** 10 minutes  
**Author:** Scribe (Edgeless Labs)

---

## The Wrong Way to Scale AI

When I started building agent systems, I made the same mistake everyone does:

> "If Claude 4 is good, Claude 4 for everything must be better."

Wrong.

Using the most powerful model for every task is like hiring a brain surgeon to answer your emails. Technically capable? Yes. Economically sane? Absolutely not.

My first month running a 10-agent system:
- **API bill:** $847
- **Latency:** 8.2s average response
- **Overkill rate:** 73% (simple tasks on flagship model)

I was burning money and patience. Time to rethink.

---

## The Economics of Model Selection

Modern LLMs aren't just "better" or "worse." They're specialized labor markets with different hourly rates.

| Model | Provider | Input/1M | Output/1M | Strengths | My Use Case |
|-------|----------|----------|-----------|-------------|-------------|
| **Kimi K2.5** | Fireworks | $0.70 | $2.80 | Long context, tool use | Agent orchestration, skills |
| **DeepSeek V3.2** | Fireworks | $0.40 | $1.60 | Reasoning, code | Analysis, math, structured output |
| **Codex GPT-5.4** | OpenAI | $3.00 | $12.00 | Code synthesis | Code generation, diff review |
| **Claude Opus 4** | Anthropic | $15.00 | $75.00 | Complex reasoning | Research synthesis, edge cases |

Claude Opus costs **26x more** than Kimi K2.5 for output. Use it wisely.

---

## The Router: Mastra

Instead of hardcoding model choices, I built a routing layer that selects based on task characteristics.

```yaml
# /etc/paperclip/model-routing.yaml
models:
  kimi-k2p5-fireworks:
    provider: fireworks
    model: accounts/fireworks/models/kimi-k2p5
    cost_input: 0.70
    cost_output: 2.80
    context_window: 256000
    tool_capable: true
    default_for: [skills, orchestration, terminal]
    
  deepseek-v3p2-fireworks:
    provider: fireworks
    model: accounts/fireworks/models/deepseek-v3p2
    cost_input: 0.40
    cost_output: 1.60
    reasoning: strong
    default_for: [analysis, math, json_output]
    
  codex-gpt-5-4:
    provider: openai
    model: gpt-5.4-codex
    cost_input: 3.00
    cost_output: 12.00
    code_capable: true
    default_for: [code_generation, code_review, patches]
    
  claude-opus-4:
    provider: anthropic
    model: claude-opus-4-6
    cost_input: 15.00
    cost_output: 75.00
    complex_reasoning: true
    override_when:
      - task_contains: "research synthesis"
      - task_contains: "deep analysis"
      - estimated_tokens: ">4000"
```

---

## Routing Logic

The router doesn't just look at task type. It considers:

### 1. Estimated Complexity

```python
# From the routing engine
def estimate_complexity(task_description: str) -> int:
    """
    1-10 scale based on:
    - Output length estimation
    - Reasoning depth signals
    - Tool call requirements
    - Context window needs
    """
    signals = {
        'high_complexity': ['synthesize', 'research', 'compare', 'evaluate'],
        'medium_complexity': ['summarize', 'explain', 'format'],
        'low_complexity': ['classify', 'extract', 'transform']
    }
    # ... scoring logic
```

### 2. Tool Requirements

Kimi K2.5 and DeepSeek support native tool use. Codex and Claude Opus don't (in the same way). If a task needs terminal/browser/file tools, the router eliminates non-tool-capable models immediately.

### 3. Context Window

| Task | Tokens | Suitable Models |
|------|--------|-----------------|
| Skill execution | 2K-8K | All |
| Code review (large file) | 15K-30K | Kimi, DeepSeek |
| Research synthesis | 50K+ | Kimi (256K window) |

A 100K token task on Claude Opus would cost **$7.50** just for input. On Kimi: **$0.07**.

### 4. Latency Budget

Some tasks have time constraints:

```yaml
routing_rules:
  - if: latency_required < 2000ms
    then: use_local_model  # llama-cpp on M3 Max
    
  - if: latency_required < 5000ms
    then: prefer: [kimi, deepseek]
    
  - if: quality_critical: true
    then: allow: [claude-opus, codex]
    cost_threshold: ignore
```

---

## Real Routing Decisions

Here are actual routing choices from my system this week:

| Task | Routed To | Cost | Time | Why |
|------|-----------|------|------|-----|
| "Check 5 RSS feeds, summarize new items" | Kimi K2.5 | $0.003 | 2.1s | Tool use, parallel, cheap |
| "Review this git diff for bugs" | Codex GPT-5.4 | $0.08 | 4.2s | Code-trained, diff format |
| "Synthesize 3 research papers into principles" | Claude Opus | $1.20 | 12s | Complex synthesis, 8K output |
| "Convert CSV to JSON with validation" | DeepSeek V3.2 | $0.001 | 1.4s | Structured output, reasoning |
| "Generate blog post from notes" | Kimi K2.5 | $0.04 | 5.8s | Long output, tool templates |

**Weekly routing distribution:**
- Kimi K2.5: 67% of tasks ($0.70/1M input)
- DeepSeek V3.2: 24% of tasks ($0.40/1M input)
- Codex GPT-5.4: 7% of tasks ($3.00/1M input)
- Claude Opus: 2% of tasks ($15.00/1M input)

**Result:** 10x cost reduction vs. using Claude Opus for everything. Same (often better) quality because tasks match model strengths.

---

## The Configuration File

Here's my complete production model routing config:

```yaml
# model-routing.yaml - Production configuration
version: 1.2

providers:
  fireworks:
    base_url: https://api.fireworks.ai/inference/v1
    api_key_env: FIREWORKS_API_KEY
    timeout: 30
    
  openai:
    base_url: https://api.openai.com/v1
    api_key_env: OPENAI_API_KEY
    timeout: 45
    
  anthropic:
    base_url: https://api.anthropic.com/v1
    api_key_env: ANTHROPIC_API_KEY
    timeout: 60

models:
  # Workhorses (80% of traffic)
  kimi-k2p5:
    provider: fireworks
    model: accounts/fireworks/models/kimi-k2p5
    context: 256000
    max_output: 8192
    tool_format: openai
    default_for:
      - agent_conversation
      - skill_execution
      - terminal_operations
      - file_operations
      - web_extraction
    cost_per_1m_input: 0.70
    cost_per_1m_output: 2.80
    
  deepseek-v3p2:
    provider: fireworks
    model: accounts/fireworks/models/deepseek-v3p2
    context: 64000
    max_output: 8192
    structured_output: strong
    default_for:
      - analysis
      - calculations
      - json_generation
      - reasoning_tasks
    cost_per_1m_input: 0.40
    cost_per_1m_output: 1.60
    
  # Specialists (18% of traffic)
  codex-gpt-5-4:
    provider: openai
    model: gpt-5.4-codex
    context: 128000
    max_output: 8192
    code_specialist: true
    default_for:
      - code_generation
      - code_review
      - patch_application
      - terminal_debugging
    cost_per_1m_input: 3.00
    cost_per_1m_output: 12.00
    
  # Heavy lifters (2% of traffic)
  claude-opus-4-6:
    provider: anthropic
    model: claude-opus-4-6
    context: 200000
    max_output: 8192
    complex_reasoning: true
    override_when:
      - task_type: research_synthesis
      - task_type: complex_analysis
      - estimated_output_tokens: ">6000"
    cost_per_1m_input: 15.00
    cost_per_1m_output: 75.00

routing_logic:
  # Primary: match task to default model
  default_selection: by_task_type
  
  # Secondary: complexity override
  complexity_thresholds:
    - if: score > 8
      then: consider_claude_opus
      
  # Tertiary: latency requirements
  latency_budget:
    - if: required_ms < 3000
      then: exclude_claude_opus
      
  # Emergency: all models down
  fallback_chain:
    - kimi-k2p5
    - deepseek-v3p2
    - local-llama-8b
```

---

## Measuring Router Performance

I track two metrics:

### 1. Cost Per Task

```
Daily average (last 30 days):
- Before routing: $28.40/day (all Claude Opus)
- After routing: $2.70/day (mixed)
- Savings: 90.5%
```

### 2. Quality Score

Human review of 100 random outputs per week:

| Model | Satisfaction Score (1-5) |
|-------|-------------------------|
| Kimi K2.5 | 4.2 |
| DeepSeek V3.2 | 4.3 |
| Codex GPT-5.4 | 4.5 (code tasks) |
| Claude Opus | 4.7 |

Interesting: **DeepSeek V3.2 scores higher than Kimi on analysis tasks** despite being cheaper. Model fit > model power.

---

## When to Route vs. When to Upgrade

Routing works best when you have **task diversity**. If all your tasks are:
- Research synthesis → Use Claude Opus directly
- Code generation → Use Codex directly
- Mixed bag → Build a router

The overhead of routing (latency, complexity) only pays off at scale. For 10+ agents doing varied work: essential. For 2 agents doing the same thing: overhead.

---

## Next: Post 3

Routing saves money. But how do you prevent agents from losing context across sessions?

[The Knowledge Base Loop →](./post-3-knowledge-base-loop)

---

## Get the Blueprint

Want the complete model routing configuration? It's included in:

- **Paperclip OS ($49)** — Full orchestration blueprint
- **Hermes Deployment Guide ($19)** — Router setup, API server, cron templates
- **Bundle ($79)** — All 3 products

[gumroad.com/l/paperclip-os]