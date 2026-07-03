---
slug: plan-with-opus-build-with-gemini
title: 'Plan with Opus, Build with Gemini: A Practical Guide to Mixed-Provider Workflows'
description: "Frontier models are hitting rate limits. Open models are catching up.\
  \ The winning strategy isn't choosing one \u2014 it's orchestrating the right model\
  \ for each step."
date: '2026-05-27'
tags:
- Mixed-Provider
- Model Orchestration
- Claude Opus
- Kimi
- Archon
readTime: 10 min
editorial: true
---

# Plan with Opus, Build with Gemini: A Practical Guide to Mixed-Provider Workflows

Anthropic's rate limits are tightening. Subscription output quality is reportedly degrading. And the frontier models (Claude Opus, GPT-4.5) cost 10x more per token than Kimi K2.6, DeepSeek, or Qwen.

The solution isn't abandoning frontier models. It's mixing them: use the expensive model where it matters, and the cheap model everywhere else.

This is the mixed-provider workflow. The rest of this post is how to build it.

---

## The Central Question

Where do you spend your frontier tokens?

Two hypotheses:

1. **Opus for planning, cheap model for implementation**: A thorough plan (files to touch, validation strategy, success criteria) lets a cheaper model implement reliably.
2. **Cheap model for planning, Opus for implementation**: The stronger model catches hallucinations and not-following-plan errors during self-review.

The answer is: **it depends on the task, and you should test it empirically.**

---

## The Architecture

A mixed-provider workflow has three layers:

### 1. Orchestration Layer

The orchestrator is the layer above the coding agent. It builds a DAG of steps, assigns a provider to each node, and manages work-tree isolation.

**Archon** is the reference implementation: per-node provider selection, git work-tree isolation, retry logic, and PR creation. Anthropic is now productizing this same layer as [dynamic workflows](/blog/claude-dynamic-workflows/). The key insight: **tooling gets replaced, but the orchestration layer doesn't.**

### 2. Provider Routing

Each node in the workflow gets a provider assignment:

- **Exploration**: Sonnet (cheap, high context)
- **Planning**: Opus (thorough, structured)
- **Implementation**: Kimi K2.6 or Gemini 3.5 Flash (cost-efficient)
- **Validation**: Opus (catches errors)
- **Design**: Gemini 3.5 Flash (fast, visual)

### 3. Artifact Handoffs

Provider switching breaks conversation continuity. You cannot continue the same agent session across providers. The solution: **markdown artifacts in a dedicated work-tree space.**

The planning node writes a plan.md. The implementation node reads it. The validation node reads both. Each node is a fresh agent session, bridged by files.

---

## The Reliability Reality

Kimi K2.6 is the weak link operationally:

- Frequent "tool edit failed" warnings
- API hangs (~1 in 4-8 runs)
- Weird multi-newline output

Codex is the only agent that reportedly doesn't crash. The Claude Agent SDK also crashes occasionally (subprocess crash → retry → guard).

**The harness must have built-in retry mechanisms.** Timeout + reset on hang, not just on failed tool edits.

---

## The Cost Math

- **Kimi Code**: $40/month, 5% of weekly limit on a multi-million-token stream
- **Anthropic subscription**: subsidized but rate-limited, reportedly degrading in quality
- **Gemini 3.5 Flash**: ~20% of weekly limit per single-file edit

The strategy: use Gemini for frontend design (fast, visual) + Opus/Kimi for content (accurate, structured). Avoid using Gemini for reasoning; it hallucinates facts.

Per-token pricing is only one slice of the bill. For the full stack, from token burn to maintenance overhead, see [what AI agents really cost in production](/blog/real-cost-ai-agents-production-2026/).

---

## What to Build

1. **Run a mixed-provider benchmark**: plan with Opus, implement with Kimi, validate with Opus. Measure quality, cost, and time.
2. **Add retry/guard logic**: timeout on API hangs, reset on subprocess crashes.
3. **Test additional models**: Qwen 3.6, DeepSeek, GLM 5.1, MiniMax.
4. **Design a "design vs. content" split**: Gemini for UI, Opus for logic.
5. **Build a private eval suite**: inputs + expected outputs, run against every new model release.

The model is the engine. The orchestrator is the driver. Invest in the driver.

---

*This post draws from Cole Medin's live benchmarks of mixed-provider Archon workflows and our own experience with multi-model routing.*