---
slug: the-router-that-timed-out-on-everything
title: The $0 Router That Timed Out on Everything
description: A free local model router answered every health check and hung on every
  real request. Why the cheap measurement lies, and why "responds to a ping" is not
  the same as "works."
date: '2026-07-05'
tags:
- Infrastructure
- AI
- Multi-Agent
readTime: 5 min
editorial: true
ctaHook: How to tell a healthy service from one that only looks healthy — and why
  free infrastructure fails in the gap between the two.
---

# The $0 Router That Timed Out on Everything

I run a lot of agents on free inference. One of the cheapest tricks in the stack is a
self-hosted router that fans requests across a dozen free model providers and hands back
whichever answers first. When it works, it's magic: real generation at no marginal cost.

Last week it stopped working, and it took me embarrassingly long to see it — because it
never went *down*. It stayed up the entire time. It just stopped doing the one thing it
existed to do.

## The symptom that wasn't

The bot that depends on it went quiet. No errors in the channel, no alerts, no crash. I
did what everyone does first: I checked if the router was alive.

```
GET /v1/models  → 200 OK, 62 models
```

Green. Healthy. Serving. I moved on and looked everywhere else for an hour — the bot's
code, its token, its channel permissions — before I came back and actually asked the
router to *generate something*.

```
POST /v1/chat/completions  → hang … hang … 429
```

Every model. Not just the one I wanted — deepseek, the fast ones, the big ones, all of
them. The router was answering the cheap question ("are you there?") perfectly and failing
the expensive one ("can you do work?") completely.

## Why the ping lies

A health check that only proves the process is listening is worse than no health check,
because it actively teaches you the wrong thing. `GET /models` reads a static list from
memory. It says nothing about whether the thing behind it — the pool of upstream providers,
the connection budget, the rate-limit accounting — is exhausted. Under sustained load, all
of that had quietly tipped over, and the only surface that reflected reality was the one I
wasn't watching.

The tell, in hindsight: the failure mode was *global*. When one specific model 429s, that's
a provider rate limit. When *every* model hangs the same way, the problem isn't upstream —
it's the thing in front of them. A restart of the container cleared it for a few minutes,
then it choked again. That's not a rate-limit window. That's a component that can't sustain
the load it's being asked to carry.

## The fix, and the better default

The immediate fix was to stop asking the free router to do the heavy lifting and route real
generation to a provider whose free tier is *reliable* under load — one that hosts the same
model I'd already chosen, so quality didn't change, only the road it traveled. Generation
went from "hangs for five minutes then fails" to "answers in sixty seconds," and the bot
came back to life.

But the durable fix wasn't the provider swap. It was changing what "healthy" means.

The router's heartbeat now has to survive the expensive question, not the cheap one. If a
component's whole job is to complete requests, then "it completed a request recently" is the
only heartbeat that counts. Anything less — a ping, a listening port, an uptime number — is a
green light wired to the wrong sensor.

## The lesson worth stealing

Free infrastructure rarely fails by falling over. It fails in the gap between *responds to a
ping* and *sustains real work* — and that gap is exactly where a lazy health check will lie
to you.

Three things I do now on anything I don't pay for:

1. **Measure the promise, not the process.** If the job is "generate," the probe generates.
   If the job is "post," the probe checks that something posted. Uptime is not a promise kept.
2. **Read the shape of the failure.** One thing failing is a specific problem. *Everything*
   failing the same way is almost always the layer in front of them.
3. **Absence of an error is never green.** A quiet channel and a passing ping are not
   success. They're the two most common disguises failure wears.

The router still runs. It's still free. I just don't trust it to tell me it's fine anymore —
I trust the work, or the lack of it.
