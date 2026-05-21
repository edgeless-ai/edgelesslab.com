---
slug: "ai-agent-never-sleeps-hermes-vps"
title: "The AI Agent That Never Sleeps: Running Hermes 24/7 on a $5 VPS"
description: "Most AI agents die when you close the laptop. Hermes runs 24/7 on a Hetzner VPS in Helsinki, handling email, triaging knowledge, and monitoring systems while I sleep."
date: "2026-04-29"
tags:
  - "Hermes"
  - "AI Agents"
  - "VPS"
  - "Infrastructure"
readTime: "7 min"
editorial: true
productSlug: "multi-agent-blueprint"
ctaHook: "The dispatch pattern, bus protocol, and reference implementations for building your own always-on agent system."
---
Most AI agents die when you close the laptop. Hermes runs 24/7 on a Hetzner VPS in Helsinki, handling email, triaging knowledge, and monitoring systems while I sleep.

## The Problem With Session-Based Agents

Every AI coding assistant has the same limitation: it exists inside your session. Close the terminal, lose the agent. Come back tomorrow, re-explain everything.

I needed an agent that processes incoming signals on a schedule, triages my knowledge base without me watching, monitors system health and only bothers me when something breaks, and remembers what it learned yesterday.

So I built Hermes. It runs on a $5/month Hetzner VPS in Helsinki, and it hasn't needed a manual restart in three months.

## What Hermes Actually Does

Hermes isn't a chatbot. It's a Chief of Staff that runs 8 cron jobs autonomously:

**Every 6 hours:** Health check across all services. If something is down, I get a Telegram message. If everything is fine, silence. This is the most important design decision: agents should only interrupt you when something needs attention.

**Every 4 hours:** Email triage. Reads incoming email, categorizes by urgency, drafts responses for routine messages, flags anything that needs human judgment.

**Daily at 4pm UTC:** Newsletter digest. Processes accumulated RSS and email newsletters, extracts signal, scores by relevance (1-10), writes summaries to the knowledge base.

**Twice weekly:** Dream consolidation. Reviews everything it learned that week, identifies patterns, promotes high-value insights from inbox to permanent knowledge storage.

## The Architecture

- **Model:** Kimi K2.5 via Fireworks AI (flat-rate, unlimited tokens)
- **Communication:** Telegram bot for human interaction, file-based inbox for agent-to-agent dispatch
- **Memory:** Flat-file MEMORY.md + Obsidian vault via rsync
- **Skills:** 91 custom skills covering web research, email, GitHub, code review, knowledge curation
- **Tools:** 102 available tools including DuckDuckGo, Perplexity API, GitHub CLI, file system

The VPS costs $5.35/month. Model inference costs about $4-5/week via Fireworks. Total: roughly $26/month for an always-on AI operations team member.

## The SOUL.md File

Every Hermes session loads a personality file called SOUL.md. It contains the behavioral rules that make Hermes useful instead of annoying:

1. Lead with the answer, not the reasoning
2. For cron jobs: only message David if something needs attention
3. Do NOT log routine status checks to memory
4. Web search priority: DuckDuckGo first, then Perplexity, then memory recall
5. Decision tree: local data first, then dispatch to Mac, then ask David

Rule 2 is the most important. A naive agent sends you a message every time it completes a cron job. Twelve times a day. That's not helpful, that's spam. Hermes only talks to me when something is wrong.

## Three Communication Channels

**Telegram** is for quick questions. Conversational, one-shot, no tool use. Fast and lightweight.

**Direct API** is for programmatic access. Scripts hit the chat completions endpoint for structured responses.

**Inbox dispatch** is for real work. Drop a markdown directive in a shared folder, rsync carries it to the VPS, Hermes processes it as an autonomous task with the full toolset. Round trip is about 17 minutes worst case.

The inbox pattern is critical. Chat interfaces encourage chat behavior. When you want an agent to actually do work, give it a work order, not a conversation.

## What Breaks (And How It Recovers)

**Confabulation.** Hermes once claimed it had created an entire wiki structure on the server. None of it existed. The API is stateless. Fix: always verify file claims independently.

**Provider routing confusion.** The auth state silently overrode the config file. Hermes used the wrong model for weeks. Fix: provider selection now goes through a single code path with explicit logging.

**Inbox self-messaging.** An early dispatch system could create loops where Hermes dispatched tasks to itself. Fix: a self-message guard drops any directive where `from == to`.

Each failure led to a targeted fix. Not a framework rewrite. Just a guard clause in the right place.

## The Compound Value

After three months of continuous operation, Hermes has processed 3,200+ documents into the knowledge base, triaged 8,000+ tasks without a manual restart, caught 14 system issues before they became problems, and built a knowledge graph I search daily.

The value isn't in any single cron job. It's in the compound effect of an agent that runs while you don't. Knowledge accumulates. Patterns emerge. The system gets smarter not because the model improves, but because the data it operates on gets richer.

That's the difference between using AI and having AI infrastructure.
