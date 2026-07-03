---
slug: self-healing-ai-infrastructure
title: Half My AI Agents Were Dead. I Didn't Know for a Week.
description: "I discovered 10 of my 20 agents were ghosts \u2014 registered, visible\
  \ in dashboards, producing nothing. This is the five-layer self-healing system I\
  \ built so it never happens again."
date: '2026-05-05'
tags:
- Multi-Agent
- Infrastructure
- Self-Healing
- Monitoring
readTime: 8 min
productSlug: multi-agent-blueprint
editorial: true
ctaHook: "The monitoring scripts, escalation protocol, and healing patterns behind\
  \ this post \u2014 ready to drop into your own agent infrastructure."
---

# Half My AI Agents Were Dead. I Didn't Know for a Week.

Last month I ran a manual audit I should have scripted months earlier. I cross-referenced every registered agent in Paperclip — our orchestration layer — against its activation profile: a cron schedule, a trigger, or at minimum a recent execution timestamp.

**10 of 20 agents had none of the above.**

No cron. No trigger. No execution in the past 30 days. These agents existed in the dashboard, had proper IDs, showed green status lights — and had done exactly zero work since they were provisioned.

The backlog told the story once I looked. RSS items: 500+ queued. YouTube items: 42 unprocessed. The knowledge triage queue had grown by roughly 40 items per day for a week with no one draining it. I'd been attributing the slowdown to throughput. It was absence.

This is the specific failure mode nobody warns you about: **registration without activation.** You can have a perfectly healthy process that starts exactly zero times.

## Why Silent Failures Are More Dangerous Than Crashes

A crash is a gift. It gives you a timestamp, an error, a stack trace. Silent failures give you a slowly degrading baseline you mistake for normal.

The ghost agent problem is structurally invisible to most monitoring setups. Health checks verify that an agent *can* respond. They don't verify that the agent has *been called*. I had agents that would respond fine to a ping but hadn't been called in production in weeks. The distinction matters. It's a cousin of [the agent grounding problem](/blog/agent-grounding-problem-hermes/): the system reports a state that has quietly drifted from reality.

A cron job that stops running doesn't send a notification. An agent that can't reach an API just stops. A backlog that grows by 500 items over a week looks like business as usual until you actually count it.

The thing that finally caught it wasn't any tool. It was me counting. That's the failure state I was building to avoid: a system whose correctness depends on the operator periodically doing manual accounting. At 20 agents, that's annoying. At 50, it's impossible.

## The Fix: Five Layers of Self-Healing

The goal wasn't a single monitoring script. It was a system that closes the loop on itself — one that detects failure states, applies corrective action where it has authority, and escalates with full context when it doesn't. Five layers, each targeting a different failure mode.

### Layer 1: Agent Activation Auditing

:::metric
10 | Ghost agents found
9 | Auto-resolved via cron deployment
1 | Escalated (structural config missing)
0 | Manual restarts required
:::

**The gap:** Paperclip tracks agent registration. Nothing tracked whether registration translated into scheduled work.

**What I built:** A profile gap analyzer that runs at 2am daily. It pulls the full agent roster from Paperclip's local state, then queries the Mac's crontab and the scheduler's active job list. Any agent with no matching cron entry, no trigger subscription, and no execution record in the past 48 hours gets flagged as unactivated.

**The healing path:** For agents with a known role type — ingestion, triage, monitoring — the script auto-deploys a cron with a sensible default schedule. Typically every 4 hours for ingestion agents, every 6 hours for monitoring. Each cron entry includes the agent's Paperclip ID in a comment so the reverse mapping works.

**When it escalates:** If an agent has no role type metadata, or if auto-deployed activation fails verification (the cron runs but the agent logs no output within the first cycle), it posts to the alerts channel with the agent ID, what was attempted, and what failed. That one remaining unresolved case above was a config key mismatch — the kind of thing that genuinely requires a human.

### Layer 2: Cron Execution Health

**The gap:** A cron schedule existing doesn't mean the cron job is running. A job can hang at the shell level, timeout silently, or accumulate zombie processes without generating any user-facing signal.

