1:"$Sreact.fragment"
2:I[82591,["/_next/static/chunks/0r6k.ywzkruzy.js","/_next/static/chunks/0.y-6rdfb1fek.js","/_next/static/chunks/00~t2rnqpr69r.js","/_next/static/chunks/0jtxsm9n35d_u.js"],"Nav"]
3:I[50405,["/_next/static/chunks/0r6k.ywzkruzy.js","/_next/static/chunks/0.y-6rdfb1fek.js","/_next/static/chunks/00~t2rnqpr69r.js","/_next/static/chunks/0jtxsm9n35d_u.js"],"BlogPostCard"]
b:I[52150,["/_next/static/chunks/0r6k.ywzkruzy.js","/_next/static/chunks/0.y-6rdfb1fek.js","/_next/static/chunks/00~t2rnqpr69r.js","/_next/static/chunks/0jtxsm9n35d_u.js"],"Footer"]
c:I[2579,["/_next/static/chunks/0r6k.ywzkruzy.js","/_next/static/chunks/0.y-6rdfb1fek.js"],"OutletBoundary"]
d:"$Sreact.suspense"
4:T1242,When people hear "multi-agent system," they picture a team of engineers, months of planning, and enterprise infrastructure. I built one by myself, and it runs on a single $15/month VPS.

This post covers the architecture decisions, the tools that made it possible, and the parts that surprised me.

## The Stack

The system has five layers:

**Claude Code** sits at the top. It's not just a coding assistant -- it's the primary agent runtime. Skills, hooks, and memory give it persistent context across sessions.

**MCP Servers** provide the tool layer. Instead of hardcoding capabilities, each tool is a standalone server that any agent can call. Search the knowledge vault? That's an MCP tool. Dispatch a task to another agent? MCP tool. Check VPS health? MCP tool.

**ChromaDB** handles vector memory. Every document, conversation summary, and learned pattern gets embedded and stored. When an agent needs context, it queries by semantic similarity rather than keyword matching.

**Obsidian** is the knowledge vault -- 7,000+ markdown files organized by topic. It's the human-readable layer that agents can also query through MCP.

**Hetzner VPS** runs the always-on processes. The trading bot, the Telegram gateway, the cron jobs -- everything that needs to persist beyond a terminal session.

## Why MCP Changes Everything

Before MCP, giving an AI agent access to tools meant writing custom integrations for each model provider. MCP standardizes the protocol: define your tool once, and any MCP-compatible client can use it.

I have servers for ChromaDB search, Obsidian vault queries, backlog management, and inter-agent messaging. Adding a new capability means writing one server, not modifying every agent.

The Effect-TS implementation makes the servers composable and type-safe. Error handling is built into the type system rather than scattered across try-catch blocks.

## Memory That Actually Works

The biggest challenge with AI agents isn't reasoning -- it's memory. A conversation ends, and everything learned evaporates.

