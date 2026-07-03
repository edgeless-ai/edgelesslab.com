---
slug: the-hook-that-saved-my-codebase
title: The Hook That Saved My Codebase
description: A single Claude Code hook prevented a cascading rm -rf from wiping source
  files. The damage-control pattern, and 3 hooks you can steal today.
date: '2026-04-03'
tags:
- Claude Code
- Hooks
- Developer Tools
readTime: 5 min
productSlug: hooks-deep-dive
isLaunch: true
editorial: true
ctaHook: 10 production hooks, composition patterns, and the damage-control system
  from this post.
---

# The Hook That Saved My Codebase

At 2am on a Tuesday, I ran a deploy script. The script did three things: delete the old build artifacts, copy new ones from the output directory, and stage the changes for git. One command, piped together.

The problem: the cleanup step was `rm -rf _next` and the staging step referenced `src/`. A Claude Code hook called `damage-control.py` saw both tokens in the same command scope and blocked execution. The hook's logic is simple: if a destructive operation (`rm -rf`, `git reset --hard`, `git clean -f`) appears alongside a source directory reference, halt and warn.

That night it prevented nothing catastrophic. The command would have worked fine. But the hook doesn't care about intent; it cares about blast radius. And the one time it does catch a real mistake, it pays for itself permanently.

## What Hooks Actually Are

Claude Code hooks are shell commands that fire on specific events: before a tool runs, after a tool runs, when a notification triggers. They're configured in `.claude/settings.json` and execute in order. If any hook exits non-zero, the operation is blocked.

Think of them as git hooks, but for your AI coding assistant. Every file write, every bash command, every edit passes through your hook pipeline before it executes.

## The 3 Hooks You Should Steal

**1. Damage Control**: Blocks destructive shell commands that reference source directories. Pattern-matches against a deny list (`rm -rf`, `git checkout .`, `git clean`) and an asset list (`src/`, `lib/`, `app/`). If both match in the same command, block it.

The implementation is around 40 lines of Python. It parses the command string, checks for deny-list tokens, checks for asset-list tokens, and returns exit code 1 if both are present. No ML, no heuristics. Just string matching that works.

**2. Verify Completion**: Runs when a task is marked as done. Checks that tests pass, that the build succeeds, and that the stated changes actually exist in the diff. Prevents the "I'm done" problem where an agent claims completion but left broken code.

This is the hook that changes behavior most. When an AI agent knows its "done" claim will be verified, it front-loads the verification itself. The hook rarely fires because its existence changes the agent's approach.

**3. Pre-Commit Guard**: Scans staged files for secrets patterns (`.env` values, API keys, private keys) before any commit. Uses regex patterns against common secret formats. Catches the "I accidentally committed my OpenAI key" scenario before it reaches git history.

## Beyond Safety: Hooks as Workflow

Hooks aren't just guardrails. The session initialization hook loads memory context at conversation start. The memory flush hook persists important context before the conversation compresses. The cost tracking hook logs token usage per tool call.

The pattern: anything you'd tell the AI to "always do" or "never do" should be a hook, not a prompt instruction. Prompt instructions get forgotten as context compresses. Hooks execute every time, mechanically.

## The Deep Dive

The [Hooks Library](/products) covers 24 hooks across 6 categories. The [Hooks Deep Dive](/products) goes further: 15 advanced hooks with full walkthroughs, composition patterns for chaining hooks together, and the production configurations we actually run. Both are available on the [products page](/products).

The hooks that matter most aren't the clever ones. They're the boring ones that run thousands of times and catch the one mistake that would have cost you a day of work.