**What I built:** A monitor that runs every 5 minutes. It does three checks:

1. Parses the scheduler's execution log for timeout entries — my setup uses a custom wrapper that writes structured JSON logs, so I know exactly when a job exceeded its time limit.
2. Checks the active process list for jobs that have been running longer than 2x their expected duration.
3. Verifies heartbeat files. Each agent writes a `last_run.txt` file on completion. If that file is older than 1.5x the job's interval, something stopped the job without completing it.

**The healing path:** Auto-restart with exponential backoff. Attempt 1 is immediate. If the same job fails again within 15 minutes, wait 2 minutes before attempt 2. If it fails a third time, wait 10 minutes, then escalate rather than retry. The backoff matters — a job that fails immediately on restart is probably hitting a dependency issue, not a transient fault. Hammering it every 30 seconds doesn't help and floods your logs.

**What escalation looks like:** Not "cron failed" — that's useless at 3am. The alert includes: which job, the last successful run timestamp, the failure mode (timeout / crash / heartbeat miss), the last 20 lines of that job's log, and whether the same job has failed in the past 24 hours. That's actionable information.

### Layer 3: Backlog Drain Rate

**The gap:** Agents running isn't the same as agents keeping up.

:::bar-chart Backlog state at discovery
RSS queue | 500
YouTube queue | 42
Knowledge triage | 280
Total cleared in 48h after fix | 720
:::

**What I built:** A daily delta tracker. At midnight it records the size of every work queue. At noon it checks again. If any queue is larger at noon than at midnight, the drain rate is negative — agents are falling behind their ingest rate.

A negative drain rate for one day can be noise. Negative for two consecutive days means processing capacity is structurally insufficient or a processing agent is down. Those are different problems with different fixes.

**The healing path:** For queues with a negative 2-day delta, the monitor checks whether parallel workers can be safely added. Most ingestion jobs are embarrassingly parallel — independent items from a queue, process, mark done. Adding a second worker doubles throughput with no coordination overhead. The monitor auto-scales up to 3 parallel workers before escalating to ask whether the ceiling should be raised.

For items older than 30 days with no processing attempt, it archives with a reason code (`staleness_archive`) rather than letting them accumulate indefinitely. Stale items aren't deleted — they go to a dated archive directory.

**When it escalates:** If a queue has been growing for 3+ days despite maximum parallel workers, something is structurally wrong. The escalation includes queue name, size, growth rate, and last successful processing timestamp. That class of failure is exactly how we ended up [debugging a stuck multi-agent swarm without touching the production pipeline](/blog/how-we-debugged-a-stuck-multi-agent-swarm-without-touching-the-production-pipeline/).

### Layer 4: External API Dependencies

**The gap:** Agents that depend on external APIs will silently stop producing work when those APIs go down. The agent stays "healthy" from a process perspective. It's just not doing anything useful.

**What I built:** 30-minute health probes against every registered external dependency. The probe list is a simple YAML file — service name, URL, expected status code, timeout. Adding a new dependency is one line. Each probe result gets appended to a rolling 24-hour log. A dependency that returns non-200 twice in a row is considered down.

**The healing path:** When a dependency goes down, work that would have used it routes to a pending queue instead of being dropped. When the dependency comes back, the queue drains automatically. Don't drop work, don't hammer a down service, resume when healthy.

**When it escalates:** At 9am daily, a blocker digest posts to the backroom channel listing any dependency down for more than 2 hours, how many items are pending behind it, and how long the outage has lasted. Two hours is the threshold because that's when "transient issue" becomes "I should know about this."

### Layer 5: Resource Consumption

**The gap:** Disk fills up slowly. Memory leaks gradually. Neither is dramatic enough to trigger an obvious failure.

**What I built:** A daily 2am scan measuring vault size compared to 7 days prior, log directory growth, available disk space, and memory pressure. My vault grows at roughly 30-50MB per week under normal operation. A day where it grows 500MB means something is writing at ~10x the normal rate. That's the threshold — not an arbitrary number, but derived from observed baselines.

