---
slug: the-gateway-that-broke-and-the-expensive-models-we-didnt-need
title: The Gateway That Broke — and the Expensive Models We Didn't Need
description: FreeLLMAPI had been quietly routing a small agent swarm across more than
  a dozen providers. Then the setup collapsed to four, its premium credential vanished,
  and activation started failing. Recovering it taught me that the real upgrade was
  not a pricier model — it was one source of truth and intentional routing.
date: '2026-07-28'
tags:
- Infrastructure
- Multi-Agent
- Automation
- Postmortem
readTime: 5 min
editorial: true
published: true
image: /blog-images/freellmapi-gateway-recovery.webp
processNote: Human-directed, AI-assisted investigation, writing, and illustration.
ctaHook: Before you buy a smarter model, make sure you have not lost the system that
  was already making your free models work.
---

# The Gateway That Broke — and the Expensive Models We Didn't Need

I maintain a small agent swarm that researches, drafts, codes, and reviews. Its model
traffic passes through FreeLLMAPI, a local gateway that turns many provider credentials
into one endpoint and model catalog.

For months it just worked. I remembered setting up somewhere between fourteen and
seventeen providers, activating the premium gateway credential, and watching the swarm
fall through free tiers when one provider was slow or exhausted. It became
infrastructure in the most dangerous sense: reliable enough that I stopped thinking
about how it worked.

Then I opened it and found four providers.

The FreeLLMAPI credential inside the tool was gone. Trying to activate it again returned
a 400. The rest of my environment was intact, but the gateway had been hollowed out.
Agents that depended on its catalog and fallback routes suddenly looked misconfigured.

## Two working installations made one broken system

The failure was not a dramatic database crash. It was worse: a believable partial
system.

FreeLLMAPI had been split between a Docker build and a native build. Each had its own
database state. The native process was alive and serving requests, but it had the
four-provider version. The older, richer state — including the active premium
credential and the provider inventory I remembered — still existed on the Docker side.
The activation request failed because I was asking one runtime to recognize state that
belonged to the other.

Both installations were plausible. Together they had no source of truth. Depending on
which database you inspected, FreeLLMAPI was licensed or unlicensed, rich in providers
or reduced to four.

That is how configuration drift becomes an outage without anything technically going
offline.

:::flow The split-state failure
Native runtime -> Four-provider state -> Activation fails
Docker runtime -> Older rich state -> Premium active
:::

## Recover the state before redesigning the system

The tempting response was to re-enter keys from environment files and rebuild the
provider list by hand. That would have produced a third interpretation of the setup.
Instead I treated the databases as recovery evidence.

I compared the databases, checked their integrity, counted credentials without printing
them, and reconciled the provider rows against the current build. The recovered state
held **21 credential rows across 19 providers**, with twenty enabled. Nineteen enabled
credentials passed health checks. The premium license was still active. The setup had
not disappeared; I had been looking at the wrong state store.

:::metric
4 | Providers in the partial state
19 | Providers recovered
21 | Credential rows reconciled
19 | Enabled credentials healthy
:::

Only after recovery did I choose a permanent owner. A native launchd service now owns
the verified database, binds only to localhost, restarts automatically, and writes
encrypted hourly backups. Docker was retired from production.

One service. One database. One recovery path.

## The curation that did more than the budget

Before consolidation, some agents used bare `auto` routing: whatever the gateway
happened to prefer. There was no intentional curation or guard against an expensive
model being selected automatically.

The fix was creating three named route selectors:

- **`auto:smart-core`** — the strongest automatically routed free model pool. Every
  route in it had passed a live completion canary. No assumptions, no untested
  providers.
- **`auto:fast-core`** — a speed-optimized pool for routine work. Models are sorted by
  intelligence within the fast tier, so the best quick model wins.
- **`fusion:smart-core`** — a synthesis route for editorial review. Its judge is
  pinned to one model, and the most expensive free model is explicitly excluded from
  the automatic pool.

The key rule: Hyper DeepSeek V4 Pro and any paid Nous model are **manual escalation
only**. They never appear in a primary route, a fallback chain, a Fusion panel, or an
automatic judge. I can still use them when a task genuinely needs the extra
capability, but it has to be a deliberate choice, not a silent default.

:::flow Intentional routing
Routine work -> auto:fast-core -> Fast free pool
High-judgment work -> auto:smart-core -> Strong free pool
Editorial synthesis -> fusion:smart-core -> Curated review
Exceptional task -> Manual escalation -> Pro or paid model
:::

## The same agents, suddenly smarter

Once the routes were named and curated, I assigned them:

- **Atlas**, **Hive**, and **Beau** — the research and dispatch agents — got Hyper
  DeepSeek V4 Flash as their primary, with `auto:smart-core` and NVIDIA GPT-OSS as
  fallbacks.
- **Builder** — the implementation agent — uses a free MOA blend that composites
  multiple free models, with `auto:fast-core` and V4 Flash as fallbacks.
- **Honey** — the editorial agent — uses V4 Flash with Fusion as its review/fallback
  layer.

The smartest discovery: Hive is the **sole continuous dispatcher** for the swarm's
task board. Atlas is the standby if Hive is taken offline. One agent polls, the rest
do one-shot work. This rule alone eliminated the most common failure mode in a
multi-agent system — competing dispatchers stepping on each other.

## The lesson worth stealing

I thought the swarm needed a paid model budget. It needed a receipt audit: find what I
already had, verify it, and route it intentionally.

- **Inventory before you buy.** The credential you already have, tested and routed,
  beats the one you're about to sign up for. I had 19 healthy credentials and didn't
  know it.
- **A named selector beats bare auto.** `auto:smart-core` preserves intent even if
  the dashboard's active profile changes. Bare `auto` is a gamble on whatever the
  gateway happens to prefer today.
- **Exclude the expensive ones on purpose.** If a paid model isn't your primary, it
  shouldn't be in your automatic fallback either. Manual escalation is the cheapest
  way to keep a pro model available without letting it burn through your budget by
  accident.
- **One dispatcher per board.** The most reliable agent is the one that isn't
  competing. Pick one, name a standby, and enforce the rule.

The swarm did not get smarter because I bought a new model. It got smarter because the
system stopped lying about what it had.
