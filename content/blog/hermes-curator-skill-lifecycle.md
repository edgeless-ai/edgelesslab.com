---
slug: hermes-curator-skill-lifecycle
title: 'Hermes Curator: The Agent That Cleans Up After Your Agents'
description: Nous Research shipped Hermes v0.12.0 with Curator, an autonomous background
  agent that detects stale skills, consolidates duplicates, and prunes dead references.
  Why it matters for multi-agent systems.
date: '2026-05-01'
tags:
- Hermes
- AI Agents
- Skill Management
- Multi-Agent
readTime: 4 min
productSlug: multi-agent-blueprint
editorial: true
ctaHook: The dispatch pattern, skill architecture, and reference implementations for
  building your own self-maintaining agent system.
---

# Hermes Curator: The Agent That Cleans Up After Your Agents

Nous Research just shipped Hermes Agent v0.12.0, and the headline feature solves a problem every multi-agent operator hits eventually: skill rot.

## The Problem

Hermes agents learn by creating skills. Every time an agent figures out how to do something new, it writes a skill file. Over weeks of operation, the skill library grows. And grows. And never shrinks.

We run [Hermes 24/7 on a VPS](/blog/ai-agent-never-sleeps-hermes-vps/) as part of our agent swarm at Edgeless. Before this release, our primary Hermes instance had accumulated 91 skills. Some were redundant. Some referenced patterns we'd deprecated months ago. Some existed because two agents independently learned the same thing and wrote separate skills for it. The skill metadata alone was consuming thousands of tokens per conversation, eating into useful context window for actual work.

There was no cleanup mechanism. Skills were write-only.

## What Curator Does

Curator is an autonomous background agent that runs on Hermes's cron scheduler. By default it cycles every 7 days. It does three things:

**1. Staleness detection.** Skills unused for 30 days get flagged as stale. Skills inactive for 90 days get archived. Archived skills are recoverable, not deleted.

**2. Consolidation.** When Curator finds overlapping skills (two skills that do roughly the same thing), it merges them. The result is one cleaner skill instead of two mediocre ones.

**3. Pruning.** Skills that reference deprecated tools, dead APIs, or patterns that no longer apply get archived with a classification of why.

Each run produces a structured report (`logs/curator/run.json`) and a human-readable summary (`REPORT.md`).

## Safety

The obvious concern: what if Curator archives something important?

Nous built defense-in-depth:
- **Bundled skills** (shipped with Hermes) are never touched
- **Hub-installed skills** (from the Hermes skill marketplace) are exempt
- **Pinned skills** — you can pin any skill to block Curator from modifying it
- **Archive-only** — nothing is deleted, everything is recoverable
- Curator only touches agent-created skills

## Why This Matters for Multi-Agent Systems

If you run one agent, skill rot is manageable. You can manually audit the skill list occasionally. But if you run a swarm — where multiple agents create skills independently, where worker-pull jobs generate context-specific skills, where [the self-improvement loop](/blog/agents-that-improve-themselves/) is constantly iterating — the skill library becomes a coordination problem.

Without Curator, you get:
- Token waste from bloated skill metadata in every conversation
- Routing confusion when multiple skills claim to handle the same task
- Stale skills that point agents toward deprecated patterns

With Curator, the skill lifecycle is closed: create, use, maintain, consolidate, archive. The library stays lean.

## CLI

Two commands:

```
hermes curator run      # Run a maintenance cycle manually
hermes curator status   # See skill rankings (most/least used)
```

Configuration lives under `auxiliary.curator` in the Hermes config. The Curator model is selectable separately from the primary agent model, so you can run it on a cheaper model.

## What Else Shipped in v0.12.0

The Curator was the headline, but v0.12.0 also included:
- Rubric-based self-improvement (replacing free-form review)
- New inference providers
- Native Spotify and Google Meet integrations
- 57% reduction in TUI cold start time

## Our Take

We've been running Hermes since v0.6.0. The skill accumulation problem was real — we'd periodically do [manual audits of the skill directory](/blog/kb-audit-circulation/), which is exactly the kind of toil agents should handle. Curator formalizes what we were doing by hand.

We'll be enabling it on our production Hermes instance and reporting back on the first few cycles. The 30/90 day staleness windows feel right for our usage patterns, but we'll tune if needed.

---

*Edgeless Labs builds autonomous creative infrastructure. We run Hermes as part of our multi-agent swarm for intake, research, and knowledge operations.*