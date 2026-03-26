export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readTime: string;
  content: string;
}

export const posts: BlogPost[] = [
  {
    slug: "one-file-memory-system",
    title: "The One-File Memory System That Changed How I Use Claude",
    description: "You shouldn't have to re-explain your stack every session. Here's the simplest possible setup to give Claude persistent memory -- and how to do it in 10 minutes.",
    date: "2026-03-26",
    tags: ["Claude Code", "Productivity", "Memory"],
    readTime: "4 min",
    content: `
Every session, I used to start the same way. "We're using TypeScript, not JavaScript." "Don't use default exports." "The API is in \`src/api/\`, not root." "We already tried Redis here and it didn't work."

Five minutes of throat-clearing before any real work happened. Every. Single. Session.

Then I set up a memory file, and that problem disappeared.

## The Pain Point

Claude Code is stateless by design. Every session starts fresh. There's no session history, no learned preferences, no memory of last week's architecture decision. This isn't a bug -- it's a consequence of how the model works. But it creates real friction.

The compounding effect is the worst part. Every correction you make in one session is a correction you'll make again next week. You're not building on previous sessions; you're re-establishing context every time.

This is especially painful with project-specific knowledge: "Don't touch the authentication middleware -- it's under active refactor." "The staging database is read-only." "We deploy from the \`release\` branch, not \`main\`."

## The Simplest Possible Fix

Claude Code reads a file called \`CLAUDE.md\` at session start. That's the hook. Put things in that file that Claude should always know, and it will always know them.

Here's a minimal \`CLAUDE.md\` that solves 80% of the problem:

\`\`\`
# Project: My App

## Stack
- TypeScript (strict mode), React 19, Next.js 16
- Postgres via Drizzle ORM
- Vitest for tests (no Jest)
- Tailwind CSS

## Conventions
- No default exports
- API lives in src/api/
- Tests colocated with source files

## Don't Do
- Don't use mocks in integration tests -- hit the real DB
- Don't add inline styles -- use Tailwind classes
\`\`\`

That's it. Three sections. Less than 20 lines. Claude reads it at session start and you never repeat those instructions again.

## The Before/After

**Before memory:**
> Me: "Let's add a new API endpoint."
> Claude: *writes a JavaScript file with a default export and Jest tests*
> Me: "TypeScript, no default exports, Vitest please."
> Claude: *rewrites*
> (Repeat every session)

**After memory:**
> Me: "Let's add a new API endpoint."
> Claude: *writes TypeScript, named exports, Vitest tests, in \`src/api/\`*
> (Never needs to be said again)

After a month of accumulated memory, I tracked roughly 60% fewer correction cycles per session. Not a formal benchmark -- just counting how often I typed "I already told you that."

## The Memory File Pattern

A single \`CLAUDE.md\` works. But once you start accumulating more context, a simple structure helps.

The pattern I use across projects on this system (documented in detail in the [Claude Memory Kit](/products/claude-memory-kit)):

**User memory** -- who you are and how you work. Goes in your home directory CLAUDE.md so it follows you across every project. Things like: "I'm a backend engineer who's new to React. Explain frontend patterns using backend analogies."

**Feedback memory** -- corrections that stick. When Claude does something wrong and you correct it, add that correction to a memory file. It becomes permanent. "Don't use try-catch in React components -- use error boundaries."

**Project memory** -- architecture decisions, frozen APIs, deployment conventions. Project-specific.

**Reference memory** -- where things live. "Staging environment: staging.myapp.com. Admin dashboard: Linear workspace 'Platform'."

## Set It Up in 10 Minutes

1. Create \`CLAUDE.md\` in your project root
2. Add your stack, 3-5 conventions, and 2-3 "never do this" rules
3. Start a new Claude Code session -- it will read the file automatically
4. For the first few sessions, notice when Claude gets something wrong. Add that correction to the file
5. After a week, the file has become a trained reflex

The free version of the [Claude Memory Kit](https://github.com/edgeless-ai/claude-memory-kit) includes templates for all four memory types and a starter CLAUDE.md structure. If you want stack-specific libraries and multi-project memory patterns, the [Pro version](/products/claude-memory-kit) covers those.

## One More Thing

Memory files do accumulate cruft. Review monthly. Archive anything that's no longer true. Keep each file under 200 lines. Memory that's too long wastes context window on stale instructions.

The discipline: when you update your architecture, update your memory file the same day. It takes 30 seconds, and it means next session Claude already knows.

That 10-minute setup has probably saved me 10 hours over the past few months. It's the highest-leverage thing I've done to improve how I work with Claude Code.

Read the longer technical version in [How Claude Code Memory Actually Works](/blog/how-claude-code-memory-works) if you want the full breakdown of the four memory types.
    `.trim(),
  },
  {
    slug: "mcp-servers-unix-pipes-of-ai",
    title: "Why MCP Servers Are the Unix Pipes of AI",
    description: "The Unix philosophy changed software forever: small tools, composable via pipes. MCP does the same thing for AI agents. Here's why that matters.",
    date: "2026-03-24",
    tags: ["MCP", "Architecture", "Developer Tools"],
    readTime: "5 min",
    content: `
In 1978, Doug McIlroy wrote the Unix philosophy in three sentences. The one that matters: "Write programs that do one thing and do it well. Write programs to work together."

Forty-eight years later, we're rediscovering this idea for AI agents, and calling it MCP.

## What MCP Actually Is

The Model Context Protocol is a JSON-RPC spec that lets AI models call external tools through a standardized interface. An MCP server exposes a list of tools. A client (like Claude Code) connects to those servers and gets access to those tools. The model calls them by name with arguments, and gets back structured results.

That's it. No custom integrations per model. No bespoke SDKs. Define your tool once, and any MCP-compatible client can use it.

Sound familiar? It should. It's stdin/stdout with better types.

## The Unix Parallel

The power of Unix pipes wasn't any individual tool -- it was composability. \`cat file | grep pattern | sort | uniq -c\` does something none of those tools could do alone. The protocol (text on stdout/stdin) made composition possible without any of the tools knowing about each other.

MCP does the same thing for AI tools. The protocol is JSON-RPC over stdio (or HTTP). The tools are small, focused, independently deployable. The composition happens in the model's reasoning layer instead of a shell.

The key insight in both cases: **the protocol is the product**. Not any single tool. Not any particular capability. The protocol is what enables the ecosystem.

## What This Looks Like in Practice

The [agent infrastructure at Edgeless Labs](/blog/building-ai-agent-infrastructure-solo) runs several MCP servers. Each one does one thing:

**ChromaDB search server** -- semantic search across a knowledge base of 7,000+ documents. Takes a query string, returns ranked results with similarity scores. That's the whole API.

**Obsidian vault query server** -- read and search the Obsidian vault by tag, folder, or full-text. Agents can retrieve specific notes or scan for relevant context without touching the filesystem directly.

**Backlog management server** -- read and write tasks in a structured backlog. Lets agents file their own tasks, check status, and mark things complete. The backlog is a text file format; the MCP server is the typed interface over it.

**Inter-agent messaging server** -- a pub/sub channel for agents to send messages to each other. An orchestrator agent can dispatch work; worker agents can report back. Real-time, without a message queue.

None of these tools know about each other. Any agent can use any combination. Add a new server and it's immediately available to every agent in the system.

## Why Libraries Were the Wrong Model

Before MCP, tool access meant libraries. You'd import the Anthropic SDK, write a tool schema, register it with the client. Then repeat for every model you wanted to support. When OpenAI updated their function calling format, you'd update every integration.

This created tight coupling between your tools and your model provider. Switching models meant rewriting integrations. Testing a tool meant testing it inside a model's context.

MCP decouples these completely. The server doesn't know what model is calling it. The model doesn't care how the server is implemented. The server could be TypeScript, Python, Go -- doesn't matter. The protocol is the boundary.

This is exactly what made Unix pipes powerful: \`grep\` doesn't know it's receiving input from \`cat\`. It just reads from stdin.

## Tools as Services, Not Libraries

The shift MCP enables is treating tools as services rather than library calls. This changes the operational model significantly:

You can **deploy tools independently**. The Obsidian server runs on your Mac (it needs local filesystem access). The ChromaDB server runs wherever ChromaDB is. The trading data server runs on the VPS. Each deployed where it makes sense.

You can **test tools independently**. An MCP server is just an HTTP or stdio server. You can test it with \`curl\` or any JSON-RPC client. No model required.

You can **version tools independently**. Update the ChromaDB server without touching anything else. Agents pick up the new tool definition on next connection.

You can **compose without coordination**. Agent A uses the vault server and the backlog server. Agent B uses the vault server and the messaging server. Neither knows about the other, but they share infrastructure.

## The Ecosystem Implication

The deeper implication is that MCP creates a tool ecosystem that outlives any particular model or provider. A tool you write today for Claude will work with whatever succeeds Claude. The investment is in the tool, not the integration.

This is how Unix tools from the 1970s still run on your Mac today. The protocol survived everything else changing.

MCP is early. The tooling is rough in places. Server discovery is manual. Error handling is inconsistent. But the protocol is right, and the ecosystem will follow.

For anyone building agent infrastructure: start treating your tools as MCP servers, not library functions. The composition benefits compound quickly, and you're building on the right abstraction for the next decade of AI development.

See the [lab experiments page](/lab) for the MCP servers running in this system, or read the [infrastructure deep-dive](/blog/building-ai-agent-infrastructure-solo) for the full architecture.
    `.trim(),
  },
  {
    slug: "generative-art-pen-plotters",
    title: "Generative Art for Pen Plotters: A Technical Primer",
    description: "Pen plotter art isn't screen art printed on paper. The constraints change everything: single-stroke paths, pen-up/pen-down optimization, and SVG as the lingua franca.",
    date: "2026-03-23",
    tags: ["Generative Art", "Creative Coding", "Pen Plotter"],
    readTime: "7 min",
    content: `
When you generate art for a screen, mistakes are invisible. A triangle with a slight gap renders fine -- the display fills it in. Lines can overlap arbitrarily. Color can be sampled per-pixel.

When you generate art for a pen plotter, every mistake is permanent. The pen either touches the paper or it doesn't. Overlapping paths mean double-inking, which looks wrong on cotton paper. A gap in a stroke is a gap in the physical ink line.

The constraints aren't limitations -- they're design parameters. Understanding them changes how you write generators.

## SVG Is the Lingua Franca

Every plotter workflow I've found converges on SVG as the interchange format. The reasons are practical:

SVG paths are the natural representation of "move pen to X,Y, draw to X2,Y2." The \`M\` (moveto), \`L\` (lineto), and \`C\` (curveto) commands map directly to plotter motion primitives.

SVG is text. You can generate it from any language, inspect it in any editor, and debug it by reading the coordinates.

The AxiDraw driver (the most common plotter for fine art) accepts SVG directly. Your generator outputs an SVG file, you open it in Inkscape with the AxiDraw plugin, and it plots.

The critical SVG parameter: stroke width in the SVG should correspond to the actual pen tip width. For a 0.3mm Micron, set stroke-width to 0.3mm in the SVG. This matters when you're evaluating density -- you want the visual preview to approximate the physical result.

## Why Single-Stroke Paths Matter

A screen renderer draws each path in isolation. Overlapping paths layer visually, and the result is color mixing. Fine.

A plotter pen tracks across paper physically. If path A overlaps path B, the pen crosses that area twice. On thick paper with light ink, this doubles the ink deposit and creates visible striping. On thin paper, it can saturate and bleed.

The solution: design generators that produce non-overlapping paths, or at minimum, minimize overlap. For fill patterns (hatching, stippling), think about coverage rather than overlap.

There's a subtler version of this problem with continuous paths. A generator might output 500 separate line segments when it could output 10 continuous strokes. More pen lifts means more travel time and more opportunities for the pen to blot when it returns to paper. Continuous strokes produce cleaner, faster plots.

The optimization problem: given a set of line segments, find the traversal order that minimizes total pen-up travel distance. This is a variant of the Traveling Salesman Problem -- NP-hard in general, but good approximations exist. The \`vpype\` tool does this automatically on any SVG input, which is worth knowing about.

## Algorithm Families That Work Well

Not all generative art algorithms translate equally to plotters. A few that reliably produce good physical results:

**Flow fields** simulate vector fields and draw particle traces through them. The traces are naturally continuous paths. Perlin noise fields produce organic, almost geological results. The key parameter is step size -- smaller steps mean smoother curves but longer files.

**Lorenz attractors and other chaotic systems** produce infinitely non-repeating paths through 3D space. Projecting them onto 2D gives dense, tangled line work that looks good at high iteration counts. Because the path never closes, you can control density by controlling iteration count.

**Voronoi tessellations** produce networks of bounded cells. The cell edges are natural single-stroke paths. Relaxed Voronoi (Lloyd's algorithm) produces more uniform cell sizes. Combined with variable cell sizing based on an input image, you get dithered portraits made of geometry.

**Recursive subdivision** (quadtrees, triangle subdivision) produces patterns with self-similar structure at multiple scales. The subdivision boundary lines are natural paths. Start with a rectangle, subdivide based on local image intensity, and you get an abstract representation of any input image.

**Truchet tiles** fill a grid with simple tile shapes that connect across edges. The key insight: design tiles so connected lines span multiple tiles, creating long continuous paths rather than isolated shapes. This minimizes pen lifts and produces more interesting visual flow.

## The AI Scoring Pipeline

Running 105+ experiments manually would mean 105+ physical plots. I don't have that kind of paper budget or time.

Instead, every generator gets scored by an LLM judge before it ever touches the plotter. The scoring criteria:

**Composition** -- does the piece use the available space well? Heavy clustering in one corner scores low. Balanced visual weight across the frame scores high.

**Line density** -- too sparse looks unfinished; too dense loses the detail that makes plotter art interesting at close range. The target density depends on paper size. For A4, I aim for 40-60% coverage.

**Visual interest** -- the hardest to formalize. Does the piece have focal points? Does it reward looking at it for more than 10 seconds? The judge looks for variety in mark density, interesting transitions, and emergent structure that wasn't explicitly programmed.

**Plottability** -- are there construction artifacts? Tiny isolated marks that would require a full pen lift cycle for one dot? Very long straight lines that require precise paper grip?

The judge generates a score from 0-10 and a brief explanation. I only plot generators that score 7+. This has saved a significant amount of time and paper.

The current scoring prompt and rubric are in the [pen plotter experiment log](/lab/pen-plotter-experiments).

## Materials Matter

The generator doesn't exist in isolation. The same SVG looks different depending on paper and ink.

**Paper**: I use Strathmore 400 Series Bristol (vellum surface, 270gsm) for production plots. It takes ink cleanly without bleed, is stiff enough for long sessions without cockling, and has enough texture to give ink strokes slight character. For prototyping I use Canson marker paper -- it's cheaper and the smooth surface is more forgiving of overlapping paths.

**Ink**: Pigma Micron 0.1mm and 0.3mm for most work. The Micron ink is archival and doesn't fade. For single-color pieces, I sometimes use a Sailor Profit fountain pen with Pilot Iroshizuku ink -- the sheen on coated paper is something screen art can't replicate.

**Speed**: The AxiDraw's motor speed directly affects line quality. Too fast and the pen skips on texture. Too slow and ink bleeds at corners where the pen pauses. I run at 60% of max speed for most work, 40% for very fine detail.

## Getting Started

If you're writing your own generators, start with a flow field. It's the most forgiving algorithm family -- organic, continuous paths, naturally limited overlap. Set your canvas to A4 at 96 DPI (the SVG default), use stroke-width 0.5mm for testing, and score the output before committing to a plot.

The [Edgeless lab experiments](/lab) page logs all the generator experiments including source code for the ones that scored well. The Lorenz attractor generator, the Voronoi dither, and the recursive quad subdivision are all open.

If you want to go deeper into the scoring and iteration pipeline, the [pen plotter autoresearch pattern](/lab) documents how the AI-in-the-loop workflow runs.
    `.trim(),
  },
  {
    slug: "building-ai-agent-infrastructure-solo",
    title: "Building AI Agent Infrastructure as a Solo Developer",
    description: "How I built a multi-agent system with MCP servers, vector memory, and autonomous trading -- all running 24/7 from a single VPS.",
    date: "2026-03-21",
    tags: ["Agents", "MCP", "Infrastructure"],
    readTime: "8 min",
    content: `
When people hear "multi-agent system," they picture a team of engineers, months of planning, and enterprise infrastructure. I built one by myself, and it runs on a single $15/month VPS.

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

**VPS beats serverless for always-on agents.** When your agent needs to maintain state, respond to events, and run cron jobs, a \$15 VPS is simpler than a constellation of Lambda functions.

**The tools exist.** Claude Code, MCP, ChromaDB, PM2 -- the building blocks for agent infrastructure are production-ready today. The bottleneck isn't technology, it's architecture.

## What's Next

The system keeps growing. Current priorities: improving inter-agent communication (an "agent bus" for real-time messaging), better memory consolidation (merging redundant knowledge), and more sophisticated trading strategies.

The goal isn't to build the most complex system. It's to build the most useful one, with the least moving parts.
    `.trim(),
  },
  {
    slug: "how-claude-code-memory-works",
    title: "How Claude Code Memory Actually Works",
    description: "Claude forgets everything between sessions. Here's how file-based memory fixes that, and why it changes how you work with AI.",
    date: "2026-03-21",
    tags: ["Claude Code", "Memory", "Developer Tools"],
    readTime: "6 min",
    content: `
Every Claude Code session starts the same way: a blank slate. No memory of yesterday's architecture decisions. No recall of your coding conventions. No idea that you spent three hours debugging that OAuth flow last week.

This is the single biggest friction point in AI-assisted development. Not model capability. Not context windows. Memory.

## The Problem Is Structural

Claude Code reads instructions from a file called \`CLAUDE.md\` at the start of every session. That's it. There's no built-in persistence layer. No session history. No learning from past interactions.

So every session, you repeat yourself: "We use TypeScript, not JavaScript." "The API lives in \`src/api/\`, not \`api/\`." "Don't use default exports." "We already tried approach X and it failed because Y."

This isn't a minor annoyance. It's a compounding tax on every interaction.

## File-Based Memory Fixes This

The solution is surprisingly simple: structured markdown files that Claude reads automatically at session start.

No databases. No vector stores. No infrastructure. Just files in your repo that Claude already knows how to read.

The memory system layers on top of Claude Code's built-in \`CLAUDE.md\` hierarchy. Claude loads these files automatically. You don't need plugins or configuration.

## The 4 Memory Types

After running this pattern in production across multiple projects, I've found four distinct memory types that cover every use case.

### 1. User Memory

Who you are and how you work. Follows you across every project.

\`\`\`yaml
name: User Role
type: user
---
Senior backend engineer, 8 years Go.
New to React frontend in this project.
Prefer explanations mapping frontend concepts to backend analogues.
\`\`\`

### 2. Feedback Memory

Corrections that stick. The highest-value memory type -- every correction makes every future session better.

\`\`\`yaml
name: No mocking in integration tests
type: feedback
---
Integration tests must hit a real database, not mocks.
Why: Mocked tests passed but prod migration failed last quarter.
\`\`\`

### 3. Project Memory

Architecture decisions, conventions, and infrastructure specific to one codebase.

\`\`\`yaml
name: API Migration Freeze
type: project
---
No breaking API changes until 2026-03-15 (mobile release cut).
Any endpoint modifications must be backwards-compatible.
\`\`\`

### 4. Reference Memory

Pointers to where things live. Tools, APIs, dashboards.

\`\`\`yaml
name: Bug Tracker
type: reference
---
Production bugs: Linear project "PLATFORM"
Feature requests: Linear project "ROADMAP"
Design specs: Figma workspace "Product Design 2026"
\`\`\`

## What Changes in Practice

With memory in place, sessions start differently. Instead of 10 minutes of context-setting, you jump straight into the work.

Claude remembers that your test suite uses Vitest, not Jest. It knows the deploy script is at \`scripts/deploy.sh\`, not \`deploy.sh\`. It recalls that you tried Redis caching last month and hit connection pooling issues.

After a month of accumulated feedback memory, Claude makes roughly 60% fewer mistakes that require correction. That's not a benchmark -- that's from tracking corrections across my own projects.

## The Maintenance Problem

Raw memory files work, but they accumulate cruft. Outdated entries. Contradictory instructions. Files that grow past useful size.

The discipline: review monthly, archive aggressively, keep each file under 200 lines. Memory that's too long defeats the purpose -- Claude spends context window on stale instructions instead of your actual task.

## Get Started

I've open-sourced the base memory kit with templates for all four memory types, a starter CLAUDE.md structure, and setup instructions.

**Free:** [Claude Memory Kit on GitHub](https://github.com/edgeless-ai/claude-memory-kit)

The free version covers 90% of use cases. For production patterns including stack-specific libraries (React/Next.js, Python/FastAPI, Go, Rails, Rust), multi-project memory architectures, and CLAUDE.md templates:

**Pro ($29):** [Claude Memory Kit Pro on Gumroad](https://edgelessai.gumroad.com/l/claude-memory-kit)

The best time to set up memory is before your next session. Takes 15 minutes, saves hours every week.
    `.trim(),
  },
];
