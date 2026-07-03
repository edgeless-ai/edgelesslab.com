---
slug: swarm-tried-to-bankrupt-itself
title: The Night Our Swarm Tried to Bankrupt Itself
description: 'A field note from one night operating an autonomous AI agent swarm:
  a $50 overspend from a missing suffix, a dispatch storm that corrupted the database,
  and a task board that kept re-creating itself. Four root causes, four fixes.'
date: '2026-07-01'
tags:
- AI Agents
- Autonomous Systems
- Postmortem
- Cost Engineering
- Reliability
readTime: 9 min
editorial: true
---

# The Night Our Swarm Tried to Bankrupt Itself

We run an AI agent swarm — a couple dozen specialized agents that read, research, write, and ship, coordinated on a shared task board. Most nights it hums. One night it didn't, and the failure was educational enough to write down.

The short version: over a few hours, our own system burned $50 on a model it should never have touched, triggered a dispatch storm that corrupted its task database, and — the best part — kept re-creating every task we deleted, as if the to-do list were fighting to stay full. None of it was exotic. Every failure came from the same small family of mistakes, and that is the useful part.

## Names that quietly mean money

The $50 came first, and it came from a suffix.

Our agents can run on free model tiers or paid ones. On one provider, the *same endpoint* serves both — the only difference is a `:free` suffix on the model name. `model:free` is free. `model` is metered. An overnight config left the orchestrator — the busiest, always-on agent — pointed at the bare, paid name. It ran all night. Fifty dollars, gone, on nothing anyone asked for.

That is not a billing story. It is a naming story. The suffix carried a pricing decision that nothing enforced. And once we went looking, the pattern was everywhere:

- A custom provider named `nvidia` in our config silently collided with a built-in provider of the same name, so our free key was ignored and a different credential was used — 401s and retry storms.
- A model list written as a JSON *string* instead of a YAML *list* parsed as empty, and silently fell back to a hardcoded expensive default.

Three different bugs, one shape: **a name that carried meaning nothing checked.** A typo became a bill.

## The storm

Feeling good about the cost fixes, we tried to bring a cleaned-up task board live. We promoted a few hundred tasks to "ready" and let the fleet pick them up.

The fleet picked them *all* up. At once.

The agents are always-on and each claims work independently. The per-agent concurrency limit we thought we had was not enforced at claim time — so 300 ready tasks became roughly 190 workers spawning in seconds. The machine's load average went past 80. And ~190 processes hammering one SQLite database at once did exactly what you would expect: an index corrupted and the database went "malformed."

The data survived — the damage was an index, not the tables, and a `REINDEX` fixed it. But the lesson landed hard: **an unbounded queue plus unbounded claiming is a load bomb.** The fix was a hard, board-wide concurrency ceiling — a number the dispatcher physically cannot exceed, no matter how deep the queue.

## The board that wouldn't die

Then the strange one.

We cleaned the task board — it was 52% duplicate rows — deduplicated it, routed every task to the right specialist, archived the stale backlog. 2,907 tasks down to 950, properly organized. We verified it. It was clean.

We restarted the agents. The board went back to 2,907.

We cleaned it again. It came back again.

The board was *re-flooding itself*. Somewhere, a migration importer — the tool that had originally loaded tasks from our old system — was running again. And it was "idempotent" in the worst possible way: it skipped tasks already on the board, but happily *re-created any task whose record was gone*. So every time we deleted duplicates, the next run re-created them. Every time we archived the backlog, it came back. The original board had 33 copies of some tasks because the importer had run 33 times.

We never even found what kept triggering it — no cron, no scheduled job called it directly. The likeliest culprit was one of our own agents, autonomously picking up a stale "finish the migration" task and dutifully finishing it. Again.

The fix was not finding the trigger. It was accepting that in an autonomous system, **anything you leave runnable will eventually run.** The migration was done — so we made it *refuse to run*. A hard guard at the top of the importer: unless a human explicitly overrides it, it does nothing. That sealed the write path. We cleaned the board one last time, and it finally held.

## Four causes, not forty

Pull back and the whole night has four root themes, not forty bugs:

1. **Names carry unenforced meaning.** A `:free` suffix, a colliding provider name, a string where a list belonged — a one-character mistake becomes a bill or a breakage. *Fix: one validated door for config changes, so the bad shapes cannot be typed in.*
2. **Systems fail open and silent.** The paid fallback, the malformed database, the re-flood — none of them announced themselves. *Fix: a cost watchdog that scans every agent's config and alerts on any paid regression before it bills.*
3. **Unbounded concurrency is a load bomb.** *Fix: a hard, board-wide ceiling on running work.*
4. **Autonomous systems re-run whatever you leave runnable.** *Fix: when a migration is done, disable the tool — do not just stop calling it.*

We also moved paid model "strength" to exactly the few judgment agents where it is worth it, and left everything else on free tiers — deliberate spend, never accidental.

## The honest part

The uncomfortable takeaway: none of these were the AI being clever or going rogue. They were the AI being *obedient*. It faithfully ran the paid model it was pointed at. It faithfully claimed every task it was offered. It faithfully re-ran the migration it was told to finish. Every failure was the system doing exactly what it was configured to do — and the configuration carried meaning nothing was checking.

That is the real work of running an agent swarm. Not making the agents smarter. Making the environment they act in *legible* — so that "do exactly what I said" and "do what I meant" stop diverging at 3 a.m. while you sleep.

The board is clean now. The importer is sealed. The watchdog is running. And there is a ceiling on how much work can run at once, so the next time we go live, the worst case is arithmetic, not a fire.