**The healing path:** Auto-archive content older than 90 days in the captures directory (raw ingested content that's already been processed). Compress logs older than 7 days. These two operations together have kept disk usage stable without manual intervention.

**When it escalates:** 80% disk capacity triggers a warning. 90% triggers an urgent alert. A single-day growth event over 500MB triggers immediate investigation regardless of absolute capacity.

## What a Self-Healing Day Actually Looks Like

:::flow Daily Operations Loop
Detect -> Classify -> Heal -> Verify -> Report
:::

This is a real incident from last week that resolved without human involvement.

The YouTube likes delta job — which tracks engagement changes on saved videos — hung at 09:31. It had been running for 612 seconds, 12 past its 600-second timeout guard. The scheduler terminated it.

The 5-minute monitor noticed at 09:35 via the heartbeat check: last successful completion was the day before, no new heartbeat written. It found the timeout entry in the execution log and triggered a restart.

The job completed at 09:42. The monitor verified the new heartbeat file. Recovery logged. Dashboard showed the job healthy on the next cycle.

Total time from failure to recovery: 11 minutes. Human involvement: zero. I only knew about it because the daily summary mentioned "1 auto-recovery in the past 24 hours." That's the target experience.

## Escalation Criteria: Why These Specific Thresholds

These aren't defaults — they're calibrated to observed baselines. If you implement this, measure your baselines first and set thresholds that would have caught your past incidents without firing constantly.

- **Auto-restart fails twice in 15 minutes:** A single failure can be environmental. Two in the same window means the underlying condition hasn't resolved.
- **Dependency down for 2+ hours:** My external API SLAs are all sub-hour for standard maintenance. Two hours means it's an incident or a permanent change.
- **3+ agents go unhealthy simultaneously:** One agent failing is localized. Three at once suggests a shared dependency or environment change.
- **500MB vault growth in 24 hours:** 10x normal rate. Statistical outlier, not gradual drift.
- **Queue growing for 2 consecutive days:** One day is variance. Two days is a trend.

## Results After 30 Days

:::bar-chart Before vs. After
Ghost agents | 10 → 1
Undetected errors per day | 5 → 0
Human fire-drills per week | 4 → 1
Time to detect failure (minutes) | 480 → 5
Time to recover (minutes) | 90 → 12
:::

The one remaining human fire-drill per week is novel failures the system correctly doesn't know how to handle. That's not a failure of the monitoring system — that's the system working as designed. Handle the known failure modes automatically, escalate the unknown ones with enough context that a human can resolve them in minutes rather than hours.

## Where to Start

Don't build all five layers at once. This is the sequence that delivered value fastest:

**First: cron heartbeat monitoring.** Every scheduled job writes a timestamped file on completion. A separate script checks those files on a 5-minute timer. Any file older than 1.5x the job interval triggers an alert. This is 30 lines of Python and it will immediately show you which jobs are silently failing.

**Second: agent activation auditing.** Cross-reference your orchestration layer's agent registry against your actual job list. Anything registered but not running is a ghost. Do this once manually, then automate it.

**Third: queue drain rate tracking.** Log queue sizes at two points per day. A queue that's growing despite agents running means processing capacity is inadequate — not that agents are broken. Those are different problems with different fixes.

Layers 4 and 5 are real, but they're incremental improvements once you have the first three working. Most ghost-agent problems and most silent failures will be caught by the first two.

---

Good infrastructure is boring infrastructure. The goal isn't to eliminate humans from the loop — it's to eliminate *routine* human intervention. Humans should handle novel failures, strategic decisions, and system evolution. Not restarting stuck processes. These five layers are what keep [the $12/week operations team](/blog/12-dollar-ai-operations-team/) actually operating.

---

*The monitoring scripts, Paperclip integration code, escalation protocol, and heartbeat pattern are packaged in the [Multi-Agent Blueprint](/products/multi-agent-blueprint/). If you're running more than five agents and doing manual health checks, that's the place to start.*

*Edgeless Lab builds infrastructure for autonomous AI systems.*