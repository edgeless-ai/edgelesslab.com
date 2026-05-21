---
slug: "spend-breaker-circuit-breaker-llm-costs"
title: "A Circuit Breaker Saved Me $200 in Tokens. It Took 45 Minutes to Build."
description: "One of my AI agents consumed 60% of its daily token budget in four hours. The circuit breaker throttled it automatically. Here's the pattern."
date: "2026-05-13"
tags:
  - "AI Agents"
  - "Cost Management"
  - "Circuit Breaker"
  - "Infrastructure"
readTime: "7 min"
editorial: true
---
# A Circuit Breaker Saved Me $200 in Tokens. It Took 45 Minutes to Build.

Last month, one of my Discord agents processed a backlog of 14 stuck tasks in a single session. It was doing exactly what it was supposed to do. It was also burning through tokens at six times its normal rate, and if I hadn't been watching the logs, it would have consumed its entire weekly budget by lunch.

I wasn't always watching the logs. The week before, a different agent had an extended conversation with itself about task prioritization that cost $47 and produced nothing actionable. I didn't find out until I checked the invoice.

Running LLM agents is like running a fleet of taxis with the meters always running. The drivers are competent. They go where you tell them. But nobody's watching the meter, and the routes get longer when nobody's looking.

I needed something that watched the meter automatically.

---

## The Problem: Silent Cost Spikes

LLM costs are uniquely invisible compared to other infrastructure costs. A database that's using too much CPU shows up in monitoring dashboards. A server that's scaling too aggressively sends billing alerts. But an LLM agent that's consuming too many tokens looks exactly like an LLM agent that's doing its job well. The API calls succeed. The responses are coherent. The work gets done. The bill arrives later.

This is especially true in multi-agent systems where agents trigger each other. Agent A completes a task and notifies Agent B. Agent B processes the result and creates three follow-up tasks for Agent C. Agent C works through the follow-ups and updates Agent A on the results. Every step is correct. Every step costs tokens. The total cost is the product of all the steps, and nobody's tracking the running total in real time.

The traditional approach is to set a budget and check it periodically. But "periodically" means daily or weekly, and by then the damage is done. A runaway agent can burn through hundreds of dollars in hours. You need something that reacts in minutes, not days.

---

## The Circuit Breaker Pattern

The concept comes from electrical engineering. A circuit breaker monitors current flow and trips when the load exceeds a safe threshold, cutting the circuit before the wiring melts. In software, the same pattern protects against cascade failures -- if a downstream service is unhealthy, stop sending it requests.

For LLM cost control, the adaptation is straightforward: monitor token consumption rate, and if it exceeds a threshold, throttle the agent before it eats the budget.

Our implementation runs on a ten-minute cron cycle. Every ten minutes, a Python script checks each monitored agent's token usage over the past four hours. If any agent has consumed more than 60% of its daily budget within that four-hour window, the breaker trips.

When the breaker trips, two things happen:

First, it sends a Telegram alert. The message includes the agent name, how many tokens it consumed, what percentage of its budget that represents, and the time window. This is important because the throttle is automatic, but the *diagnosis* still requires a human. The alert tells you something happened. Your job is to figure out whether the agent was doing useful work or spinning its wheels.

Second, it modifies the agent's configuration to reduce its maximum turns per session from 90 to 15. This doesn't stop the agent. It limits how much work it can do per conversation. Instead of processing a full backlog in one session, it processes a handful of items and then stops. The next session picks up where it left off, but the cost is spread across time instead of concentrated in one spike.

---

## Why Rate, Not Total

You might wonder why we measure rate (tokens per 4 hours) instead of total daily usage. The reason is that total-based budgets punish productive days. If an agent legitimately has a lot of work to do -- a backlog cleared, a big ingestion job, a complex multi-step task -- you don't want it throttled just because it's being productive. You want it throttled when the *rate* suggests something is wrong.

A bot that uses 80% of its daily budget over 12 hours of steady work is fine. A bot that uses 60% of its daily budget in 2 hours probably has a loop, a stuck conversation, or a misconfigured task that's generating infinite subtasks. The rate threshold distinguishes between "busy" and "runaway."

