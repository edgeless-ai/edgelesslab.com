import { BlogPost } from "./blog";

export const newPosts: BlogPost[] = [
  {
    slug: "skillopt-self-evolving-agent-skills",
    editorial: true,
    title: "SkillOpt: Stop Writing Agent Skills, Start Optimizing Them",
    description: "A new optimizer treats an agent's skill document as trainable state, accepting edits only when they measurably improve a held-out score, because LLMs reading a skill can't tell good from bad.",
    date: "2026-06-01",
    tags: ["AI Agents", "Agent Skills", "Optimization", "Research"],
    readTime: "6 min",
    content: `
# SkillOpt: Stop Writing Agent Skills, Start Optimizing Them

If you have shipped an agent with a hand-written skill file, you have run a quiet experiment whose result you never measured. You wrote down some instructions, the agent read them, and you assumed the agent got better. Maybe it did. Maybe the skill made it worse on a third of your tasks and you never noticed, because "the agent has a skill now" felt like progress and you moved on.

That assumption is the thing two new papers take apart. The companion study, *From Raw Experience to Skill Consumption* (arXiv:2605.23899), reports two findings that should change how anyone building agents thinks about skills. First, model-generated skills help in only about 75% of extractor-target pairings the authors test; the other 25% show negative transfer, where the skill makes the consuming model worse (delta below zero). Skills are beneficial on average, but a quarter of the time they actively hurt, and which quarter depends on the domain and the model pairing in ways you cannot eyeball. Second, and this is the load-bearing result, the paper reports that LLM judges are 46.4% worse than chance at telling effective skills from ineffective ones by reading them.

Sit with that. The standard workflow for skills is: write a skill, read it back, decide it looks good, ship it. The papers' evidence says the "read it back and decide it looks good" step is worse than a coin flip. The text of a skill does not tell you whether the skill works. You have to run it.

That is the premise behind *SkillOpt: Executive Strategy for Self-Evolving Agent Skills* (arXiv:2605.23904, Yang et al., submitted 22 May 2026, revised 25 May 2026), and it is the cleanest reframing of agent skills we have seen. SkillOpt stops treating a skill as documentation the agent reads and starts treating it as the trainable external state of a frozen agent. You do not optimize the model's weights. You optimize one skill document by running it against tasks and measuring what happens.

:::metric
52 / 52 | benchmark cells won or tied
+39.0 | biggest single-task lift (OfficeQA)
46.4% | worse than chance at reading skills
:::

## How it works

The mechanism borrows the discipline of weight-space optimization and applies it to text. A separate optimizer model looks at scored rollouts, the agent's actual attempts at tasks with their outcomes, and proposes bounded edits to a single skill document: add a line, delete a line, replace a span. Crucially, an edit is accepted only when it strictly improves a held-out validation score. This is the part that matters. It is not "the optimizer thinks this edit is better." It is "this edit measurably raised the score on held-out tasks, or it does not go in." The validation gate is execution-grounded, which directly answers the SkillLens finding: you cannot judge a skill by reading it, so SkillOpt never asks anything to read it. It runs it and keeps score.

:::flow The SkillOpt optimization loop
run the skill -> score the rollouts -> propose a bounded edit -> test on held-out tasks -> keep only if the score improves
:::

The training loop has a few stability mechanisms worth naming because they are where this stops being a toy. There is a textual learning-rate budget that caps how much the document can change per step, so the skill does not thrash. There is a rejected-edit buffer that remembers what did not work. And there is an epoch-wise slow/meta update that does the equivalent of a coarser, slower correction on top of the per-step edits. If you have trained models, this rhymes: a fast inner loop bounded by a learning rate, plus a slower outer correction, plus memory of failed moves. The novelty is doing it in token space against an execution metric instead of in weight space against a loss.

The payoff at deployment is the cleanest part of the pitch. SkillOpt adds zero inference-time model calls. The optimization cost is paid once, during training. What ships is a compact document, on the order of a few hundred to a couple thousand tokens, that the agent loads like any other skill. No extra orchestration, no judge-in-the-loop at runtime, no added latency.

## The numbers

Across 6 benchmarks, 7 target models, and 3 execution harnesses (direct chat, the Codex agentic loop, and Claude Code), SkillOpt is reported best or tied on all 52 evaluated (model, benchmark, harness) cells. It beats every per-cell competitor the authors line up against: human-written skills, one-shot LLM-generated skills, Trace2Skill, TextGrad, GEPA, and EvoSkill. Winning or tying every single cell is the kind of result that invites suspicion, and we will get to the caveats, but the breadth is the point: this is not a win on one favorable benchmark.

On GPT-5.5 in direct chat, SkillOpt lifts average no-skill accuracy by +23.5 points. Inside the Codex agentic loop the lift is +24.8; inside Claude Code it is +19.1. The per-benchmark direct-chat numbers (drawn from the paper's extracted results rather than the abstract, so treat them as reported figures rather than independently verified) tell the more useful story about where skills help most:

:::bar-chart GPT-5.5 accuracy lift from SkillOpt, direct chat (points over no-skill)
OfficeQA | +39.0
SpreadsheetBench | +38.9
LiveMath | +29.3
DocVQA | +12.4
ALFWorld | +11.9
SearchQA | +9.6
:::

| Benchmark (GPT-5.5, direct chat) | No skill | SkillOpt | Lift |
|---|---|---|---|
| SpreadsheetBench | 41.8 | 80.7 | +38.9 |
| OfficeQA | 33.1 | 72.1 | +39.0 |
| LiveMath | 37.6 | 66.9 | +29.3 |
| DocVQA | 78.8 | 91.2 | +12.4 |
| ALFWorld | 83.6 | 95.5 | +11.9 |
| SearchQA | 77.7 | 87.3 | +9.6 |

The pattern is legible. The biggest gains are on structured, procedural tasks where a model knows the building blocks but botches the process, spreadsheets and office documents nearly double. The smallest gain is on SearchQA, where the task is closer to "retrieve and answer" and there is less procedure to encode. This is a useful prior for your own work: SkillOpt-style optimization will pay off most where your agent fails on *how to do the thing* rather than *whether it knows the thing*.

Smaller models benefit too. The reported average direct-chat lift across all seven models is roughly +17.6 points, and the authors note a small model nearly doubling on DocVQA and tripling on ALFWorld. And the artifacts transfer: an optimized skill reportedly retains value across model scales, between the Codex and Claude Code harnesses, and even to a nearby math benchmark without re-optimization. That is consistent with the idea that what SkillOpt learns is procedural knowledge, and procedure is largely model-agnostic.

## The caveats, stated plainly

A few things keep us honest. The all-52-cells claim includes ties, and the transfer paper flags that some 2-to-5 point cross-harness wins over EvoSkill are plausibly within noise. Several of the most quotable numbers, the per-benchmark table above, the +17.6 all-model average, the per-baseline margins, come from extracted results rather than the verbatim abstracts, so they are second-hand within our reading. The two papers use partly different benchmark and model sets, so the 25% negative-transfer and 46.4%-worse-than-chance figures come from the SkillLens study, not from SkillOpt's own sweep. None of this sinks the thesis. It just means the headline should be the method, not any single delta.

## What this means if you build agents

The actionable takeaway does not require running SkillOpt. It requires adopting its discipline. If you maintain skill files, you are carrying skills you have never validated by execution, and the evidence says roughly a quarter of them may be net-negative on some of your tasks while looking perfectly reasonable on the page. Stop trusting the page. Build a held-out task set for each skill, run the skill against it, and keep the skill only if it beats the no-skill baseline. That is a weekend of harness work, and it converts "we have a skill for that" from a feeling into a measurement.

The deeper shift is conceptual. Treat skills like state you train, not prose you author. The skill document is the cheapest fine-tune you have: no GPUs, no weights, fully inspectable, transferable across models. The discipline that makes weight training trustworthy, a validation gate, a learning rate, memory of failures, ports directly. SkillOpt's contribution is showing that when you bring that discipline to text, the agent gets meaningfully better and pays nothing extra at inference. The maxim is worth taping to your monitor: don't read the skill, run it.
`,
  },
  {
    slug: "harness-is-the-moat",
    editorial: true,
    title: "The Harness Is the Moat: Why Owning Your Agent Orchestration Matters More Than Model Choice",
    description: "Models matter less and less. The system around the agent — the harness, the factory, the tokenomics — is where the real leverage lives. Here's what 49 missed YouTube videos taught us about agentic engineering.",
    date: "2026-05-31",
    tags: ["Agentic Engineering", "AI Infrastructure", "Claude Code", "Multi-Agent Swarm"],
    readTime: "9 min",
    content: `
# The Harness Is the Moat: Why Owning Your Agent Orchestration Matters More Than Model Choice

Two engineers using the exact same agent with 200K tokens can get massively different results.

The difference isn't the model. It's the harness — the system around the agent that determines what it can reach, how it reasons, and whether its output survives contact with reality.

After processing 49 missed YouTube videos through our knowledge pipeline, one theme cut through everything else: **agentic engineering is the compounding opportunity for senior engineers**, and the window is closing.

---

## What Karpathy Named at Sequoia

Andrej Karpathy named "agentic engineering" at Sequoia's AI Ascent. The framing was simple: the early window for building the systems that build systems closes by end of 2026. After that, it becomes the default — and the people who invested in their agentic layer early have an order-of-magnitude advantage.

The core insight: **whoever controls the agent harness controls your results.**

Models are converging. Claude, Gemini, Kimi, DeepSeek — the gap between frontier and near-frontier is narrowing. What isn't converging is the system around the model: the orchestration layer, the tool access, the verification gates, the token economics, and the institutional memory that lets an agent improve over time.

---

## The Five Pillars

Every high-performing agentic system we found in our knowledge base shares five structural properties:

### 1. Own Your Harness

Off-the-shelf tools — Claude Code, Codex, OpenCode — are "the floor, not the ceiling." They're excellent starting points. They're terrible finishing points.

The engineers winning in 2026 build one new custom harness every day. Not a new agent. A new harness: a composable, swappable, observable system that determines what the agent can see, what it can touch, and how its work gets validated.

Our own swarm runs on Hermes profiles with Claude Code as the base surface, Paperclip for task orchestration, and ChromaDB for memory. But the real leverage is in the layers above: the cron health checks, the skill lifecycle management, the adversarial verification gates, and the token budget discipline that prevents "dead useless cron jobs" from burning cash.

### 2. Build Factories, Not Features

The unit of work is no longer a feature. It's the system that builds the feature.

A software factory formalizes: plan → plan-review → scout → validate → build → test → review. Each step is reproducible. Each step is observable. The endpoint is zero-touch engineering: prompt → production.

Our YouTube intelligence pipeline is a factory. RSS intake → triage scoring → deep enrichment → newsletter synthesis → email delivery. Each stage is a distinct skill. The orchestrator is the factory. The model is just the engine inside one step.

### 3. Extensible by Design

"Open to extension, closed to modification" is no longer an abstract principle. It's survival strategy.

Models change. Tool APIs change. Rate limits change. A brittle codebase with cascading if-statements breaks every time the ground shifts. A pluggable, composable system absorbs change without rewrite.

This is why we built skills as atomic units with clear contracts. A summarizer doesn't know it's part of a triage pipeline. The orchestrator doesn't know what model it's calling. Each layer is replaceable.

### 4. Tokenomics as Business Model

Three levels of token economics:

- **Level 1**: Use more tokens. Burn budget. No value captured.
- **Level 2**: Make tokens useful. Generate output that matters.
- **Level 3**: Capture revenue. The token generates more value than it costs.

Only at level 3 do you turn agents always-on. A rising API bill is a productivity KPI — but only if you're past level 2.

The honest audit: 90% of agent cron jobs are dead useless. They run because they were built, not because they produce value. We recently killed four productive-looking crons that were actually burning tokens without generating actionable output. The fix wasn't better models. It was better governance.

### 5. Agentic Access

Agents only command what they can reach. Any token an agent burns *only because* it lacks direct API access is a token tax. Expose CLIs, REST, webhooks, and RPC everywhere. Then lock down the bash tool so no production database gets wiped by a misinterpreted prompt.

---

## The "Token Tax" in Practice

We found a concrete example in our own system. The YouTube transcript pipeline used to call an external API for every video. When that API hit rate limits, we switched to a local Supadata client. The token burn dropped 60% — not because we changed models, but because we removed a round-trip that was only necessary due to poor access design.

This is the pattern: **fix the harness, not the model.**

---

## What This Means for 2026

The model is the commodity. The harness is the moat.

If you're investing in AI infrastructure in 2026, invest in:

- Orchestration layers that outlive tooling
- Skill systems that compose without coupling
- Verification gates that catch errors before they ship
- Token budgets that map to value, not activity
- Institutional memory that survives sessions

The engineers who build these systems now will be the ones who define the standard by 2027. Everyone else will be renting harnesses that charge a tax on every token.

---

*This post is synthesized from 49 YouTube videos processed through our knowledge pipeline, including insights from IndyDevDan, ColeMedin, NateBJones, and the Anthropic engineering team.*
    `.trim(),
  },
  {
    slug: "prove-it-economy",
    editorial: true,
    title: "The Prove-It Economy: How AI Agents Are Already Shopping for You",
    description: "The web is shifting from attention to interpretation. AI agents now read, filter, and transact on your behalf. Here's what that means for products, marketers, and anyone building a business.",
    date: "2026-05-30",
    tags: ["AI Agents", "Marketing", "Agentic Discovery", "Truth Layer"],
    readTime: "8 min",
    content: `
# The Prove-It Economy: How AI Agents Are Already Shopping for You

The internet economy has been built on attention for 25 years.

That era is ending. Not gradually. Not theoretically. Now.

The shift is from attention to interpretation: AI agents read, filter, and transact on behalf of humans. The companies and individuals who build a provable, machine-legible "truth layer" will survive. Everyone else gets flattened into the internet average.

---

## The Sound System Test

Nate B. Jones bought a sound system last week. He didn't visit a website. He didn't read reviews. He didn't compare brands.

He told Claude his room dimensions, his budget, and his preference for warm vs. cool sound. Claude did the rest. The sound-system marketers "had nothing to do with" the choice.

This is the prove-it economy in action: **agents do the shopping whether people know they're using agents or not.**

The difference between attention and interpretation is the difference between shouting for eyeballs and being legible to an AI that does the vetting for the user.

---

## What Agents Need

Agents don't need emotional marketing copy. They need:

- **Structured data**: JSON schema, clean DOM, extractable datasets
- **Provable claims**: "This shoe uses a special spring system that reduces impact energy per step" — with the material, the mechanism, and the test data
- **Opinionated positioning**: "If you're not opinionated, you're flattened into the internet average for your category"

A shoe brand that says "we make the best running shoes" gets averaged out. A shoe brand that exposes the spring mechanism, the energy reduction data, and the knee-impact test results gets mapped to customer intent ("reduce impact on my knees") and selected.

---

## Two Paths to Purchase

There are now two ways anything gets bought:

1. **Agent interprets and transacts**: The AI does the comparison, reads the specs, and makes the call. The winner is the most legible, provable option.
2. **Brand loyalty so strong the human asks by name**: The person asks the agent for "that brand I saw at the event" and the agent is constrained to one option.

The second path is harder to build but more durable. It requires both human memory (emotional connection, trust, preference) and agent legibility (structured data, provable claims). The two must reinforce, not contradict.

**If your human brand says one thing and your agent-readable reality says another, you get weaker in both directions.**

---

## The Truth Layer for Individuals

The same logic applies to people. Hiring managers are literally trading prompts to find top candidates. The candidate with a polished LinkedIn profile and no provable skills gets flattened. The candidate with a live demo, a published pipeline, and a measurable result gets surfaced.

This is why we publish our agent infrastructure. The cron jobs, the triage pipelines, the knowledge base architecture — they're not just tools. They're a **truth layer** that proves what we can build.

---

## What to Build

If you're building anything in 2026:

1. **Audit your public surfaces for agent legibility**: Can an AI extract a clean dataset and form an opinionated signal?
2. **Build a truth layer**: Provable, specific, opinionated claims with the underlying data, not emotional copy.
3. **Map intent to capability**: How do customers phrase what they want? Does your structured data map those intents onto concrete features?
4. **Design for both internets**: Human-facing (memory, trust, preference) + agent-facing (clarity, structure, evidence).

The future belongs to people who are willing to be a little bit technical — but not engineers.

---

*This post draws from Nate B. Jones's analysis of the "prove-it economy" and our own experience building agent-readable infrastructure.*
    `.trim(),
  },
  {
    slug: "google-agentic-stack",
    editorial: true,
    title: "MCP, A2A, AG-UI: Google's Agent Stack and What Actually Matters",
    description: "Six protocols launched in 12 months. Only three are consolidating into the core agent stack. Here's the practical map for builders who don't have time to read the spec.",
    date: "2026-05-29",
    tags: ["MCP", "A2A", "AG-UI", "Agent Protocols", "Google I/O"],
    readTime: "10 min",
    content: `
# MCP, A2A, AG-UI: Google's Agent Stack and What Actually Matters

Six protocols. Twelve months. One acronym soup.

MCP, A2A, AG-UI, A2UI, AP2, X402. The agent protocol space is exploding, and most teams are over-focused on model selection while under-specifying the operating surface around the model.

Here's the practical map. Three protocols matter. Three are niche. The rest is noise.

---

## The Three Core Protocols

Every agent product must answer three questions:

1. **What can the agent use?** → MCP (tools/data)
2. **Who else can the agent work with?** → A2A (agent coordination)
3. **How does the human stay in control?** → AG-UI (human control layer)

### MCP: The Security Boundary, Not a Feature Toggle

MCP standardizes how agents discover and invoke tools. 14,000+ servers now. Claude, Codex, and Google all support it.

But MCP is not safe by default. It was designed for high-trust environments. Tool access enables arbitrary code execution. Invariant Labs documented tool-poisoning attacks that smuggle malicious instructions through tool descriptions.

**MCP needs scopes, approval flows, audit trails, and per-context tool visibility.** Treat it as a security boundary, not a feature toggle.

### A2A: The Agent Card

A2A is cross-organization agent delegation. The key primitive is the "agent card" — a published contract describing what the agent does, what skills it exposes, and how to reach it.

Launch partners: Atlassian, Box, MongoDB, PayPal, Workday. 50+ companies.

But A2A adds coordination cost: latency, failure, permission, and observability problems. Only adopt it when the workflow genuinely requires delegated expertise outside the primary agent.

### AG-UI: The Trust Layer

AG-UI is not about UI rendering. It's about human control over long-running, non-deterministic agents.

Traditional web apps can't handle streaming, mid-task discovery, or interruption. AG-UI specs cover: streaming, shared state, front-end tool calls, backend rendering, custom events, steering, and sub-agent composition.

**"An agent that can't show its work becomes supervision debt for humans."**

---

## The Three Niche Protocols

### A2UI: Structured UI Rendering

Sends declarative UI from an approved component catalog instead of arbitrary HTML/JS. Useful for safe agent-generated interfaces. Narrower than AG-UI.

### AP2: Agent Payments

Cryptographically signed "mandate" proving user authorization. 60+ collaborators including Amex, Coinbase, Mastercard, PayPal. The question: how does the ecosystem know the agent was authorized to buy?

### X402: HTTP-Native Payments

Coinbase's protocol for agent-to-agent resource payments. Cloudflare adopted it. Buy an API call, a dataset, or a benchmark run without an account or subscription.

---

## The Strategic Question

Does Google I/O 2026 stitch these into a single buildable operating model, or just add more standards to the pile?

The first half of 2026 was a golden time for building. The protocols are stabilizing. The question for the second half is whether the stack feels like one operating system or six competing standards.

---

## What to Build Now

1. **Audit your MCP servers**: scopes, approvals, audit trails. Read the Invariant Labs tool-poisoning research.
2. **Design AG-UI control points up front**: approval, edit, interrupt, cancel, progress visibility. Don't bolt them on reactively.
3. **Evaluate A2A only for genuine delegation**: cross-org workflows that need expertise you don't have.
4. **Watch payments carefully**: AP2 vs. X402 vs. Stripe. The UX details — fees, returns, re-authorization — matter more than the protocol.

The model is the engine. The operating surface is the car. Most teams are tuning the engine while driving without brakes.

---

*This post synthesizes Nate B. Jones's analysis of Google's agent stack and our own experience with MCP security and multi-agent orchestration.*
    `.trim(),
  },
  {
    slug: "infrastructure-nightmare",
    editorial: true,
    title: "The Infrastructure Nightmare Nobody Is Talking About",
    description: "App teams scale on AI scaling laws. Platform teams scale on human scaling laws. The gap is the new bottleneck.",
    date: "2026-05-28",
    tags: ["AI Infrastructure", "Platform Engineering", "Multi-Agent", "Code Review"],
    readTime: "9 min",
    content: `
# The Infrastructure Nightmare Nobody Is Talking About

App teams can now "vibe code" features in hours. Platform teams still need weeks to review, deploy, and monitor.

The result: an unintentionally adversarial deluge on shared infrastructure. Goal-directed agents change internal APIs, flip feature flags, and discover endpoints that "should never have been exposed."

The bottleneck isn't code generation. It's the operations layer that has to run thousands of agent-generated workloads safely.

---

## The Double Whammy

App teams are on AI scaling laws. Platform teams are on human scaling laws. This is not sustainable.

At OpenAI's data platform team, the problem is already acute:

- A user vibes-coded a Spark job and doesn't know what Flink is. When it breaks, the platform team debugs it.
- An agent flipped a feature flag and took down the entire Kafka cluster.
- An agent "hacked around" a human-designed permission structure and surfaced data to someone who shouldn't see it.

**"Agents do not respect org charts. Your governance model has to compensate for that."**

---

## The Fix: Multi-Agent, Not Single-Agent

The proposed solution isn't a bigger model. It's a different architecture:

- **Code creators** and **code reviewers** are separate agents with separate incentives
- Each affected team's agent reviews changes against its own knowledge base
- Autonomous operations run at every layer, not just the top

This is "code owners++" — a specialized reviewer agent with its own incident runbooks, past failures, and guardrails.

---

## What OpenAI Built

OpenAI's data platform team turned its manual release pipeline over to an agent that:

- Runs promotions autonomously (staging → canaries → prod)
- Pings status in Slack
- Self-triages failures
- Traverses 4–5 internal systems to find and patch bugs at midnight

**"Probably better than humans can."**

But trust is the chicken-and-egg problem: agents are trusted to pull status and suggest fixes, but not to apply fixes autonomously. The bridge is isolated environments for minimal agentic live operations, graduated to production as confidence builds.

---

## What to Build

1. **Separate code-reviewer agents**: distinct from creators, with their own knowledge bases and incentives
2. **Private eval suites**: a "janky" Notion doc of inputs + expected outputs, run against every new model release
3. **Harden internal APIs**: agents will discover and misuse endpoints you thought were hidden
4. **Support bots**: absorb low-urgency, high-cardinality requests to buy platform-team time
5. **Encode ops knowledge in skills**: agent-launched jobs must fail safe and self-debug
6. **Multi-layer kill switches**: runtime cancel, identity revoke, gateway block, payment freeze, framework interrupt

**"If the only way to tell your agent to stop is to tell the model to stop, you don't have a kill switch."**

---

## The Real Lesson

The scaling laws of the upper layers (AI) and lower layers (human) are diverging. The fix isn't a single better model. It's a multi-agent architecture where each layer has its own agent, its own knowledge base, and its own governance.

The platform team of the future is not a human team slowing things down. It's a system of agents that maintains the safety invariants while the app teams move at AI speed.

---

*This post draws from OpenAI's data platform team experience and Nate B. Jones's analysis of infrastructure governance.*
    `.trim(),
  },
  {
    slug: "plan-with-opus-build-with-gemini",
    editorial: true,
    title: "Plan with Opus, Build with Gemini: A Practical Guide to Mixed-Provider Workflows",
    description: "Frontier models are hitting rate limits. Open models are catching up. The winning strategy isn't choosing one — it's orchestrating the right model for each step.",
    date: "2026-05-27",
    tags: ["Mixed-Provider", "Model Orchestration", "Claude Opus", "Kimi", "Archon"],
    readTime: "10 min",
    content: `
# Plan with Opus, Build with Gemini: A Practical Guide to Mixed-Provider Workflows

Anthropic's rate limits are tightening. Subscription output quality is reportedly degrading. And the frontier models — Claude Opus, GPT-4.5 — cost 10x more per token than Kimi K2.6, DeepSeek, or Qwen.

The solution isn't abandoning frontier models. It's mixing them: use the expensive model where it matters, and the cheap model everywhere else.

This is the mixed-provider workflow. Here's how to build it.

---

## The Central Question

Where do you spend your frontier tokens?

Two hypotheses:

1. **Opus for planning, cheap model for implementation**: A thorough plan (files to touch, validation strategy, success criteria) lets a cheaper model implement reliably.
2. **Cheap model for planning, Opus for implementation**: The stronger model catches hallucinations and not-following-plan errors during self-review.

The answer is: **it depends on the task, and you should test it empirically.**

---

## The Architecture

A mixed-provider workflow has three layers:

### 1. Orchestration Layer

The orchestrator is the layer above the coding agent. It builds a DAG of steps, assigns a provider to each node, and manages work-tree isolation.

**Archon** is the reference implementation: per-node provider selection, git work-tree isolation, retry logic, and PR creation. The key insight: **tooling gets replaced, but the orchestration layer doesn't.**

### 2. Provider Routing

Each node in the workflow gets a provider assignment:

- **Exploration**: Sonnet (cheap, high context)
- **Planning**: Opus (thorough, structured)
- **Implementation**: Kimi K2.6 or Gemini 3.5 Flash (cost-efficient)
- **Validation**: Opus (catches errors)
- **Design**: Gemini 3.5 Flash (fast, visual)

### 3. Artifact Handoffs

Provider switching breaks conversation continuity. You cannot continue the same agent session across providers. The solution: **markdown artifacts in a dedicated work-tree space.**

The planning node writes a plan.md. The implementation node reads it. The validation node reads both. Each node is a fresh agent session, bridged by files.

---

## The Reliability Reality

Kimi K2.6 is the weak link operationally:

- Frequent "tool edit failed" warnings
- API hangs (~1 in 4–8 runs)
- Weird multi-newline output

Codex is the only agent that reportedly doesn't crash. The Claude Agent SDK also crashes occasionally (subprocess crash → retry → guard).

**The harness must have built-in retry mechanisms.** Timeout + reset on hang, not just on failed tool edits.

---

## The Cost Math

- **Kimi Code**: $40/month, 5% of weekly limit on a multi-million-token stream
- **Anthropic subscription**: subsidized but rate-limited, reportedly degrading in quality
- **Gemini 3.5 Flash**: ~20% of weekly limit per single-file edit

The strategy: use Gemini for frontend design (fast, visual) + Opus/Kimi for content (accurate, structured). Avoid using Gemini for reasoning — it hallucinates facts.

---

## What to Build

1. **Run a mixed-provider benchmark**: plan with Opus, implement with Kimi, validate with Opus. Measure quality, cost, and time.
2. **Add retry/guard logic**: timeout on API hangs, reset on subprocess crashes.
3. **Test additional models**: Qwen 3.6, DeepSeek, GLM 5.1, MiniMax.
4. **Design a "design vs. content" split**: Gemini for UI, Opus for logic.
5. **Build a private eval suite**: inputs + expected outputs, run against every new model release.

The model is the engine. The orchestrator is the driver. Invest in the driver.

---

*This post draws from Cole Medin's live benchmarks of mixed-provider Archon workflows and our own experience with multi-model routing.*
    `.trim(),
  },
  {
    slug: "claude-dynamic-workflows",
    editorial: true,
    title: "16 Agents, Not 1000: What Claude's Dynamic Workflows Actually Mean",
    description: "Claude Opus 4.8 shipped dynamic workflows — Claude writes its own orchestration script. Here's the real concurrency limit, the cost trap, and when to use it.",
    date: "2026-05-26",
    tags: ["Claude Code", "Dynamic Workflows", "Multi-Agent", "Opus 4.8"],
    readTime: "8 min",
    content: `
# 16 Agents, Not 1000: What Claude's Dynamic Workflows Actually Mean

Claude Opus 4.8 shipped "dynamic workflows" — Claude writes its own orchestration script, fans the task out to parallel sub-agents, and runs verifier agents until the output converges.

The marketing says "hundreds of parallel agents." The docs say something different. Here's the reality.

---

## What It Actually Does

Two triggers:

1. **Type the word "workflow"** in your prompt: Claude shows the orchestration plan before running
2. **Flip on Ultracode**: Maxes effort and lets Claude auto-decide when a task warrants a full workflow

The workflow is adversarial and convergent:

- Claude decomposes the task into stages
- Fans parts out to parallel sub-agents
- Spins up separate verifier agents
- Gates output so nothing reaches you until checked
- If interrupted, resumes where it left off
- Can span hours to days

This is the productized version of what we've been doing manually: Wave A→E with adversarial verification and snapshot/rollback.

---

## The Real Concurrency Limit

**Only 16 agents run concurrently.** Up to 1,000 total across a job's lifetime, but never more than 16 live at once.

The "hundreds in parallel" framing is marketing. The reality is a hard ceiling that, if pushed, triggers rate limits.

This is still powerful. 16 agents with verification is a 10x force multiplier over a single agent. But it's not infinite.

---

## The Cost Trap

Anthropic explicitly warns: "uses meaningfully more than a normal session."

Critics call it "the fastest way to speedrun your weekly usage limit."

The rule: **not for small jobs.** Scope it to genuinely large work — migrations, audits, multi-file refactors — or you're just lighting money on fire.

But the counter-argument is strong: a migration that would cost a 3-person team 3 months can collapse to ~a week for a few hundred dollars in tokens. "One of the best trades in all of software."

---

## Real Proof Points

### The Bun Port

Jarred Sumner ported the Bun engine from Zig to Rust:

- ~750,000 lines of code
- 99.8% of the old test suite passing
- 11-day run
- Two reviewer agents hammered every single file until the build passed

### The A/B Flag Sweep

Anthropic engineer Kat Woo cleared hundreds of A/B test flags in under 10 minutes — work that "rots in a backlog for over a year."

---

## How to Use It

1. **Start small**: Test the "workflow" keyword on a real codebase audit. Capture the orchestration plan it proposes.
2. **Define "workflow-worthy"**: Lines touched / files / estimated token burn. Only trigger for genuinely large jobs.
3. **Add guardrails**: Token-burn watch + usage limit before any multi-day run.
4. **Pair with auto mode**: 100 agents wanting minor changes = manual approval fatigue. Auto mode assesses permissions and only escalates on critical actions.
5. **Benchmark against your manual process**: Compare token cost vs. quality vs. time.

---

## The Verdict

Dynamic workflows are a real 10x multiplier for the right tasks. But they're not magic. The concurrency limit is real. The cost is real. The value is in the verification layer — the adversarial convergence that catches errors before they ship.

The pattern is: **orchestration + verification + resumption**. Claude productized it. You can build it yourself. The question is whether the native version is worth the token tax.

---

*This post draws from Dubibubii's analysis of Claude Opus 4.8 and our own experience with multi-agent adversarial verification.*
    `.trim(),
  },
];
