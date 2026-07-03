---
slug: one-file-memory-system
title: The One-File Memory System That Changed How I Use Claude
description: You shouldn't have to re-explain your stack every session. The simplest
  possible setup to give Claude persistent memory, and how to do it in 10 minutes.
date: '2026-03-26'
tags:
- Claude Code
- Productivity
- Memory
readTime: 4 min
productSlug: claude-memory-kit
editorial: true
ctaHook: The CLAUDE.md template, memory taxonomy, and session initializer from this
  setup.
---

# The One-File Memory System That Changed How I Use Claude

Every session, I used to start the same way. "We're using TypeScript, not JavaScript." "Don't use default exports." "The API is in `src/api/`, not root." "We already tried Redis here and it didn't work."

Five minutes of throat-clearing before any real work happened. Every. Single. Session.

Then I set up a memory file, and that problem disappeared.

## The Pain Point

Claude Code is stateless by design. Every session starts fresh. There's no session history, no learned preferences, no memory of last week's architecture decision. This isn't a bug; it's a consequence of how the model works. But it creates real friction.

The compounding effect is the worst part. Every correction you make in one session is a correction you'll make again next week. You're not building on previous sessions; you're re-establishing context every time.

This is especially painful with project-specific knowledge: "Don't touch the authentication middleware, it's under active refactor." "The staging database is read-only." "We deploy from the `release` branch, not `main`."

## The Simplest Possible Fix

Claude Code reads a file called `CLAUDE.md` at session start. That's the hook. Put things in that file that Claude should always know, and it will always know them.

A minimal `CLAUDE.md` solves 80% of the problem:

```
# Project: My App

## Stack
- TypeScript (strict mode), React 19, Next.js 16
- Postgres via Drizzle ORM
- Vitest for tests (no Jest)
- Tailwind CSS

## Conventions
- No default exports
- API lives in src/api/
- Tests colocated with source files

## Don't Do
- Don't use mocks in integration tests; hit the real DB
- Don't add inline styles; use Tailwind classes
```

That's it. Three sections. Less than 20 lines. Claude reads it at session start and you never repeat those instructions again.

## The Before/After

**Before memory:**
> Me: "Let's add a new API endpoint."
> Claude: *writes a JavaScript file with a default export and Jest tests*
> Me: "TypeScript, no default exports, Vitest please."
> Claude: *rewrites*
> (Repeat every session)

**After memory:**
> Me: "Let's add a new API endpoint."
> Claude: *writes TypeScript, named exports, Vitest tests, in `src/api/`*
> (Never needs to be said again)

After a month of accumulated memory, I tracked roughly 60% fewer correction cycles per session. Not a formal benchmark, just counting how often I typed "I already told you that."

## The Memory File Pattern

A single `CLAUDE.md` works. But once you start accumulating more context, a simple structure helps.

The pattern I use across projects on this system (documented in detail in the [Claude Memory Kit](/products)):

**User memory**: who you are and how you work. Goes in your home directory CLAUDE.md so it follows you across every project. Things like: "I'm a backend engineer who's new to React. Explain frontend patterns using backend analogies."

**Feedback memory**: corrections that stick. When Claude does something wrong and you correct it, add that correction to a memory file. It becomes permanent. "Don't use try-catch in React components; use error boundaries."

**Project memory**: architecture decisions, frozen APIs, deployment conventions. Project-specific.

**Reference memory**: where things live. "Staging environment: staging.myapp.com. Admin dashboard: Linear workspace 'Platform'."

## Set It Up in 10 Minutes

1. Create `CLAUDE.md` in your project root
2. Add your stack, 3-5 conventions, and 2-3 "never do this" rules
3. Start a new Claude Code session (it will read the file automatically)
4. For the first few sessions, notice when Claude gets something wrong. Add that correction to the file
5. After a week, the file has become a trained reflex

The free version of the [Claude Memory Kit](https://github.com/edgeless-ai/claude-memory-kit) includes templates for all four memory types and a starter CLAUDE.md structure. If you want stack-specific libraries and multi-project memory patterns, the [Pro version](/products) covers those.

## One More Thing

Memory files do accumulate cruft. Review monthly. Archive anything that's no longer true. Keep each file under 200 lines. Memory that's too long wastes context window on stale instructions.

The discipline: when you update your architecture, update your memory file the same day. It takes 30 seconds, and it means next session Claude already knows.

That 10-minute setup has probably saved me 10 hours over the past few months. It's the highest-leverage thing I've done to improve how I work with Claude Code.

Read the longer technical version in [How Claude Code Memory Actually Works](/blog/how-claude-code-memory-works) if you want the full breakdown of the four memory types.