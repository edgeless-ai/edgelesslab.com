---
slug: how-claude-code-memory-works
title: How Claude Code Memory Actually Works
description: Claude forgets everything between sessions. File-based memory fixes that.
  The simplest setup, and why it changes how you work with AI.
date: '2026-03-21'
tags:
- Claude Code
- Memory
- Developer Tools
readTime: 6 min
productSlug: claude-memory-kit
editorial: true
ctaHook: CLAUDE.md template, 4-type memory taxonomy, and the session initializer script.
---

# How Claude Code Memory Actually Works

Every Claude Code session starts the same way: a blank slate. No memory of yesterday's architecture decisions. No recall of your coding conventions. No idea that you spent three hours debugging that OAuth flow last week.

This is the single biggest friction point in AI-assisted development. Not model capability. Not context windows. Memory.

## The Problem Is Structural

Claude Code reads instructions from a file called `CLAUDE.md` at the start of every session. That's it. There's no built-in persistence layer. No session history. No learning from past interactions.

So every session, you repeat yourself: "We use TypeScript, not JavaScript." "The API lives in `src/api/`, not `api/`." "Don't use default exports." "We already tried approach X and it failed because Y."

This isn't a minor annoyance. It's a compounding tax on every interaction.

## File-Based Memory Fixes This

The fix is structured markdown files that Claude reads automatically at session start — the same idea behind [the one-file memory system](/blog/one-file-memory-system/), scaled up.

No databases. No vector stores. No infrastructure. Just files in your repo that Claude already knows how to read.

The memory system layers on top of Claude Code's built-in `CLAUDE.md` hierarchy. Claude loads these files automatically. You don't need plugins or configuration.

## The 4 Memory Types

Running this pattern in production across multiple projects, I've landed on four memory types that cover everything I've needed.

### 1. User Memory

Who you are and how you work. Follows you across every project.

```yaml
name: User Role
type: user
---
Senior backend engineer, 8 years Go.
New to React frontend in this project.
Prefer explanations mapping frontend concepts to backend analogues.
```

### 2. Feedback Memory

Corrections that stick. The highest-value memory type. Every correction makes every future session better.

```yaml
name: No mocking in integration tests
type: feedback
---
Integration tests must hit a real database, not mocks.
Why: Mocked tests passed but prod migration failed last quarter.
```

### 3. Project Memory

Architecture decisions, conventions, and infrastructure specific to one codebase.

```yaml
name: API Migration Freeze
type: project
---
No breaking API changes until 2026-03-15 (mobile release cut).
Any endpoint modifications must be backwards-compatible.
```

### 4. Reference Memory

Pointers to where things live. Tools, APIs, dashboards.

```yaml
name: Bug Tracker
type: reference
---
Production bugs: Linear project "PLATFORM"
Feature requests: Linear project "ROADMAP"
Design specs: Figma workspace "Product Design 2026"
```

## What Changes in Practice

With memory in place, sessions start differently. Instead of 10 minutes of context-setting, you jump straight into the work.

Claude remembers that your test suite uses Vitest, not Jest. It knows the deploy script is at `scripts/deploy.sh`, not `deploy.sh`. It recalls that you tried Redis caching last month and hit connection pooling issues.

After a month of accumulated feedback memory, Claude makes roughly 60% fewer mistakes that require correction. That's not a benchmark; that's from tracking corrections across my own projects.

## The Maintenance Problem

Raw memory files work, but they accumulate cruft. Outdated entries. Contradictory instructions. Files that grow past useful size.

The discipline: review monthly, archive aggressively, keep each file under 200 lines. Memory that's too long defeats the purpose; Claude spends context window on stale instructions instead of your actual task. At swarm scale the same neglect compounds into [a knowledge base your agents can't even see](/blog/kb-audit-circulation/).

## Get Started

I've open-sourced the base memory kit with templates for all four memory types, a starter CLAUDE.md structure, and setup instructions.

**Free:** [Claude Memory Kit on GitHub](https://github.com/edgeless-ai/claude-memory-kit)

The free version covers 90% of use cases. For production patterns including stack-specific libraries (React/Next.js, Python/FastAPI, Go, Rails, Rust), multi-project memory architectures, and CLAUDE.md templates:

**Pro ($29):** [Claude Memory Kit Pro on Gumroad](https://edgelessai.gumroad.com/l/claude-memory-kit)

The best time to set up memory is before your next session. Takes 15 minutes, saves hours every week.