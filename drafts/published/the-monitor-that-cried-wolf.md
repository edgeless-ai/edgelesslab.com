---
slug: the-monitor-that-cried-wolf
title: The Monitor That Cried Wolf
description: My health monitor paged me about three dead services. All three were fine.
  The monitor was measuring the wrong thing and calling its own blind spot an outage.
  Verify the measurement before you chase the symptom.
date: '2026-07-12'
tags:
- Infrastructure
- Observability
- Postmortem
readTime: 5 min
editorial: true
ctaHook: The most dangerous failure in a monitoring system isn't a missed alert — it's
  a confident one that's wrong.
---

# The Monitor That Cried Wolf

I built a health monitor for my agent swarm so I'd stop finding out about outages from the
silence. It worked. One morning it paged me: three model providers **down**, red across the
board. I rolled up my sleeves to go fix an infrastructure fire.

There was no fire. All three providers were up and serving. The monitor was the thing that
was broken — and it had been broken in the most expensive way a monitor can be: not silent,
but *confidently wrong*.

## How a monitor lies with a straight face

The check was simple, which was the problem. It fetched each provider's model list and
counted a non-empty response as "healthy." Reasonable, until you look at *how* it fetched.

One provider blocks requests that don't send a browser-like user agent. My monitor sent a
bare scripting user agent, got a `403`, and dutifully recorded "down." The provider was
answering every real request from my agents perfectly the whole time. The only thing that
couldn't reach it was the monitor.

Another was "down" because its health endpoint was tiered behind a plan the monitor's key
didn't have — a `402`, not an outage. A third was rate-limiting the *monitor's* aggressive
polling specifically, which the monitor scored as the service failing.

Three different measurement bugs, all rendered identically: a red box that said DOWN when the
truth was "my probe couldn't see." A monitor that can't distinguish "the service is failing"
from "I failed to measure the service" isn't observability. It's a random number generator
with strong opinions.

## The category error underneath it

The bug wasn't any one of those user agents or keys. It was a missing third state.

My monitor had two outcomes: **UP** and **DOWN**. Reality has three. The one it was missing is
**UNKNOWN** — "I could not obtain a valid measurement." A `403` from a user-agent block, a
`402` from a plan gate, a timeout on my own overloaded prober: none of those are evidence the
service is down. They're evidence *I don't know*. Collapsing "I don't know" into "it's down"
is what turned a measurement gap into a 6am false alarm.

And the inverse is just as dangerous. A monitor that collapses UNKNOWN into UP — "no error, so
it's fine" — is the one that stays quiet while something burns. The absence of a successful
measurement is not a passing grade. It's a question mark, and it has to render as one.

## The fix: make the probe prove itself first

I didn't start by fixing the providers. I fixed the probe's honesty:

1. **Three states, always.** Every check returns UP, DOWN, or UNKNOWN. UNKNOWN never counts as
   either a pass or a failure — it counts as "go verify the probe."
2. **Distinguish transport from service.** A `403`/`402`/timeout on the *probe's* connection is
   an UNKNOWN, not a DOWN. Only a valid response that shows the service misbehaving is a DOWN.
3. **Probe the way the real client does.** If my agents reach a provider with a browser user
   agent, the monitor uses the same one. A health check that takes a different road than
   production traffic is measuring a road nobody drives.

The red boxes went away because the services were never down. What had been down, the whole
time, was my ability to see them — and the monitor was too sure of itself to admit it.

## The lesson worth stealing

Before you chase the symptom a monitor reports, verify the *measurement*. A surprising number
of "outages" are the observer tripping over its own feet.

- **A monitor needs an "I don't know."** Two-state health (up/down) forces every blind spot
  into a lie. The third state is what keeps it honest.
- **Confident and wrong beats silent and wrong — for finding the bug, and for wasting your
  morning.** A false DOWN costs you a scramble; a false UP costs you an outage. Design against
  both by refusing to guess.
- **Measure along the production path.** If the probe authenticates differently, routes
  differently, or throttles differently than real traffic, it's testing a system you don't
  run.

My monitor still watches the swarm. It just earned the right to page me by first proving it
can tell the difference between a dead service and a blind probe.
