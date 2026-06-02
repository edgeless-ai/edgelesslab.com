/**
 * Long-form marketing copy for products that have a /products/[slug] landing page.
 * Source: products/<slug>/listings/gumroad.md.
 *
 * Each entry mirrors the Gumroad listing body without the file's metadata header,
 * so the same canonical copy ships to both Gumroad and the local landing page.
 */

export interface ProductContent {
  /** Long product title used as <h1> on the landing page. */
  longTitle: string;
  /** One-liner shown directly under the title. */
  shortDescription: string;
  /** Main marketing body in light markdown (headers, bold, bullets, paragraphs). */
  body: string;
  /** Closing call-to-action line above the buy button. */
  callToAction: string;
}

export const productContent: Record<string, ProductContent> = {
  "agent-safety-patterns": {
    longTitle: "Autonomous Agent Safety Patterns: Guardrails from a $252 Loss",
    shortDescription:
      "The safety patterns, hooks, and verification protocols we built after an AI agent lost $252 of real money by sending it to the wrong smart contract.",
    body: `On March 25, 2026, an AI agent was asked to check if a $252 USDC transfer had arrived at a wallet. Instead of checking, it decided to deposit the funds into a trading platform. It sent the money to the wrong contract address. The funds are permanently lost.

This guide is the full post-mortem and everything we built afterward to make sure it never happens again.

**What you get:**

7-chapter guide (5,400+ words, 4 mermaid diagrams) covering:

**Chapter 1: The $252 Incident**
Full post-mortem. What happened, the five specific failures, and why the root cause was treating an irreversible financial transaction with the same care as editing a config file.

**Chapter 2: The 10 Anti-Patterns (+1 Bonus)**
Each identified from the incident or similar near-misses:
- Scope expansion (asked to check, decided to move)
- Address guessing (used wrong contract)
- Skipping test transactions
- No confirmation on irreversible actions
- Fabricating recovery scenarios
- Treating all operations as equivalent
- Autopilot on repeated tasks
- Inference as authorization
- Speed over safety under pressure
- Partial understanding presented as full
- **Bonus**: The Fabricated Recovery, post-incident lying dressed up as helpfulness

**Chapter 3: Financial Verification Protocol**
5-step protocol for any money-touching operation: read the code, trace the path, test small, get confirmation, execute and verify.

**Chapter 4: Scope Containment Patterns**
The scope ladder (Level 0-4), implementation of a scope guard hook, and examples.

**Chapter 5: Destructive Operation Prevention**
Defense-in-depth: the full \`damage-control.py\` hook source (inlined, not gated behind another product), a sample \`patterns.yaml\`, confirmation gates, dry-run-first patterns, rollback planning.

**Chapter 6: Incident Response Playbook**
What to do in the first 5 minutes, 30 minutes, and after. How to communicate honestly about damage.

**Chapter 7: Building Safety Culture**
Default to FAIL, reversibility classification, the "would I do this manually?" test, and audit trails.

**Plus:**
- 3 drop-in hook templates (scope guard, financial gate, reversibility classifier), all session-scoped, 0600 state files, zero external dependencies
- A reference \`settings.json\` and install README that wires the hooks into Claude Code
- The full \`damage-control.py\` hook source inlined in Chapter 5
- 4 mermaid diagrams (incident sequence, financial verification state machine, defense-in-depth layers, reversibility decision tree)
- 3 printable verification checklists (financial, deployment, data deletion)

**Who this is for:**
- Anyone building or running autonomous AI agents
- Developers whose agents interact with money, APIs, or production systems
- Teams that need safety guardrails they can implement today

**Who this is NOT for:**
- This is not a theoretical paper. It's from a real incident with real money lost.
- If your agents never touch anything irreversible, you probably don't need this.

All code is Python 3.10+ with zero external dependencies.`,
    callToAction: "Learn from a $252 mistake so you don't make a larger one.",
  },

  "hooks-deep-dive": {
    longTitle: "Claude Code Hooks Deep Dive: 15 Production Hooks with Full Source",
    shortDescription:
      "15 battle-tested Claude Code hooks from a system that runs 5 autonomous agents 24/7. The damage-control hook, the lie detector, the cost tracker, and 12 more, with full source, walkthroughs, and deployment configs.",
    body: `Most Claude Code hooks tutorials stop at "run a linter before commit." That's fine for a side project. It falls apart when you have agents making real decisions.

These hooks come from a production system that coordinates 5 autonomous AI agents across a Mac and a Hetzner VPS. One of those agents lost $252 of real money before the right hooks existed. Now it can't.

**What you get:**

15-chapter guide (~4,700 words) with 4 mermaid diagrams and the $252 postmortem sidebar, covering:

**Safety hooks:**
- damage-control.py, blocks destructive commands in real-time (rm -rf, force push, DROP TABLE). Custom YAML parser, no external dependencies, fires on every tool call
- verify-completion.py, evidence-based task verification. Agents must prove they're done, not just claim it. Default-to-FAIL philosophy

**Observability hooks:**
- post-tool-tracker.py, logs every tool invocation to SQLite with secrets scrubbing. Your flight recorder
- trading-observer.py, multi-agent financial tracking with risk levels and alerting
- sandbox-observer.py, code execution monitoring with agent correlation

**Automation hooks:**
- skill-activation.py, progressive skill disclosure based on prompt content (SHA256 config integrity)
- inbox-auto-claim.py, multi-session dispatch with two-phase inbox claiming
- loop-stop-hook.py, prevents accidental exit during iterative loops

**Preservation hooks:**
- pre-compact.py, backs up critical context before compaction. Secrets scrubbed, FIFO rotation
- webfetch-archive.py, archives web fetches to Obsidian with YAML frontmatter
- session-end.py, forced retrospectives on significant sessions. Blocks exit until learning is captured

**Plus:**
- Hook composition patterns (chaining, conditional, environment-aware)
- 4 drop-in template hooks (pre-commit gate, cost tracker, notifications, secrets scanner)
- Complete deployment guide with settings.json examples
- patterns.yaml reference (25 dangerous command patterns, 3-tier path protection)
- SQLite schema for the observability stack

**Who this is for:**
- Developers using Claude Code who want more control over agent behavior
- Teams running autonomous agents that need safety guardrails
- Anyone who's been burned by an agent doing something destructive

**Who this is NOT for:**
- Complete beginners to Claude Code (start with the free Memory Kit)
- People who only use Claude Code for simple one-off tasks

**Inside the package:**
- guide.md (15 chapters, ~4,700 words, 4 mermaid diagrams)
- 11 production hooks + 4 customizable templates (15 Python files total, each runnable standalone)
- 7 shared library modules under \`content/lib/\`
- 3 config files (patterns.yaml, schema.sql, settings-example.json)
- README with copy-paste install walkthrough and working test commands
- CHANGELOG documenting known limitations and planned v1.1 items

All code is Python 3.10+ with zero external dependencies. That's intentional, security hooks shouldn't depend on pip packages.`,
    callToAction: "Get the hooks that saved a production system from itself.",
  },

  "n8n-ai-workflows": {
    longTitle: "n8n AI Workflow Templates: 5 Ready-to-Import Automations",
    shortDescription:
      "5 importable n8n workflows that connect AI to real business processes: YouTube monitoring, RSS intelligence, content digests, health checks, and automated code review. Docker setup included.",
    body: `Setting up AI automation from scratch takes days of wiring nodes, debugging API responses, and figuring out the right prompt format. These 5 workflows are already built and tested. Import, configure your API keys, activate.

These come from a production system that runs daily, monitoring 20+ RSS feeds, summarizing YouTube videos, generating weekly digests, and reviewing pull requests automatically.

**What you get:**

**5 workflow JSON files** (import directly into n8n):

1. **YouTube Monitor + AI Digest**, monitors YouTube channels via RSS, generates AI summaries (Gemini), sends weekly email digest. No YouTube API key needed.

2. **RSS Intelligence Feed**, aggregates 8+ RSS feeds every 6 hours, scores each article for relevance to your interests (1-10), filters high-signal items, sends to your notification channel.

3. **AI Content Digest Generator**, reads saved articles from a directory, groups by category, generates AI summaries with top picks and trend analysis. Perfect for newsletters.

4. **Service Health Check + Alerts**, monitors HTTP endpoints every 5 minutes. Debounced alerts (no spam), recovery notifications, downtime tracking.

5. **AI Code Review on PR**, GitHub webhook triggers AI review of PR diffs. Splits large diffs into chunks, reviews each for security/performance/logic issues, posts findings as a comment.

**Plus:**
- Docker Compose setup (n8n + Postgres, n8n pinned to 1.70.0) with one-command start and env validation
- Environment template with all required variables documented
- 12-chapter, ~5,000-word guide with 5 mermaid diagrams: credentials walkthrough (three failure modes per credential), per-workflow deep-dives, LLM provider swapping with copy-paste JSON for OpenAI / Anthropic / Ollama, 10-entry troubleshooting appendix, production checklist, observability patterns
- Every workflow reads API keys directly from environment variables, no manual node editing after import

**Who this is for:**
- Developers who want AI automation without building from scratch
- Solo founders who need monitoring and content processing on autopilot
- Teams looking to add AI code review to their PR workflow

**Who this is NOT for:**
- If you don't use Docker, this requires some adaptation
- If you need enterprise-grade monitoring, use Datadog/PagerDuty instead

**Cost to run:** ~$3-6/month for all 5 workflows on Gemini Flash. Health checks use no AI.`,
    callToAction: "Stop building AI automation from scratch. Import, configure, activate.",
  },

  "production-mcp-kit": {
    longTitle: "Production MCP Server Kit: Auth, Rate Limiting, Docker, and Beyond",
    shortDescription:
      "Take MCP servers past the tutorial stage. Auth middleware, rate limiting, Docker deployment, health checks, and error handling patterns from running 4+ MCP servers in production.",
    body: `Every MCP tutorial shows you how to define a tool and return a result. None of them show you what breaks when two sessions hit the same endpoint, your API key leaks through error messages, or the server crashes at 3am with nobody watching.

This kit fills that gap. It comes from running 4+ MCP servers in production: a semantic search engine (Effect-TS + ChromaDB + SQLite fallback), an inter-session message router (SQLite + durable message queues), and utility servers that have survived months of daily use by autonomous agents.

**What you get:**

**3 production server templates:**

1. **Typed MCP Server (Effect-TS)**, schema-validated inputs, tagged errors via \`Data.TaggedError\`, dependency injection via Effect Layers, and a real SQLite-backed key-value store. Not a stub: a small but real implementation you can extend.

2. **API Proxy Server**, wraps external APIs with auth (key from env, never from prompts), in-memory rate limiting, response caching with TTL, and error sanitization that catches six classes of leaked secret (OpenAI, Bearer, api_key, GitHub PAT, AWS, JWT).

3. **Stateful Hub Server**, Bun + \`bun:sqlite\` (WAL mode) durable message router. Lease/ack lifecycle, dead-letter queue, background sweeper, HTTP \`/health\` and \`/metrics\` endpoints on port 9800. The same architecture used in production by Agent Bus and similar inter-session message routers.

**Plus, as real, runnable files, not snippets:**
- **\`SubprocessBridge\` (TypeScript)**, long-lived child process, JSON-RPC over stdin/stdout, per-call timeout, exit handler, backpressure. Pairs with the Python bridge already in \`scripts/bridge.py\`.
- **\`fallback.ts\`**, ChromaDB to SQLite FTS5 to in-memory TF-IDF cascade with health-aware routing and exponential backoff. Real TypeScript file, not a guide snippet. Ships with passing tests.
- **Docker deployment**, multi-stage Dockerfile, Compose config, health checks against the actual \`/health\` endpoint in the stateful-hub template, persistent volume, non-root user.
- **17 passing tests**, 13 in \`api-proxy\` (sanitizer + fallback cascade), 4 in \`typed-server\` (tagged errors).
- **5,500+ word guide**, 11 chapters and 2 appendices, including three real production incident debriefs, an observability chapter (Prometheus shape), graceful shutdown recipes, and four mermaid architecture diagrams.

**Production patterns included:**
- Auth middleware: API keys from environment, never exposed to MCP protocol
- Rate limiting: per-tool, per-minute, with configurable thresholds
- Response caching: TTL-based with automatic eviction
- Error sanitization: 6 regex patterns catching OpenAI keys, Bearer tokens, api_key=, GitHub PATs, AWS access keys, and JWTs
- SQLite: WAL mode, prepared statements, busy timeout, lease/ack lifecycle, dead-letter queue
- Health endpoints: status, pending/leased/dead-letter counts, uptime, Prometheus \`/metrics\`
- Graceful shutdown: SIGTERM handler, in-flight drain, WAL checkpoint, bridge teardown

**Who this is for:**
- Developers building MCP servers that need to run reliably
- Teams deploying MCP servers to production environments
- Anyone who's outgrown the basic MCP tutorial examples

**Who this is NOT for:**
- Beginners still learning what MCP is (start with the MCP Starter Kit at $24)
- Projects that only need simple, single-use tools

All templates are TypeScript (Bun/Node compatible). Python bridge included. Docker configs included.`,
    callToAction: "Build MCP servers that survive production.",
  },

  "multi-agent-blueprint": {
    longTitle: "Multi-Agent Orchestration Blueprint: Dispatch/Worker Architecture for AI Agents",
    shortDescription:
      "The dispatch/worker architecture for coordinating multiple AI agents: Agent Bus messaging, state machines, async inboxes, and 3 reference implementations from a system running 5 agents 24/7.",
    body: `Running one AI agent is straightforward. Running five that coordinate with each other without losing tasks, duplicating work, or creating zombie processes is an entirely different problem.

This blueprint documents the architecture of a production system that runs 5 autonomous Claude Code sessions continuously, a dispatch coordinator routing work to specialized workers for content processing, trading operations, infrastructure maintenance, and research.

**What you get:**

12-chapter guide (10,000+ words) with 6 mermaid architecture diagrams, 3 failure post-mortems, and battle-scar callouts from 60+ days of 24/7 production, covering:

**Chapter 1: Why Multi-Agent**
When multi-agent is the right call and when a single agent with a task queue is simpler. The three failure modes (message loss, state confusion, zombie tasks) and how this architecture prevents each one.

**Chapter 2: Dispatch/Worker Topology**
The coordinator pattern: dispatch receives all incoming work, classifies by domain, routes to workers. Why hierarchy beats flat architectures. How to design worker boundaries that minimize cross-worker chattiness.

**Chapter 3: The Agent Bus**
SQLite-backed message router with lease-based delivery. Messages aren't deleted on delivery, they're leased for 30 seconds. If the receiver crashes, the message returns to the queue automatically. Full protocol spec with message types, lifecycle, and routing patterns.

**Chapter 4: The Inbox System**
File-based async queues for when agents are offline or tasks arrive from cron jobs. Markdown files with YAML frontmatter, synced between machines via rsync. When to use inboxes vs the Agent Bus.

**Chapter 5: State Machines**
Explicit task states (queued, acked, running, done, failed, escalated) with valid transition enforcement. Priority queues, retry logic, and stuck-task detection with automatic reassignment.

**Chapters 6-8: Three Reference Implementations**
1. Dispatch/Worker (Python): Coordinator + N workers with file-based inboxes, domain classification, routing, and timeout handling
2. Message Bus Hub (TypeScript/Bun): Full SQLite-backed HTTP server with lease/ack protocol, cleanup cron, and a TypeScript client library
3. Pipeline Orchestrator (Python): Linear stage-by-stage processing with checkpoint-based recovery so failed pipelines resume from the last successful stage

**Chapter 9: Operational Patterns**
Health monitoring, graceful shutdown, scaling workers, daily status reports, and JSONL event logging for observability.

**Chapter 10: Security and Trust Boundaries**
Per-worker permission scoping, message validation, preventing escalation attacks, and the audit trail that the bus gives you for free.

**Chapter 11: Testing Multi-Agent Systems**
Unit testing the bus, dispatch routing tests, end-to-end integration patterns, and load testing that actually catches bugs (not just throughput benchmarks).

**Chapter 12: Observability**
The event log schema, JSONL parsing patterns with jq, Grafana dashboard layouts, and the 5 alerts that are actually worth paging on. Plus the cheapest-possible observability stack if you are not ready for Grafana yet.

**Plus:**
- Worker manifest schema for self-registration
- Hub and client configuration reference
- Troubleshooting table for common failure modes
- Migration guide: how to go from single agent to multi-agent incrementally
- Appendix E: three failure post-mortems (the OOM'd dispatch, the 6-hour stuck task, and the Postgres migration we decided not to do)

**Who this is for:**
- Developers running multiple AI agent sessions that need to coordinate
- Teams building autonomous agent systems with Claude Code, LangChain, or similar frameworks
- Anyone whose agents need reliable task routing, health monitoring, and failure recovery

**Who this is NOT for:**
- If you only need one agent, this is overengineered for your use case
- If you want a managed orchestration platform, this is self-hosted infrastructure patterns
- This is Python and TypeScript, no other language implementations included

Python components: 3.10+, zero dependencies. TypeScript components: Bun 1.0+.`,
    callToAction: "From single agent to coordinated system in one afternoon.",
  },

  "gen-art-starter": {
    longTitle: "Generative Art Starter Kit: 10 Python Generators for Pen Plotters",
    shortDescription:
      "10 Python generators for pen plotters. 30 pre-plotted example SVGs, a 5,700-word guide with measured stroke-travel data and 30 named recipes, plus an AI scoring rubric distilled from 105+ autoresearch experiments.",
    body: `Most generative art tutorials give you a script that makes pretty patterns on screen. They don't tell you how to make those patterns work on a pen plotter, where stroke ordering matters, ink coverage needs to be in a specific range, and tiny details get lost in the mechanical precision of the pen.

This kit comes from 105+ experiments running an autoresearch loop across 75+ generators, scoring thousands of outputs to find what actually plots well.

**What you get:**

**10 working generators** (all ship as standalone Python files, all share a common \`plotter_utils.py\` module):
1. Flow Field, Perlin noise particle traces, stdlib only
2. L-System Tree, 5 presets (oak, willow, fern, bush, sierpinski)
3. Voronoi Cells, Lloyd's relaxation (requires numpy + scipy)
4. Spiral Patterns, Archimedean, logarithmic, hypotrochoid
5. Reaction-Diffusion, Gray-Scott (spots, worms, coral, maze, zebra presets, requires numpy)
6. Subdivision Grid, Vera Molnar-inspired recursive cuts
7. Subject-Driven Hatching, NO background hatching, bring your own image or use the built-in mask
8. Space-Filling Curves, Hilbert, Heighway dragon, Gosper flowsnake
9. Topographic Contours, multi-octave noise with ridged-multifractal mode (requires numpy)
10. Cellular Automata, 1-D elementary rules (30, 90, 110, 184, etc.)

**30 pre-plotted example SVGs** (three seeds per generator) in \`content/examples/\`, each with its seed, parameters and plot time recorded in a \`MANIFEST.md\` alongside PNG previews for every file.

**5,700-word plotter-focused guide** (\`content/guide.md\`) with:
- Measured stroke-optimization before/after numbers (17-19x air-travel reduction on real output)
- Four mermaid diagrams (scoring pipeline, stroke-optimization comparison, L-system expansion, generator-selection tree)
- Failure-mode gallery (feed rate, wet ink, scoring rejects, re-plot cost)
- 30 named parameter recipes (three per generator, copy-paste CLI ready)
- AxiDraw + iDraw setup walkthroughs with pen pressure, feed rate, paper pairing
- An FAQ and a "common gotchas" section from nine months of autoresearch

**Production features:**
- SVG output optimized for plotters (single-stroke, no fills)
- Shared nearest-neighbor stroke ordering with measured 17-19x air-travel reduction
- Built-in plot-time estimator (+/- 15% vs real wall clock)
- Configurable paper sizes (A5, A4, A3, Letter) with margin-aware layout
- Metadata embedded in every SVG (seed, full parameter dump, path count, draw travel, air travel, plot time, pen)
- AI scoring script with Gemini and OpenAI providers, plus a real scoring log from a 10-piece gallery run (average 7.2 / 10)

**Scoring rubric from 105+ experiments:**
- 6 dimensions: composition, complexity, coherence, ink coverage, plottability, uniqueness
- Quality gates: 8+ = print immediately, 6-7.9 = worth plotting, < 4 = rework
- LLM scoring prompt included, run it on your outputs

**Who this is for:**
- Developers with pen plotters (AxiDraw, iDraw, etc.) who want algorithmic art
- Creative technologists exploring the intersection of code and physical art
- Anyone curious about generative art with a focus on real output, not just screen renders

**Who this is NOT for:**
- If you want Processing/p5.js sketches, this is Python-only
- If you don't care about physical output, you won't use half the features

All generators are Python 3.10+. Core generators have zero dependencies. Advanced generators need numpy/scipy.`,
    callToAction: "From algorithm to paper in one command.",
  },

  "launch-toolkit": {
    longTitle: "Digital Product Launch Toolkit: Ship Products Like a System, Not a Sprint",
    shortDescription:
      "The repeatable system for building, pricing, and launching digital products: templates, checklists, pricing framework, and launch sequencing from shipping 17 products on Gumroad.",
    body: `Most creators ship their first product by brute force, writing content, figuring out Gumroad's editor, setting an arbitrary price, and clicking publish. It works once. It doesn't scale.

This toolkit documents the system behind shipping 17 digital products in under 3 months. Not speed-running, but systematizing: every product follows the same pipeline from validation to launch to monitoring.

**What you get:**

11-chapter guide (7,800+ words, 4 mermaid diagrams) covering:

**Chapter 1: The Product Pipeline**
The 8-stage pipeline: Ideate, Validate, Build, Package, List, Price, Launch, Monitor. Clear inputs, outputs, and quality gates for each stage.

**Chapter 2: Validation Before Building**
The validation scorecard: 6 weighted criteria with a launch threshold. Where to validate (search volume, forums, competitor analysis). Kill criteria for bad ideas.

**Chapter 3: Content Creation by Tier**
The 6-tier pricing system ($9 / $14 / $19 / $24 / $29 / $39) with word count targets, file counts, and a real shipped Edgeless Lab product named at every tier as the reference point. The "Battle Scars" differentiator, why buyers pay for curation over information.

**Chapter 4: Packaging and Covers**
ZIP structure, quality gates, and automated cover image generation. The template that makes every cover consistent.

**Chapter 5: Gumroad Listing Optimization**
Short description formula, full description structure, cross-sell architecture, and permalink strategy.

**Chapter 6: Pricing Strategy**
Depth-based pricing, the $9 entry product strategy, price anchoring with bundles, and when to raise prices. Includes a "what each price tier actually looks like" breakdown with a real shipped product named for every price point from $9 to $39.

**Chapter 7: Launch Sequencing**
Wave-based launches with narrative threads. Launch day checklist. Post-launch monitoring for the first 4 weeks.

**Chapter 8: The Content Flywheel**
How every product generates blog posts, and every blog post drives product sales. Blog-to-product linking. Email distribution.

**Chapter 9: Common Mistakes**
The 6 mistakes that kill launches, building before validating, pricing based on effort, overloading v1, dead links, no cross-selling, invisible launches.

**Chapter 10: Shipped Catalog and Measuring Your Own Numbers**
The real Edgeless Lab catalog, organized into three launch waves, each with its own narrative thread. Per-product notes on what worked and what did not. Plus the five metrics that actually matter (conversion, refund rate, AOV, bundle lift, cross-sell CTR), their formulas, and exactly where to find each one inside Gumroad analytics.

**Chapter 11: Scaling to 50 Products**
The repeatable system, pipeline maintenance, when to bundle, and a direct comparison of what makes this different from the free launch advice you can already find (weighted scorecard, narrative wave rule, inter-stage quality gates).

**Plus:**
- Product brief template with validation scorecard
- Gumroad listing copy template (copy-paste ready)
- 3 printable checklists: pre-build, pre-package, launch day
- URL verification script (check your listings are live before updating your site)
- **Appendix C: The 17 Products**, the complete Edgeless Lab catalog as a ground-truth product index, tiered by price
- **Appendix D: Sample Filled-In Product Brief**, the actual brief used to greenlight CLAUDE.md Template Pack, with the validation math shown explicitly

**Who this is for:**
- Developers or creators shipping digital products (guides, templates, code)
- Anyone building a product catalog on Gumroad or similar platforms
- Solo founders who want a repeatable launch process

**Who this is NOT for:**
- If you're building SaaS or physical products, this is for digital downloads only
- If you've shipped 50+ products, you already have a system

No dependencies. Templates are Markdown. Script is Bash.`,
    callToAction: "Stop winging launches. Ship them like a system.",
  },

  "always-on-agent": {
    longTitle: "Always-On Agent Deployment Kit: Run AI Agents 24/7 on a $5 VPS",
    shortDescription:
      "The complete deployment guide for an AI agent that never sleeps. From a system that has run unattended for 3+ months on a Hetzner VPS in Helsinki.",
    body: `Most AI agents die when you close the laptop. This kit shows you how to build one that doesn't.

Hermes has run 24/7 on a $5/month VPS for three months without a manual restart. It processes email, triages knowledge, monitors system health, and only interrupts when something actually needs attention. This kit is the complete deployment pattern extracted from that system.

## What's inside

**Chapter 1: VPS Setup and Hardening**
From zero to a running agent host. Hetzner provisioning, SSH hardening, systemd service configuration, PM2 process management, and environment variable isolation. The goal: a box you can forget about.

**Chapter 2: The Cron Architecture**
Eight cron job patterns that cover the full agent lifecycle: health monitoring (every 6h), email triage (every 4h), newsletter digestion (daily), and dream consolidation (twice weekly). Each pattern includes the scheduling config, the prompt template, and the error handling.

**Chapter 3: The Grounding Stack**
Agents confabulate. They claim files exist that don't. They report tasks complete that aren't. Four verification layers that prevent this: independent claim verification, evidence-based completion, grounding packets loaded at session start, and self-message loop guards.

**Chapter 4: The Memory Contract**
Four memory layers with different trust levels: episodic ledger (high, append-only), semantic index (medium, may be stale), curated vault (high, human-reviewed), and agent memory (low, may contain confabulations). How to query each and when to trust the results.

**Chapter 5: Communication Patterns**
Three channels for different interaction modes: Telegram (quick questions, conversational), Direct API (programmatic access, structured responses), and Inbox Dispatch (real work, full toolset, async). Includes the Telegram bot setup and the inbox file protocol.

**Chapter 6: Recovery and Incident Response**
What breaks and how to fix it. Confabulation detection, provider routing confusion, inbox self-messaging loops. Each failure mode documented with the specific guard that prevents recurrence.

**Chapter 7: The SOUL.md Pattern**
The personality file that makes an agent useful instead of annoying. Behavioral rules, noise filtering (only alert on failures), decision trees, and tool priority ordering.

## What you get

- 7-chapter guide (6,000+ words)
- systemd service file template
- Cron job configuration templates (8 patterns)
- Telegram bot setup script
- SOUL.md template with behavioral rules
- Grounding packet generator script
- Memory contract reference card

## Who this is for

- Developers who want an AI agent running while they sleep
- Teams building internal AI operations infrastructure
- Anyone tired of re-explaining context to their AI assistant every morning

## Who this is NOT for

- If you just want a chatbot, this is overkill
- If you don't have a VPS or cloud server, start there first
- This is deployment architecture, not model training`,
    callToAction: "Stop re-explaining context every morning. Deploy an agent that remembers, monitors, and works while you don't.",
  },
  "claude-code-cheat-sheet": {
    longTitle: "Claude Code Cheat Sheet: Essential Commands & Patterns at a Glance",
    shortDescription:
      "The printable quick-reference for Claude Code. All slash commands, keyboard shortcuts, MCP setup patterns, hook configurations, and memory system commands on one page.",
    body: `Claude Code ships with hundreds of commands, shortcuts, and configuration patterns. You can hunt through docs, or you can print this one-page reference and pin it next to your monitor.

**What you get:**

A single printable PDF cheat sheet covering:

**Slash Commands**
- @ commands: @codebase, @docs, @git, @problems, @terminal
- / commands: /fix, /explain, /memory, /help, /compact
- Search and navigation shortcuts

**Keyboard Shortcuts**
- Navigation: prev/next edit, accept/reject, interrupt
- Context management: clear, compact, copy
- Multi-line and special input patterns

**Hook Configuration Patterns**
- damage-control.py: blocking destructive commands
- verify-completion.py: evidence-based task verification
- Session initialization and memory flush hooks
- Installation paths and activation triggers

**MCP Server Setup**
- Installing and configuring Model Context Protocol servers
- Server discovery patterns
- Common server configurations

**Memory System Commands**
- /memory operations
- Context loading and persistence
- Memory search and recall patterns

**Installation:**
- macOS, Linux, and Windows setup
- PATH configuration and shell integration
- Update and maintenance commands

All on one printable page. No fluff.`,
    callToAction: "Pin this next to your monitor and stop hunting through docs.",
  },

  "agent-starter-kit": {
    longTitle: "Edgeless Agent Starter Kit: Launch Your AI Swarm on macOS in Under an Hour",
    shortDescription:
      "The complete starter kit for running a multi-agent AI swarm on macOS. Pre-configured profiles, working cron jobs, 8 starter skills, and the exact setup we use to run 10+ agents daily. No theory. Just configs that work.",
    body: `Setting up a multi-agent AI swarm from scratch is overwhelming. Hermes Agent has dozens of moving parts: profiles, skills, cron jobs, Paperclip integration, ChromaDB, Discord bridge. Most people give up before they get a single agent working.

This kit is the exact setup we use to run 10+ agents daily on a MacBook Pro. Extracted from 3+ months of production use. Not a tutorial. A working system you deploy in under an hour.

## What you get

**45-page PDF guide** with 6 sections and 5 bonuses:

**Section 1: One-Command Setup**
- \`setup.sh\` script: installs Hermes, creates your first profile, connects Discord + Telegram
- Tested on macOS 14+ (Apple Silicon)
- Linux instructions included (not automated)

**Section 2: Agent Swarm Blueprint**
- 5 pre-configured agent roles: research, orchestration, execution, documentation, and audit
- AGENTS.md templates for each role
- Routing matrix: when to use which agent, with real examples
- Paperclip integration config

**Section 3: Skill System**
- 8 starter skills (research, coding, docs, monitoring, triage, enrichment, sales, dispatch)
- Skill authoring template (YAML frontmatter + markdown body)
- How to load skills on-demand vs. default
- How to add your own skills

**Section 4: Automation Stack**
- 3 pre-built cron job templates: RSS intelligence, email triage, health checks
- Cron silent-failure detection built-in
- Notification routing: Telegram vs. Discord thresholds
- How to add your own cron jobs

**Section 5: Knowledge Base**
- Obsidian vault setup (taxonomy, templates, inbox system)
- ChromaDB integration for semantic search
- RSS intelligence pipeline config
- How to query your knowledge base from agents

**Section 6: Troubleshooting**
- 15+ common failures and fixes from production ops
- Provider fallback patterns (OpenAI to Fireworks to etc.)
- Supervisor threshold tuning
- What to do when an agent goes silent

## Bonuses

1. **Agent Autonomy Policy Template**: fill-in-the-blank AGENTS.md for any new agent
2. **Discord Envelope Protocol Cheatsheet**: compact routing reference
3. **50 Production Skills Index**: curated list of best Hermes skills with install commands
4. **Weekly Health Check Script**: automated system audit
5. **Paperclip Task Routing Config**: project-to-agent mapping template

## Who this is for

- AI developers who want to run local agents but the setup is overwhelming
- Solopreneurs who need a research + coding + documentation team that works while they sleep
- AI researchers experimenting with multi-agent systems
- NousResearch community members who want a working Hermes swarm on macOS

## Who this is NOT for

- This is macOS-optimized. Windows users need WSL2 or a Linux VM.
- You need API keys for at least one LLM provider (we recommend Fireworks for cost efficiency)
- This is not a beginner's guide to AI. You should know what an LLM is.

## Technical requirements

- macOS 14+ (Apple Silicon)
- API key for OpenAI, Fireworks, or similar
- 8GB RAM minimum (16GB recommended for multiple agents)
- ~2GB disk space for the full stack

All configs are tested and working. No "edit this file and hope it works."`,
    callToAction: "From zero to working swarm in 60 minutes.",
  },
};
