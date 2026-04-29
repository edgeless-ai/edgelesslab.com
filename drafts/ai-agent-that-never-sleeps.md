---
title: "The AI Agent That Never Sleeps: Running Hermes 24/7 on a $5 VPS"
slug: "ai-agent-never-sleeps-hermes-vps"
date: "2026-04-29"
excerpt: "Most AI agents die when you close the laptop. Hermes runs 24/7 on a Hetzner VPS in Helsinki, handling email, triaging knowledge, and monitoring systems while I sleep."
productSlug: "multi-agent-blueprint"
status: draft
source: "docs/hermes-operations-guide.md + memory files"
---

Most AI agents die when you close the laptop. Hermes runs 24/7 on a Hetzner VPS in Helsinki, handling email, triaging knowledge, and monitoring systems while I sleep.

## The Problem With Session-Based Agents

Every AI coding assistant has the same limitation: it exists inside your session. Close the terminal, lose the agent. Come back tomorrow, re-explain everything.

I needed an agent that:
- Processes incoming signals (RSS, email, YouTube) on a schedule
- Triages my knowledge base without me watching
- Monitors system health and only bothers me when something breaks
- Remembers what it learned yesterday

So I built Hermes. It runs on a $5/month Hetzner VPS in Helsinki, and it hasn't needed a manual restart in three months.

## What Hermes Actually Does

Hermes isn't a chatbot. It's a Chief of Staff that runs 8 cron jobs autonomously:

**Every 6 hours:** Health check across all services. If something is down, I get a Telegram message. If everything is fine, silence. This is the most important design decision: agents should only interrupt you when something needs attention.

**Every 4 hours:** Email triage. Reads incoming email via himalaya CLI, categorizes by urgency, drafts responses for routine messages, and flags anything that needs human judgment.

**Daily at 4pm UTC:** Newsletter digest. Processes accumulated RSS and email newsletters, extracts signal, scores by relevance (1-10), and writes summaries to the knowledge base.

**Twice weekly:** Dream consolidation. Reviews everything it learned that week, identifies patterns, and promotes high-value insights from the inbox to permanent knowledge storage.

## The Architecture

Hermes runs on Nous Research's agent framework with a custom configuration:

- **Model:** Kimi K2.5 via Fireworks AI (flat-rate, unlimited tokens)
- **Communication:** Telegram bot for human interaction, file-based inbox for agent-to-agent dispatch
- **Memory:** Flat-file MEMORY.md (83 lines of operational knowledge) + Obsidian vault via rsync
- **Skills:** 91 custom skills covering web research, email, GitHub, code review, and knowledge curation
- **Tools:** 102 available tools including DuckDuckGo search, Perplexity API, GitHub CLI, and file system access

The VPS costs $5.35/month. The model inference costs about $4-5/week via Fireworks. Total: roughly $26/month for an always-on AI operations team member.

## The SOUL.md File

Every Hermes session loads a personality file called SOUL.md. It contains the behavioral rules that make Hermes useful instead of annoying:

1. Never use em dashes (my personal style preference)
2. Lead with the answer, not the reasoning
3. For cron jobs: only message David if something needs attention
4. Do NOT log routine status checks to memory
5. Web search priority: DuckDuckGo first, then Perplexity, then memory recall last
6. Decision tree: local data first, then dispatch to Mac, then ask David

Rule 3 is the most important. A naive agent implementation sends you a message every time it completes a cron job. "Health check complete! All systems operational!" Twelve times a day. That's not helpful, that's spam.

Hermes only talks to me when something is wrong. The ratio of signal to noise is what makes the system sustainable.

## Three Communication Channels

I talk to Hermes through three channels, each with different behavior:

**Telegram** is for quick questions. "What's the status of the RSS pipeline?" Hermes responds conversationally, one-shot, no tool use. Fast and lightweight.

**Direct API** is for programmatic access. Scripts can hit the chat completions endpoint and get structured responses. Useful for other agents that need Hermes to answer a question.

**Inbox dispatch** is for real work. Drop a markdown directive in a shared folder, rsync carries it to the VPS, and Hermes processes it as an autonomous task with the full toolset. This is how multi-step work gets done: research, file writes, GitHub operations, knowledge curation. Round trip is about 17 minutes worst case.

The inbox pattern is critical. Chat interfaces encourage chat behavior. When you want an agent to actually do work, give it a work order, not a conversation.

## What Breaks (And How It Recovers)

Hermes has failed in specific, instructive ways:

**Confabulation.** Hermes once claimed it had created an entire wiki structure (`04-Wiki/`) on the VPS. The files didn't exist. The API is stateless, so Hermes has no persistent memory of what it has or hasn't done between sessions. Fix: always verify file claims independently. Trust but verify is the rule.

**Provider routing confusion.** The auth.json `active_provider` field overrides config.yaml silently. Hermes was using the wrong model for weeks because the config file said one thing but the auth state said another. Fix: provider selection now goes through a single code path with explicit logging.

**Inbox self-messaging.** An early version of the dispatch system could create loops where Hermes dispatched tasks to itself. Fix: the `process_directive.py` script now has a self-message guard that drops any directive where `from == to`.

Each failure mode led to a specific, targeted fix. Not a framework rewrite. Not a "more sophisticated" error handling system. Just a guard clause or a log line in the right place.

## The Compound Value

After three months of continuous operation, Hermes has:
- Processed 3,200+ documents into the knowledge base
- Triaged 8,000+ tasks without a manual restart
- Caught 14 system issues before they became problems
- Built a knowledge graph that I search daily

The value isn't in any single cron job. It's in the compound effect of an agent that runs while you don't. Knowledge accumulates. Patterns emerge. The system gets smarter not because the model improves, but because the data it operates on gets richer.

That's the difference between using AI and having AI infrastructure.

---

*Hermes runs on the same architecture described in the [Multi-Agent Orchestration Blueprint](https://edgelessai.gumroad.com/l/multi-agent-blueprint). The Blueprint includes the dispatch pattern, bus protocol, and 3 reference implementations for building your own always-on agent system.*
