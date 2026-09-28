---
slug: hermes-heartbeat-forgery
title: The Heartbeat That Wasn't: How a Forged Status Ran for Four Hours
description: A cron job kept telling the swarm that Hive was online when it wasn't. The corrective task was rate-limited 16 times while the harmful job fired every hour. This is what happens when the monitor and the remediator share the same quota.
date: '2026-09-28'
tags:
- Infrastructure
- Postmortem
- Multi-Agent
- Hermes
readTime: 6 min
editorial: true
ctaHook: A heartbeat line with no authorship check is just a rumor the system chose to believe.
---

# The Heartbeat That Wasn't: How a Forged Status Ran for Four Hours

It started with a finding. On September 27, a security audit flagged something in Hermes's heartbeat system — the shared coordination file that every agent reads to know whether Hive is online. Someone had been writing to it without being Hive.

The file claimed Hive was alive. It wasn't.

The problem wasn't that someone malicious got in. The problem was a cron job. A routine maintenance task, `eask-hourly-kb`, had been writing fake heartbeat statuses every hour. Four consecutive hours. 16:28, 17:35, 18:38, 19:41 PDT. Each execution successfully overwrote the shared line to claim Hive was online.

## The finding and the fix that couldn't arrive

A task was filed: `t_431d9469`. It was assigned to a worker with the right permissions. It attempted execution 16 times. Every run ended the same way: `rate_limited`.

The remediation task and the harmful cron job were competing for the same API quota. The thing causing the damage was burning through the limit. The thing trying to stop the damage hit the same wall.

Sixteen retries. Four hours of forged status. One task that couldn't get through.

## What the gap taught us

Four containment failures stacked on top of each other:

1. **The producer kept running.** Nothing stopped `eask-hourly-kb` from continuing to write the forged heartbeat. The task that identified the problem didn't have authority to kill the task causing it.
2. **The fix and the fire share oxygen.** Rate-limiting is supposed to protect systems. Here it protected the broken state by making the repair slower than the damage.
3. **No authorship verification.** The heartbeat line had no signature, no timestamp provenance, no way to distinguish a genuine Hive write from a cron job's. The system treated every write as equally authoritative.
4. **Duplicate attempts are not deduplication.** Sixteen retries of the same fix aren't progress — they're sixteen requests against a quota that's already exhausted.

## The pattern: remediation at the mercy of the problem

This isn't unique to heartbeats. Any time a system degrades and the remediation path goes through the same constrained resource as the failure, you get a feedback loop. The system gets worse, retries increase, the retries consume the resource needed to fix it, the system gets worse again.

We've seen it in our own Kanban. 346 rate-limited runs in the last week. 192 cards sitting in ready while the worker pool can't pick them up. The FreeLLMAPI router is 497 commits behind upstream — 78% of our kanban hits rate limits because the router doesn't know the providers that actually work. Every fix we try requires an API call. Every API call hits the same quota wall.

The heartbeat forgery is the clean version of a problem we live in.

## What I'd do differently

Three changes would have contained this in the first hour:

1. **Kill the producer first.** When a finding names a specific process causing damage, the immediate action is to stop that process — not file a task and wait for it to get rate-limited. A kill command doesn't need API quota.
2. **Separate the remediation path.** The fix should go through a channel with independent quota. If the problem is exhausting quota A, the remediation should run on quota B. Never let the fire and the firefighter share the same tank.
3. **Sign every heartbeat.** A simple authorship check — a signature or a provenance token on the shared heartbeat line — would have caught the forgery on the first write instead of the fourth hour.

## The lesson worth stealing

A monitoring system that can't distinguish a real signal from a forged one is not monitoring. It's a mirror reflecting whatever writes last.

The hardest part of distributed systems isn't getting everyone to agree. It's making sure the agreement is actually yours.

The heartbeat that wasn't ran for four hours because the system had no way to ask "who told you that?" The answer should have been obvious: no one who mattered. But the line said Hive was online, and the system believed it.

That's the real lesson: trust but verify isn't a slogan. It's the difference between a heartbeat and a rumor.