I open-sourced the basic version as the [Claude Memory Kit](https://github.com/edgeless-ai/claude-memory-kit) and built a [Pro version](https://edgelessai.gumroad.com/l/claude-memory-kit) with stack-specific libraries and advanced patterns.

The solution is a three-layer memory system:

1. **ChromaDB** for semantic search across all stored knowledge
2. **File-based memory** for structured facts (user preferences, project context, feedback)
3. **Obsidian vault** for human-curated knowledge that agents can also access

Each layer serves a different retrieval pattern. ChromaDB handles "find me something similar to X." File memory handles "what did the user tell me about Y." The vault handles "what's the canonical documentation for Z."

## The Trading Bot

Pamela, the autonomous trading agent, was the forcing function for getting the infrastructure right. A trading bot that loses money because it forgot its strategy is worse than no bot at all.

She runs 24/7 on the VPS, monitored by PM2. Her architecture:

- **Market scanning**: Polymarket API for contract discovery
- **Analysis**: ML-driven probability estimation
- **Position sizing**: Kelly criterion with configurable risk limits
- **Execution**: Automated order placement and management
- **Reporting**: Daily P&L summaries via Telegram

The key insight: the bot doesn't need to be smart about everything. It needs to be smart about a few things and disciplined about the rest.

## Lessons Learned

**Start with one agent, not three.** Multi-agent orchestration sounds impressive but adds complexity. Get one agent working end-to-end before adding coordination.

**MCP servers are the right abstraction.** Tools as services, not libraries. This makes testing, deployment, and access control straightforward.

**Memory is infrastructure, not a feature.** Treat it like a database -- with schemas, retention policies, and access patterns.

**VPS beats serverless for always-on agents.** When your agent needs to maintain state, respond to events, and run cron jobs, a $15 VPS is simpler than a constellation of Lambda functions.

**The tools exist.** Claude Code, MCP, ChromaDB, PM2 -- the building blocks for agent infrastructure are production-ready today. The bottleneck isn't technology, it's architecture.

## What's Next

The system keeps growing. Current priorities: improving inter-agent communication (an "agent bus" for real-time messaging), better memory consolidation (merging redundant knowledge), and more sophisticated trading strategies.

The goal isn't to build the most complex system. It's to build the most useful one, with the least moving parts.0:{"rsc":["$","$1","c",{"children":[["$","div",null,{"className":"flex flex-col min-h-full","style":{"background":"var(--bg-base)"},"children":[["$","$L2",null,{}],["$","main",null,{"className":"pt-28 pb-20 px-6","children":["$","div",null,{"className":"max-w-[800px] mx-auto","children":[["$","h1",null,{"className":"text-3xl font-bold tracking-tight mb-2","style":{"color":"var(--text-primary)"},"children":"Blog"}],["$","p",null,{"className":"text-sm mb-12","style":{"color":"var(--text-secondary)","lineHeight":1.7},"children":"Notes on building AI agents, generative art, and developer tools."}],["$","div",null,{"className":"space-y-1","children":[["$","$L3","building-ai-agent-infrastructure-solo",{"post":{"slug":"building-ai-agent-infrastructure-solo","title":"Building AI Agent Infrastructure as a Solo Developer","description":"How I built a multi-agent system with MCP servers, vector memory, and autonomous trading -- all running 24/7 from a single VPS.","date":"2026-03-21","tags":["Agents","MCP","Infrastructure"],"readTime":"8 min","content":"$4"}}],"$L5"]}]]}]}],"$L6"]}],["$L7","$L8"],"$L9"]}],"isPartial":false,"staleTime":300,"varyParams":null,"buildId":"YuHA4iNoScLrpRTZtYdkv"}
a:T105c,Every Claude Code session starts the same way: a blank slate. No memory of yesterday's architecture decisions. No recall of your coding conventions. No idea that you spent three hours debugging that OAuth flow last week.

This is the single biggest friction point in AI-assisted development. Not model capability. Not context windows. Memory.

## The Problem Is Structural

Claude Code reads instructions from a file called `CLAUDE.md` at the start of every session. That's it. There's no built-in persistence layer. No session history. No learning from past interactions.

So every session, you repeat yourself: "We use TypeScript, not JavaScript." "The API lives in `src/api/`, not `api/`." "Don't use default exports." "We already tried approach X and it failed because Y."

This isn't a minor annoyance. It's a compounding tax on every interaction.

## File-Based Memory Fixes This

The solution is surprisingly simple: structured markdown files that Claude reads automatically at session start.

No databases. No vector stores. No infrastructure. Just files in your repo that Claude already knows how to read.

The memory system layers on top of Claude Code's built-in `CLAUDE.md` hierarchy. Claude loads these files automatically. You don't need plugins or configuration.

## The 4 Memory Types

After running this pattern in production across multiple projects, I've found four distinct memory types that cover every use case.

### 1. User Memory

Who you are and how you work. Follows you across every project.

```yaml
name: User Role
type: user
---
Senior backend engineer, 8 years Go.
New to React frontend in this project.
Prefer explanations mapping frontend concepts to backend analogues.
```

### 2. Feedback Memory

Corrections that stick. The highest-value memory type -- every correction makes every future session better.

```yaml
name: No mocking in integration tests
type: feedback
---
Integration tests must hit a real database, not mocks.
Why: Mocked tests passed but prod migration failed last quarter.
```

### 3. Project Memory

Architecture decisions, conventions, and infrastructure specific to one codebase.

```yaml
name: API Migration Freeze
type: project
---
No breaking API changes until 2026-03-15 (mobile release cut).
Any endpoint modifications must be backwards-compatible.
```

### 4. Reference Memory

Pointers to where things live. Tools, APIs, dashboards.

```yaml
name: Bug Tracker
type: reference
---
Production bugs: Linear project "PLATFORM"
Feature requests: Linear project "ROADMAP"
Design specs: Figma workspace "Product Design 2026"
```

## What Changes in Practice

With memory in place, sessions start differently. Instead of 10 minutes of context-setting, you jump straight into the work.

Claude remembers that your test suite uses Vitest, not Jest. It knows the deploy script is at `scripts/deploy.sh`, not `deploy.sh`. It recalls that you tried Redis caching last month and hit connection pooling issues.

After a month of accumulated feedback memory, Claude makes roughly 60% fewer mistakes that require correction. That's not a benchmark -- that's from tracking corrections across my own projects.

## The Maintenance Problem

Raw memory files work, but they accumulate cruft. Outdated entries. Contradictory instructions. Files that grow past useful size.

The discipline: review monthly, archive aggressively, keep each file under 200 lines. Memory that's too long defeats the purpose -- Claude spends context window on stale instructions instead of your actual task.

## Get Started

I've open-sourced the base memory kit with templates for all four memory types, a starter CLAUDE.md structure, and setup instructions.

**Free:** [Claude Memory Kit on GitHub](https://github.com/edgeless-ai/claude-memory-kit)

The free version covers 90% of use cases. For production patterns including stack-specific libraries (React/Next.js, Python/FastAPI, Go, Rails, Rust), multi-project memory architectures, and CLAUDE.md templates:

**Pro ($29):** [Claude Memory Kit Pro on Gumroad](https://edgelessai.gumroad.com/l/claude-memory-kit)

The best time to set up memory is before your next session. Takes 15 minutes, saves hours every week.5:["$","$L3","how-claude-code-memory-works",{"post":{"slug":"how-claude-code-memory-works","title":"How Claude Code Memory Actually Works","description":"Claude forgets everything between sessions. Here's how file-based memory fixes that, and why it changes how you work with AI.","date":"2026-03-21","tags":["Claude Code","Memory","Developer Tools"],"readTime":"6 min","content":"$a"}}]
6:["$","$Lb",null,{}]
7:["$","script","script-0",{"src":"/_next/static/chunks/00~t2rnqpr69r.js","async":true}]
8:["$","script","script-1",{"src":"/_next/static/chunks/0jtxsm9n35d_u.js","async":true}]
9:["$","$Lc",null,{"children":["$","$d",null,{"name":"Next.MetadataOutlet","children":"$@e"}]}]
e:null
