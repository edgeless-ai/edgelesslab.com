---
slug: the-7-second-duplicate
title: "The 7-Second Duplicate: How One Program Became 19 Cards"
description: "Two cards with the same title landed on my kanban board seven seconds apart. By midnight the swarm had turned one trading program into nineteen tasks — and one of them was still running a month later. The same failure happened twice that night: the state file counted reserves twice, and the board counted the program twice."
date: '2026-07-10'
tags:
- Multi-Agent
- Automation
- Postmortem
readTime: 5 min
editorial: true
summary: "Two cards with the same title landed on my kanban board seven seconds apart. By midnight the swarm had turned one trading program into nineteen tasks — and one of them was still running a month later."
ctaHook: Duplicates are the quiet killer of autonomous systems. They don't crash anything; they just make everything lie.
---

# The 7-Second Duplicate: How One Program Became 19 Cards

Two cards with the same title landed on my kanban board seven seconds apart. By midnight, the swarm had turned one trading program into nineteen tasks — and one of them was still running a month later.

The failure wasn't a crash. Nothing went red, nothing timed out. The system just quietly believed it had more work than it did, and one of its "running" tasks was a corpse wearing a heartbeat.

## The double-spawn

On the evening of July 8, I asked the swarm to run a trading alignment program: fix the equity math, unify the dashboard, gate executions on expectancy, wire the COT scanner into execution, quiet the noisy cron cycles, and run the ORB strategy variants head-to-head. A clear program with a clear scope.

The decomposer turned it into a parent card at 21:18:35. Seven seconds later, at 21:18:42, another parent card with the exact same title appeared. Nobody noticed. The board now had two cards claiming to own the same program.

The first decomposition was the good one. Seven well-scoped children — equity calc, dashboard, expectancy gate, COT wiring, cron silence, ORB tournament, reel filters — each with a concrete spec and acceptance criteria. They ran, they shipped, and one of them found a genuinely nasty bug.

## The real bug underneath

The equity calculation was double-counting. The state file added reserved cash on top of cash, then added it again inside total equity. Reported equity was:

cash + reserved + positions

when it should have been:

cash + position mark values + realized PnL

Six files carried the wrong arithmetic, and the dashboard had been showing a number that was too big — plausibly too big, which is the dangerous kind of wrong. The fix was a single source of truth: one canonical equity function, verified against the positions file and the per-exit P&L log.

While they were in there, the batch did the other scoped work properly. The win-rate display was replaced with expectancy — (WR × avgWin) − (LR × avgLoss) — with a hard gate that blocks deployment when rolling expectancy goes negative. The COT scanner was still chewing on a cache from June 11, nearly a month of stale positioning data; it got refreshed and wired into execution. The ORB tournament ran seven variants head-to-head on identical history. The noisy cron cycles learned silence-when-flat.

That batch shipped. Real work, real numbers, properly scoped.

## Then the decomposer ran again

At 22:43 — while the good batch was still executing — the auto-decomposer processed both parent cards. It created ten more cards: five from the first parent, five from the second. Same five workstreams. Generic bodies: "Goal: fix equity calculation… Approach: review the current equity formula."

Ten cards duplicating work that was already in flight, from two parent cards that duplicated each other. The swarm didn't need the work — it had already shipped most of it. But the cards were real, they were assigned, and they started running anyway. Twenty-seven worker runs burned across the duplicates, most of them rediscovering fixes that had already landed.

And one of them never stopped. "Unify trading dashboard across platforms" — created 22:43:53, still marked running thirty days later. Three runs, no completion, no terminal call. A ghost task that keeps the board lying about what's actually happening.

## The fix

Three rules would have prevented the whole episode:

1. **Check the board before you decompose.** The decomposer's first question should be "does a card for this work already exist?" A title match within the last hour is a stop, not a go.

2. **One parent per program.** A program that appears twice is a duplicate, not an opportunity. The second card should have been archived at intake, before it could spawn anything.

3. **A running task needs a heartbeat.** Thirty days of "running" with no output is not running — it's a corpse. Reclaim it, or at least flag it.

## The lesson worth stealing

The same failure happened at two levels in one night. The state file counted reserved cash twice, and the board counted the program twice. Both inflated the system's sense of itself: equity looked bigger than it was, and progress looked busier than it was.

Duplicates are the quiet killer of autonomous systems. They don't crash anything; they just make everything lie. The fix is always the same: one source of truth, checked before you create another.
