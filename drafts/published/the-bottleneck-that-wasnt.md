---
slug: the-bottleneck-that-wasnt
title: 710 Tasks and the Bottleneck That Wasn't
description: My task board had 710 open items and I was sure the holdup was me — the
  human reviewer. Then I actually counted. My real decision queue was 69. Measure before
  you believe.
date: '2026-07-16'
tags:
- Multi-Agent
- Automation
- Postmortem
readTime: 5 min
editorial: true
ctaHook: Why "the human is the bottleneck" is the most expensive assumption in an
  agent system, and the five-minute query that disproves it.
---

# 710 Tasks and the Bottleneck That Wasn't

My agent swarm shares a task board. Agents pick up work, do it, mark it done. Simple. Except
one morning the board showed **710 open items**, and I had a story ready for why: the bots
generate faster than I can review, so everything piles up behind me. The human is the
bottleneck. Obviously.

I was about to go build a fancier review queue to fix my supposed slowness when I did the
thing I should have done first. I counted.

## The five-minute query that killed my assumption

"Open" is a single word hiding several different situations. So I cohorted the 710 by the
actual reason each item was still sitting there:

| Cohort | Roughly | Whose problem |
|---|---|---|
| Worker failed (crashed, or exited without reporting done) | ~55% | Reliability |
| Stale cruft from an old migration, never triaged | ~25% | Nobody's — delete it |
| Genuinely waiting on me to decide something | **69** | Mine |
| Blocked on another task | the rest | Sequencing |

Sixty-nine. My real decision queue, the set of things that actually could not move without a
human, was **69 items out of 710**. The other ninety-plus percent had nothing to do with me.
The biggest single slice was workers dying mid-task, and the next was landfill from a
migration months earlier that no one had ever swept. Not a queue. Sediment.

## What the failures actually were

Two signatures accounted for most of the dead workers:

- **"Exited cleanly without reporting done."** The agent finished its work and then just...
  stopped, without calling the one function that marks the task complete. The system correctly
  counted that as a failure. The work may even have happened, but nothing recorded it. One
  protocol bug, dozens of stuck tasks.
- **"Iteration budget exhausted."** Tasks too big for one worker to finish in its turn budget.
  The fix here is not bigger budgets, which just burns more tokens hitting the same wall. It's
  decomposition: break the task down so each piece fits.

Neither of those is a review problem. Both were invisible because "open" looked like one
undifferentiated pile, and the pile *felt* like it was my fault.

## The lesson worth stealing

The most expensive assumption in an autonomous system is the one you never check because it
flatters your mental model. "The human is the bottleneck" felt true, so I almost spent a day
building the wrong fix for it.

Three habits that came out of it:

1. **Cohort before you conclude.** A single status like "open" or "blocked" is a category, not
   a cause. The five-minute query that splits it by *why* is worth more than the dashboard that
   shows you the total.
2. **The real queue is smaller than the scary number.** Mine was 69, not 710. Find the number
   that's genuinely yours before you redesign your life around the one that isn't.
3. **Silent worker death is the default failure mode.** Agents don't usually crash loudly. They
   finish-and-forget, or hit a wall and sit. If you're not measuring completion as a distinct
   thing from "didn't error," you're not measuring it at all.

I still owe my board a real reliability fix: the report-on-completion bug, the decomposition
routing, a broom for the migration sediment. But at least now I'm building the fix for the
problem I *have*, not the one that happened to make me the hero of the story.