The specific numbers we use: 60% of daily budget consumed within a 4-hour window. These were chosen empirically. We watched normal usage patterns for two weeks, found that healthy agents rarely exceed 40% in any 4-hour window, and set the threshold at 60% to avoid false positives while catching genuine spikes.

---

## The Daily Budget Table

Each agent has a budget calibrated to its role:

| Agent | Daily Budget | Role |
|-------|-------------|------|
| Kilo | 1M tokens | Fast-track engineer, high throughput |
| Hive | 1M tokens | Coordinator, lots of routing decisions |
| Beau | 500K tokens | Intake operator, moderate volume |
| Edgeless-CC | 500K tokens | Acting COO, periodic sweeps |

These aren't hard caps enforced at the API level. They're reference values that the circuit breaker uses for its rate calculation. The agents can exceed them -- the breaker just throttles the rate when consumption is too fast.

Why not hard caps? Because hard caps create a different failure mode: an agent that hits its cap mid-task leaves work in an inconsistent state. A throttle is gentler. The agent finishes its current session normally, but the next session is shorter. Work completes, just more slowly.

---

## Auto-Recovery

The breaker resets automatically at 3-4 AM, during each agent's configured session reset hour. This is important. A tripped breaker doesn't require human intervention to restore normal operation. If the spike was transient -- a one-time backlog clearance, a burst of incoming work -- the agent returns to full capacity the next morning.

If the same agent trips the breaker three days in a row, that's a signal for a human to investigate. We track trip history in a JSON state file and flag repeat offenders in the daily digest. But the default assumption is that a single trip is a spike, not a trend.

---

## What We Learned After Three Weeks

**The breaker tripped seven times in the first three weeks.** Five were legitimate cost spikes from agents processing large backlogs. Two were actual problems -- a stuck conversation loop and a misconfigured task that generated recursive subtasks. Without the breaker, those two incidents would have cost an estimated $180-220 combined, based on the consumption rate when the breaker caught them.

**Throttled agents still complete their work.** The 15-turn limit sounds aggressive, but it's enough to process 3-5 work items per session. With sessions running every few hours, the throughput is maybe 30% of normal. Not great, but far better than burning the budget and having nothing left for the rest of the day.

**The Telegram alert is more valuable than the throttle.** The throttle prevents immediate damage, but the alert is what lets you fix the root cause. Every time we got a breaker alert, we investigated. The investigation usually revealed something worth fixing -- a prompt that was too verbose, a task definition that was ambiguous, a loop that the depth counter should have caught but didn't.

**Ten minutes is the right check interval.** We started at five minutes and saw the script itself consuming meaningful CPU and I/O reading SQLite databases. Ten minutes catches spikes within one check cycle while staying lightweight. At ten-minute intervals, the maximum undetected spend before a trip is roughly 10 minutes worth of tokens -- a few dollars at most.

---

## Build It Before You Need It

If you're running LLM agents autonomously -- meaning they can act without human approval for each step -- you need cost protection that operates at the same speed as the agents. Human review of weekly invoices doesn't cut it. Monthly budget alerts don't cut it. You need something that watches the meter in real time and pulls the plug before the meter spins out.

The circuit breaker pattern is forty-five minutes of work. A cron job, a threshold check, a config modification, an alert. It's not sophisticated. It doesn't need to be. It just needs to run, check, and act faster than your agents can spend.

The alternative is finding out on your invoice.

---

**Related posts:**
- [We Built an Envelope Protocol to Stop Our AI Agents from Talking Forever](/blog/envelope-protocol-multi-agent-coordination)
- [Half My AI Agents Were Dead. I Didn't Know for a Week.](/blog/self-healing-ai-infrastructure)
- [The Most Useful Thing Your AI Agents Can Do Is Audit Themselves](/blog/agents-that-improve-themselves)

---

*Edgeless Lab builds infrastructure for autonomous AI systems.*
