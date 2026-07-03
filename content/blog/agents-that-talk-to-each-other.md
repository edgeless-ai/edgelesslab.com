---
slug: agents-that-talk-to-each-other
title: How I Run 5 AI Agents That Talk to Each Other
description: A dispatch agent routes tasks to specialist workers. They communicate
  through a real-time bus and async inboxes. The architecture, and why most multi-agent
  frameworks get it wrong.
date: '2026-04-07'
tags:
- Multi-Agent
- Architecture
- Claude Code
readTime: 7 min
productSlug: multi-agent-blueprint
isLaunch: true
editorial: true
ctaHook: The dispatch pattern, bus protocol, and 3 reference implementations from
  this architecture.
---

# How I Run 5 AI Agents That Talk to Each Other

I run five AI agents concurrently. A dispatch agent on my Mac routes tasks. Worker agents on a VPS handle execution. They communicate through two channels: a real-time message bus for urgent coordination, and async inboxes for everything else.

This isn't a framework demo. These agents process real content, manage real infrastructure, and occasionally make real mistakes. The architecture exists because simpler approaches failed first.

## Why Single-Agent Breaks Down

A single Claude Code session can do remarkable things. But it has limits: one context window, one set of tools, one conversation thread. When you need to research while building while monitoring, a single agent becomes a bottleneck.

The first instinct is to make the agent smarter. Give it more tools. Expand its context. Write better prompts. This works until it doesn't. The failure mode is subtle: the agent starts losing track of parallel concerns. It forgets it was monitoring something while deep in a code change. Context compression drops the monitoring task.

The fix isn't a smarter agent. It's more agents with clear boundaries.

## The Dispatch/Worker Topology

:::flow Dispatch/Worker Architecture
Human -> Dispatch -> Code Worker
Dispatch -> Research Worker
Dispatch -> Monitor Worker
Dispatch -> Content Worker
:::

One agent dispatches. The rest execute. The dispatch agent has a complete view of what needs to happen. Worker agents have narrow focus and specific tool sets.

The dispatch agent doesn't write code. It doesn't browse the web. It doesn't manage infrastructure. It receives requests, breaks them into tasks, routes tasks to appropriate workers, and tracks completion. Its only tools are: send message, check status, read results.

Workers are specialists. One handles code changes. One handles research. One monitors infrastructure. One processes content. They don't talk to each other directly. All coordination flows through dispatch.

This is a deliberate constraint. Peer-to-peer agent communication creates the same problems as distributed systems: race conditions, split-brain states, cascading failures. A central dispatcher eliminates these by serializing decisions.

## Two Communication Channels

**Agent Bus (real-time)**: A message hub running as a launchd service on port 9800. Agents connect via MCP, send typed messages, and receive responses. Messages are held for 24 hours if the recipient is offline. The bus handles: task assignments, status updates, urgent alerts, and result delivery.

The bus is fire-and-forget from the sender's perspective. You send a message, the hub routes it. If the recipient is connected, delivery is instant. If not, it queues. Senders don't block waiting for responses.

**Async inboxes (batch)**: A file-based system synced between machines via rsync every 60 seconds. Each agent has an inbox directory. Dispatch writes task files. Workers read them, process, and write results to an outbox. A daemon picks up results and routes them back.

Why two channels? The bus handles real-time coordination: "stop what you're doing, this is urgent." Inboxes handle batch work: "here are 5 articles to analyze, results by tomorrow." Using one channel for both creates priority inversion. The urgent message sits behind 50 batch tasks.

Both channels sit on top of [the infrastructure stack underneath](/blog/building-ai-agent-infrastructure-solo/): the MCP layer, the memory system, and the safety hooks that make any of this trustworthy.

## State Machine Per Task

:::flow Task State Machine
Queued -> Acked -> Running -> Done
Running -> Failed -> Retry -> Queued
:::

Every task follows a state machine: `queued -> acked -> running -> done | failed`. Dispatch creates tasks in `queued`. Workers acknowledge with `acked` (proving they received it). Work begins at `running`. Terminal states are `done` (with results) or `failed` (with error context).

The state machine solves the "did it even start?" problem. If a task stays in `queued` for more than 5 minutes, dispatch knows the worker is down. If it stays in `running` for too long, dispatch can reassign or escalate. Without explicit states, you're guessing.

Failed tasks include structured error context: what went wrong, whether it's retryable, and what the worker tried. Dispatch uses this to decide: retry with the same worker, route to a different worker, or escalate to a human.

## What Most Frameworks Get Wrong

Multi-agent frameworks love complex abstractions. Shared memory. Consensus protocols. Agent hierarchies with managers and sub-managers. These solve theoretical problems at the cost of operational simplicity.

The problems that actually matter in production are boring: How do you know if an agent crashed? How do you restart a failed task? How do you add a new worker type without changing the dispatch logic? How do you debug a task that produced wrong results? And, the one I learned the hard way, [what happens when dispatch limits aren't actually enforced](/blog/swarm-tried-to-bankrupt-itself/)?

A simple dispatch/worker topology with explicit state machines and two communication channels answers all of these. It's not elegant. It doesn't make a good conference talk. But it runs unattended at 3am without surprises.

## Getting Started

You don't need five agents on day one. Start with two: one dispatch, one worker. Route one type of task. Get the communication channel working. Add the state machine. Only then add a second worker type.

The [Multi-Agent Orchestration Blueprint](/products) includes the full architecture, the Agent Bus setup, three reference implementations, and the failure patterns I hit along the way. It's on the [products page](/products).

If you're wondering what running all of this costs, [the full cost breakdown of running this team](/blog/12-dollar-ai-operations-team/) comes to $12 a week.

The value isn't in the architecture diagram. It's in knowing which shortcuts work and which ones break at 3am.