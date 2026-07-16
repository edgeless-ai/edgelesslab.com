---
slug: six-dispatchers-where-one-is-law
title: Six Dispatchers Where One Is Law
description: My agent swarm had exactly one rule about who assigns work. The config
  said so. The runtime disagreed six ways. On why observability isn't the same as
  reconciliation.
date: '2026-07-09'
tags:
- Multi-Agent
- Infrastructure
- Automation
readTime: 6 min
editorial: true
ctaHook: The difference between a dashboard that shows you drift and a system that
  refuses to let it happen.
---

# Six Dispatchers Where One Is Law

There's a rule in my swarm that I consider load-bearing: exactly one agent is allowed to
assign work off the shared task board. One dispatcher, on a fixed tick, with a hard cap on
how many jobs go out at once. That rule exists because the alternative — several agents all
grabbing from the same queue at once — once melted the machine under a stampede of workers.
It's not a preference. It's scar tissue.

Last week I went looking for why a bot had been spawning duplicate workers, and found that
my one-dispatcher rule was being enforced by four dispatchers. Plus a global default that
made it five. Plus two external jobs poking the same queue on their own schedules. The
config file still said, in a comment I'd written myself, "this is the only dispatcher." The
runtime had quietly stopped agreeing months ago.

## How a rule drifts without anyone breaking it

Nobody disabled the lockdown. That's the unsettling part. Each individual change was
reasonable in isolation — a new agent got the same default as the others, a global setting
flipped to the permissive value during an unrelated migration, a helper job got added to
"keep the queue moving." No single step was wrong. The invariant died by a thousand
defaults.

This is the failure mode that documentation is worst at catching. The doc describes the
world as it was true when someone wrote it down. It has no idea the world moved. And the
more confidently the doc asserts the rule ("this is the ONLY dispatcher"), the more it lulls
you — because you read the assertion and stop checking the fact.

## Why a dashboard wouldn't have saved me

Around the same time, I was designing an observability layer for the swarm — a single view of
every scheduled job, what it consumes, what it produces. The obvious pitch: *make the drift
visible.*

But visibility would not have prevented this. A dashboard would have *shown* me six dispatch
surfaces — as six healthy green rows. Six things running, all reporting fine, none of them
aware that five of them shouldn't exist. Seeing the drift and knowing it's wrong are
different problems.

What catches this is not a picture. It's **reconciliation**: a declared state ("one
dispatcher, named X") and an observed state (discovered by reading what's actually
scheduled), continuously compared, with the difference treated as an alarm. Not "here is
everything that runs" but "here is everything that runs *that shouldn't*, and everything
that should run *and doesn't*."

A dashboard answers "what is happening." A reconciler answers "what is wrong." Those are not
the same product, and confusing them is how you end up with a beautiful, honest view of a
system that's quietly out of policy.

## The fix, and the guard

The fix took ten minutes: turn the four extra dispatchers off, one at a time, verifying the
one true dispatcher stayed up between each change. Reversible, boring, done.

The part that matters took longer and is worth more: I wrote the check that makes this drift
loud forever. A tiny preflight that reads every profile's config, confirms exactly one is a
dispatcher and it's the right one, and fails otherwise. It isn't clever. It's twenty lines.
But it converts "a rule I believe is true" into "a rule the machine re-verifies on demand" —
and that's the only kind of rule that survives contact with a system that keeps changing
underneath you.

## The lesson worth stealing

Every invariant you care about will drift toward the permissive default unless something
actively pushes back. Three habits that came out of this:

1. **A comment is not an enforcement.** If a rule matters, write the check that fails when
   it's violated. Documentation describes; a guard defends.
2. **Reconcile, don't just observe.** The valuable question isn't "what's running" — it's
   "what's running that my declared intent says shouldn't be." Build the second one.
3. **Every incident should leave a guard behind.** The fix that only fixes today is half a
   fix. The one that also makes the failure loud next time is the whole thing.

I still have one dispatcher. Now I have a way to know it, instead of a comment that hopes so.
