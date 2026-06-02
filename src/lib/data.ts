import { PLOTTER } from "./plotter-stats";

export interface Product {
  name: string;
  price: string;
  description: string;
  features: string[];
  href: string;
  badge: string | null;
  repoUrl?: string;
  comingSoon?: boolean;
  /**
   * URL slug for the local product landing page at /products/[slug].
   * Only set for products with long-form content available in product-content.ts.
   * Products without a slug link directly to Gumroad from the products grid.
   */
  slug?: string;
}

const UTM = "utm_source=edgelesslab&utm_medium=website&utm_campaign=products";

export const products: Product[] = [
  {
    name: "CLAUDE.md Template Pack",
    price: "Free",
    description:
      "14 battle-tested CLAUDE.md templates for every project type. Drop one into your repo and start building.",
    features: [
      "14 templates: iOS, Android, ML, API, DevOps, Next.js, and more",
      "CLI Tools, Monorepos, and Game Dev configurations",
      "Embedded/IoT, Security Audits, and Open Source templates",
      "Startup MVP and Technical Writing presets",
    ],
    href: `https://edgelessai.gumroad.com/l/kszapk?${UTM}`,
    badge: "Free",
  },
  {
    name: "Quick Reference Cards",
    price: "Free",
    description:
      "Printable cheat sheets for prompt patterns, Claude Code shortcuts, MCP tool reference, and common workflows.",
    features: [
      "Prompt pattern and system prompt reference cards",
      "Claude Code shortcuts and slash commands",
      "Token optimization and temperature settings guide",
      "PDF and markdown formats, pin-next-to-monitor ready",
    ],
    href: `https://edgelessai.gumroad.com/l/dihxts?${UTM}`,
    badge: "Free",
  },
  {
    name: "Claude Code Cheat Sheet",
    price: "Free",
    description:
      "Quick-start reference for Claude Code. Commands, shortcuts, hook patterns, and MCP setup in one printable sheet.",
    features: [
      "All slash commands and keyboard shortcuts",
      "Hook configuration patterns with examples",
      "MCP server setup cheatsheet",
      "CLAUDE.md template and memory system quick-start",
    ],
    href: `https://edgelessai.gumroad.com/l/claude-code-cheat-sheet?${UTM}`,
    badge: "Free",
    slug: "claude-code-cheat-sheet",
  },
  {
    name: "Claude Memory Kit",
    price: "Free",
    description:
      "Start here. Drop-in memory template for Claude Code. Persists context, feedback, and project knowledge across conversations.",
    features: [
      "4 memory types: user, feedback, project, reference",
      "MEMORY.md index auto-loaded each session",
      "CLAUDE.md snippet for instant setup",
      "Real-world examples included",
    ],
    href: "https://github.com/edgeless-ai/claude-memory-kit?utm_source=edgelesslab&utm_medium=website&utm_campaign=products",
    badge: "Free",
    repoUrl: "https://github.com/edgeless-ai/claude-memory-kit",
  },
  {
    name: "Edgeless Stack",
    price: "Free",
    description:
      "The complete AI agent infrastructure. Memory that persists, hooks that protect, skills that compound, and agents that run while you sleep. Extracted from 3+ months of production use.",
    features: [
      "3-layer memory: SQLite ledger + ChromaDB vectors + Obsidian vault",
      "6 safety hooks: damage control, completion verification, taxonomy guard",
      "9 skills with tiered loading (5 core + 4 domain)",
      "Cron patterns, Agent Bus, Docker compose, install.sh",
    ],
    href: "https://github.com/edgeless-ai/edgeless-stack?utm_source=edgelesslab&utm_medium=website&utm_campaign=products",
    badge: "Free",
    repoUrl: "https://github.com/edgeless-ai/edgeless-stack",
  },
  {
    name: "Multi-Agent Orchestration Blueprint",
    price: "Free",
    description:
      "The dispatch/worker architecture for coordinating multiple AI agents. Agent Bus messaging, async inboxes, state machines, and 3 reference implementations from a system that runs 5 agents 24/7.",
    features: [
      "Dispatch/worker topology: routing tasks to specialist agents",
      "Agent Bus setup: real-time inter-session messaging patterns",
      "State machines: queued -> acked -> running -> done/failed",
      "3 reference pipelines: research, code review, content processing",
    ],
    href: `https://edgelessai.gumroad.com/l/multi-agent-blueprint?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "multi-agent-blueprint",
  },
  {
    name: "The Agent Cookbook",
    price: "Free",
    description:
      "Build AI agents that actually work. 15 production-ready agent patterns with complete implementations for Claude, GPT, and open-source models.",
    features: [
      "15 production-ready agent patterns with working code",
      "Memory systems, tool integration, and context management",
      "Error recovery and deployment strategies",
      "Architecture diagrams and production lessons learned",
    ],
    href: `https://edgelessai.gumroad.com/l/plbzo?${UTM}`,
    badge: null,
  },
  {
    name: "Claude Memory Kit Pro",
    price: "Free",
    description:
      "The complete memory system for Claude Code power users. 12 templates, 5 stack libraries, advanced patterns guide, and CLAUDE.md templates.",
    features: [
      "12 ready-to-customize memory templates",
      "Stack libraries: React/Next.js, Python/FastAPI, Go, Rails, Rust",
      "Advanced patterns: multi-project, team memory, CI integration",
      "CLAUDE.md templates for solo and monorepo projects",
    ],
    href: `https://edgelessai.gumroad.com/l/claude-memory-kit?${UTM}`,
    badge: "Popular",
  },
  {
    name: "The Prompt Engineering OS",
    price: "Free",
    description:
      "The complete system for writing AI prompts that work in production. 30 chapters, 8 template schemas, 100+ templates.",
    features: [
      "30 chapters covering every prompt pattern",
      "8 template schemas with fill-in-the-blank structure",
      "100+ production-tested prompt templates",
      "Covers Claude, GPT-4, Gemini, and open models",
    ],
    href: `https://edgelessai.gumroad.com/l/prompt-engineering-os?${UTM}`,
    badge: null,
  },
  {
    name: "Generative Art Starter Kit",
    price: "Free",
    description:
      "10 Python generators for pen plotters: flow fields, L-systems, Voronoi, spirals, reaction-diffusion. Each with parameter guides, example SVGs, and AI scoring rubrics from 105+ experiments.",
    features: [
      "10 generators with source code, parameter guides, and 3 example outputs each",
      "SVG optimization for pen plotters: stroke ordering, travel minimization",
      "AI scoring rubric for evaluating generative art quality",
      "Print-ready export: A4, A3, letter sizes with plotter setup guides",
    ],
    href: `https://edgelessai.gumroad.com/l/gen-art-starter?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "gen-art-starter",
  },
  {
    name: "Always-On Agent Deployment Kit",
    price: "Free",
    description:
      "Deploy an AI agent that runs 24/7 on a $5 VPS. Cron scheduling, grounding packets, memory contracts, Telegram alerting, and the recovery patterns from 3 months of unattended operation.",
    features: [
      "VPS setup guide: Hetzner, systemd, PM2, environment hardening",
      "Cron job architecture: health checks, email triage, knowledge consolidation",
      "Grounding stack: verification layers, evidence-based completion, session packets",
      "Communication patterns: Telegram bot, inbox dispatch, API access",
    ],
    href: `https://edgelessai.gumroad.com/l/always-on-agent?${UTM}`,
    badge: "New",
    comingSoon: true,
    slug: "always-on-agent",
  },
  {
    name: "Production MCP Server Kit",
    price: "Free",
    description:
      "Take MCP servers past the tutorial stage. Auth middleware, rate limiting, Docker deployment, health checks, and error handling patterns from running 4+ MCP servers in production.",
    features: [
      "Auth middleware: API key validation and OAuth2 token checking",
      "Rate limiting, usage tracking, and health check endpoints",
      "Docker + compose deployment configs with monitoring",
      "3 production server examples: filesystem, database, external API",
    ],
    href: `https://edgelessai.gumroad.com/l/production-mcp-kit?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "production-mcp-kit",
  },
  {
    name: "AI Code Review Playbook",
    price: "Free",
    description:
      "Systematic AI-powered code review that catches security vulnerabilities, performance issues, and logic errors before they ship.",
    features: [
      "Review checklists and prompt templates for Claude/GPT",
      "GitHub Actions and CI/CD integration guides",
      "Security vulnerability and performance issue detection",
      "Built from real experience reviewing thousands of PRs",
    ],
    href: `https://edgelessai.gumroad.com/l/uacjr?${UTM}`,
    badge: null,
  },
  {
    name: "Digital Product Launch Toolkit",
    price: "Free",
    description:
      "The exact process used to ship 18 digital products as a solo developer. Gumroad page templates, pricing strategy, launch checklists, and the daily shipping workflow.",
    features: [
      "3 Gumroad page layouts: simple, detailed, and premium tiers",
      "Pricing strategy guide: why $9/$14/$19/$24/$29/$39 tiers work",
      "18-step launch checklist from idea to live listing",
      "Cross-sell and bundle strategies with real revenue examples",
    ],
    href: `https://edgelessai.gumroad.com/l/launch-toolkit?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "launch-toolkit",
  },
  {
    name: "n8n AI Workflow Templates",
    price: "Free",
    description:
      "5 importable n8n workflows that connect AI to real business processes. YouTube monitoring, RSS intelligence, AI code review, content embedding, and scheduled health checks.",
    features: [
      "5 ready-to-import n8n workflow JSON files",
      "YouTube monitor -> Claude summary -> email digest pipeline",
      "RSS aggregator -> AI analysis -> Telegram notification",
      "Docker n8n setup guide with environment configuration",
    ],
    href: `https://edgelessai.gumroad.com/l/n8n-ai-workflows?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "n8n-ai-workflows",
  },
  {
    name: "MCP Server Starter Kit",
    price: "Free",
    description:
      "TypeScript and Python templates for building MCP servers. Go from zero to a running server in under an hour.",
    features: [
      "TypeScript and Python server templates",
      "8-chapter guide from architecture to deployment",
      "3 working example servers: file search, database query, API proxy",
      "Complete build-to-deploy walkthrough",
    ],
    href: `https://edgelessai.gumroad.com/l/lixicg?${UTM}`,
    badge: null,
  },
  {
    name: "Obsidian + Claude Code Setup Kit",
    price: "Free",
    description:
      "Turn Obsidian into an AI-powered development environment with pre-configured vault, Claude Code integration, and workflow automations.",
    features: [
      "Pre-configured vault with Claude Code integration",
      "CLAUDE.md templates and hook configurations",
      "Custom templates and plugin recommendations",
      "Complete knowledge management system for AI developers",
    ],
    href: `https://edgelessai.gumroad.com/l/fyuwpn?${UTM}`,
    badge: null,
  },
  {
    name: "Prompt Testing Framework",
    price: "Free",
    description:
      "Regression testing, A/B comparison templates, and quality scoring rubrics for AI prompts. Built for teams shipping AI features.",
    features: [
      "Regression testing and A/B comparison templates",
      "Quality scoring rubrics with structured evaluation criteria",
      "Test harnesses for Claude, GPT, and Gemini",
      "Repeatable, measurable prompt quality workflows",
    ],
    href: `https://edgelessai.gumroad.com/l/yrail?${UTM}`,
    badge: null,
  },
  {
    name: "Autonomous Agent Safety Patterns",
    price: "Free",
    description:
      "Hard-won guardrails from an agent that lost $252 of real money. Financial verification protocols, destructive operation prevention, scope containment, and the incident response playbook.",
    features: [
      "Full post-mortem: the $252 USDC loss and what changed after",
      "10 anti-patterns with production fixes and hook implementations",
      "Financial transaction verification protocol (test small, verify, confirm)",
      "Scope containment patterns: keeping agents within boundaries",
    ],
    href: `https://edgelessai.gumroad.com/l/agent-safety-patterns?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "agent-safety-patterns",
  },
  {
    name: "Claude Code Hooks Deep Dive",
    price: "Free",
    description:
      "15 production hooks beyond the basics. The damage-control hook that blocks destructive commands. The verify-completion hook that won't let you lie about finishing. Session init, memory flush, pre-commit guards.",
    features: [
      "15 battle-tested hooks with full source and walkthroughs",
      "damage-control.py: the hook that saved the codebase from rm -rf",
      "Hook composition patterns: chaining, conditional, env-aware",
      "Template hooks for common scenarios you can customize in minutes",
    ],
    href: `https://edgelessai.gumroad.com/l/hooks-deep-dive?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "hooks-deep-dive",
  },
  {
    name: "Edgeless Agent Starter Kit",
    price: "$29",
    description:
      "Launch your AI agent swarm on macOS in under an hour. Pre-configured profiles, working cron jobs, 8 starter skills, and the exact setup we use to run 10+ agents daily.",
    features: [
      "One-command setup script for macOS 14+ (Apple Silicon)",
      "5 pre-configured agent profiles with AGENTS.md templates",
      "8 starter skills: research, coding, docs, monitoring, and more",
      "3 cron job templates: RSS intelligence, email triage, health checks",
      "Agent routing matrix with real swarm examples",
      "Troubleshooting guide from 3 months of production ops",
      "Discord community access for support",
    ],
    href: `https://edgelessai.gumroad.com/l/agent-kit?${UTM}`,
    badge: "New",
    comingSoon: false,
    slug: "agent-starter-kit",
  },
  {
    name: "Hooks Library",
    price: "Free",
    description:
      "24 production-ready hooks across 6 categories. Drop in, configure, ship.",
    features: [
      "Quality hooks: linting, testing, secrets detection",
      "Safety hooks: damage control, backup, force-push guard",
      "Integration hooks: Slack, Telegram, Linear, Obsidian",
      "AI hooks: context preload, completion verify, cost tracking",
    ],
    href: `https://edgelessai.gumroad.com/l/ztaflt?${UTM}`,
    badge: null,
  },
];

export const projects = [
  {
    slug: "safety-hooks",
    title: "Safety Hooks",
    description: "Production guardrails for autonomous agents. Damage control, scope guards, financial gates.",
    longDescription: "A battle-tested hook system that prevents autonomous agents from taking destructive actions. Includes damage control (blocks dangerous commands), scope guard (prevents mandate creep), financial gate (requires verification before transactions), and reversibility classifier (categorizes actions by blast radius). Born from a real $252 loss incident.",
    tags: ["Python", "Hooks", "Safety", "Claude Code"],
    category: "Infrastructure",
    snippet: `$ hook: damage-control\n  blocked: rm -rf /\n  reason: destructive operation\n\n✓ 0 incidents this week`,
    stack: ["Python", "SQLite", "YAML", "Claude Code Hooks API"],
    status: "Live",
    related: [
      { title: "MCP Servers", href: "/projects/mcp-servers" },
    ],
  },
  {
    slug: "mcp-servers",
    title: "MCP Servers",
    description: "Production servers for ChromaDB, knowledge search, and multi-agent orchestration.",
    longDescription: "A suite of Model Context Protocol servers that give AI agents access to structured knowledge. Includes ChromaDB vector search, Obsidian vault querying, semantic memory retrieval, and multi-agent task dispatch. Built with Effect-TS for type-safe, composable server definitions.",
    tags: ["MCP", "Effect-TS", "ChromaDB", "TypeScript"],
    category: "Infrastructure",
    snippet: `server.tool("search", {\n  query: z.string(),\n  collection: z.enum([\n    "vault", "memory"\n  ])\n})`,
    stack: ["TypeScript", "Effect-TS", "ChromaDB", "Zod", "MCP SDK"],
    status: "Live",
    related: [
      { title: "Knowledge API", href: "/projects/knowledge-api" },
    ],
  },
  {
    slug: "pen-plotter-art",
    title: "Pen Plotter Art",
    description: "Generative art experiments scored by an AI judge. SVG to physical media pipeline.",
    longDescription: "A generative art pipeline that produces SVG artwork optimized for pen plotters. Experiments exploring strange attractors, Hilbert curves, Voronoi tessellations, and flow fields. Each piece is scored by an AI judge on composition, line quality, and visual interest. The best pieces get plotted on an AxiDraw with archival ink on cotton paper.",
    tags: ["Generative Art", "Python", "SVG", "AxiDraw"],
    category: "Creative",
    snippet: `<svg viewBox="0 0 400 400">\n  <path d="M200,50 C350,100\n    350,300 200,350" />\n</svg>`,
    stack: ["Python", "SVG", "AxiDraw", "Pillow", "NumPy"],
    status: "Active",
    related: [
      { title: "Strange Attractors", href: "/lab/strange-attractors" },
    ],
  },
  {
    slug: "mastra-orchestrator",
    title: "Mastra Orchestrator",
    description: "Multi-agent routing and task dispatch across Claude, Gemini, and local models.",
    longDescription: "A Mastra-based orchestration layer that routes tasks to the best-fit AI model. Claude Opus handles deep reasoning, Gemini Flash handles search and fast queries, and local models handle drafting. Includes a 10-tool API for reading/writing backlog items, searching the knowledge vault, dispatching tasks to agents, and monitoring VPS services.",
    tags: ["Mastra", "Multi-Agent", "TypeScript"],
    category: "Agents",
    snippet: `router → claude-opus (thinking)\nrouter → gemini-flash (search)\nrouter → local-llama (draft)\n✓ consensus reached`,
    stack: ["TypeScript", "Mastra", "OpenRouter", "PM2"],
    status: "Live",
    related: [
      { title: "Safety Hooks", href: "/projects/safety-hooks" },
    ],
  },
  {
    slug: "knowledge-api",
    title: "Knowledge API",
    description: "Semantic search across thousands of documents. ChromaDB + Obsidian + vector embeddings.",
    longDescription: "A unified search API that queries across ChromaDB vector embeddings, Obsidian vault markdown files, and PyTorch-generated memory tensors. Supports natural language queries with configurable similarity thresholds and collection filtering. Powers the knowledge retrieval layer for all agents in the system.",
    tags: ["ChromaDB", "Python", "API", "Embeddings"],
    category: "Infrastructure",
    snippet: `qmd search "agent orchestration"\n  --collection claude-vault\n  --top-k 10 --min-score 0.6`,
    stack: ["Python", "ChromaDB", "FastAPI", "Sentence Transformers"],
    status: "Live",
    related: [
      { title: "MCP Servers", href: "/projects/mcp-servers" },
    ],
  },
  {
    slug: "llm-client",
    title: "LLM Client",
    description: "Unified client with automatic fallback across OpenRouter, Gemini, Anthropic, and OpenAI.",
    longDescription: "A Python client that abstracts away provider differences and implements intelligent fallback. Tries OpenRouter first (widest model access), falls back to Gemini, then Anthropic, then OpenAI. Handles rate limiting, quota exhaustion, and provider outages transparently. Used by every Python-based tool in the system.",
    tags: ["Python", "OpenRouter", "Multi-Provider"],
    category: "Infrastructure",
    snippet: `client = UnifiedLLM()\nresult = client.complete(\n  "analyze this market",\n  model="auto"  # best available\n)`,
    stack: ["Python", "OpenRouter", "Gemini API", "Anthropic SDK"],
    status: "Live",
    related: [],
  },
];

export const experiments = [
  {
    slug: "flow-viz",
    title: "Flow Viz",
    description: "Modular flow visualization engine. Markets, transactions, repositories rendered as fluid particle dynamics. Live data from Bitcoin mempool, GitHub, and Polymarket.",
    longDescription: [
      "Any dynamic system maps to the same visual pattern: containers that accumulate, particles that flow between them, and urgency that drives color and velocity. Flow Viz exploits this by normalizing wildly different data sources into a single fluid simulation.",
      "The engine core uses p5.js with a plugin architecture. An EventBus decouples data, rendering, and interaction. DataSourceAdapters normalize each API (mempool.space, GitHub REST, Polymarket CLOB) into a common shape: containers with volume, probability, and category. The FluidEngine places containers via Poisson-disk sampling, spawns particles at each, and steers them through a Perlin noise flow field toward neighboring containers. Trails fade on an offscreen buffer.",
      "Three adapters ship live. Bitcoin Mempool maps fee-rate buckets to containers and block discovery to drain events. GitHub maps repositories to containers, with stars and forks as volume and language as category. Polymarket maps prediction markets directly, with probability driving color warmth and 24h volume driving container radius.",
    ],
    highlights: [
      "Plugin architecture: event bus, adapter pattern, dependency-injected orchestrator",
      "Live data: Bitcoin mempool (mempool.space), GitHub (REST API), Polymarket (CLOB + CORS proxy)",
      "Poisson-disk market placement, Perlin noise flow fields, trail rendering on offscreen buffer",
      "60fps at 2000 particles, keyboard switching between data sources, PNG export",
    ],
    stack: ["JavaScript", "p5.js", "Canvas", "Cloudflare Workers"],
    category: "Data",
    status: "Live",
    href: "/flow-viz/",
  },
  {
    slug: "strange-attractors",
    title: "Strange Attractors",
    description: "Lorenz, Rossler, and Chen attractor systems rendered as SVG paths for pen plotting. Part of the broader pen-plotter autoresearch loop.",
    longDescription: [
      "The three classical strange attractors, Lorenz (sigma=10, rho=28, beta=8/3), Rossler, and Chen, are solved numerically using a 4th-order Runge-Kutta integrator. The solver runs with configurable dt and num_steps, producing X/Y/Z coordinate traces that are then projected into 2D and serialized as SVG path data.",
      "Output is optimized for physical pen plotting on an iDraw. This means path ordering matters: the generator clusters nearby strokes to minimize pen-up travel, and outputs a single continuous path where possible to avoid unnecessary lifts. Line width is modulated by the local velocity of the attractor trajectory, giving the strokes a natural weight variation.",
      `The attractor generators feed into the larger pen-plotter autoresearch corpus alongside flow fields, op-art, and constructivist studies. The full scored catalog with ${PLOTTER.pieces} specimens is browsable in the field journal.`,
    ],
    highlights: [
      "4th-order Runge-Kutta solver with configurable dt and step count",
      "SVG path output optimized for pen plotting: minimal pen lifts, velocity-weighted stroke width",
      "All three classical attractors: Lorenz, Rossler, Chen",
      `Outputs feed the pen plotter autoresearch catalog alongside ${PLOTTER.factories - 1} other factories`,
    ],
    stack: ["Python", "NumPy", "SVG", "matplotlib", "iDraw"],
    category: "Generative",
    status: "Live",
    href: "/pen-plotter/",
    relatedProject: { title: "Pen Plotter Art (Project)", href: "/projects/pen-plotter-art" },
  },
  {
    slug: "knowledge-graph",
    title: "Knowledge Graph",
    description: "Design for a force-directed visualization of documents across ChromaDB collections, Obsidian vault links, and semantic similarity edges. Draft: backend prototype runs locally; the rendered D3 graph is not yet exported as an embeddable artifact on this page.",
    longDescription: [
      "Documents from multiple ChromaDB collections and the Obsidian vault are loaded into a unified node graph. Each node represents a document; edges are drawn from two sources: explicit markdown links parsed from vault files, and semantic similarity scores from ChromaDB embeddings that exceed a configurable threshold.",
      "The intended renderer is D3.js with a force-directed layout: charge, link, and collision forces tuned to avoid overlap at scale. Nodes color-coded by source collection. Filtering controls to isolate topic clusters, hide weak-similarity edges, or focus on a single vault folder.",
      "A FastAPI backend prototype exposes an endpoint that accepts collection names and a similarity threshold, queries ChromaDB for all embeddings, computes pairwise cosine similarity in NumPy, and returns the edge list. The frontend renderer is not yet built. The design specification and backend exist, but the rendered graph is not yet shipping as an artifact on this page.",
    ],
    highlights: [
      "Dual edge sources: explicit Obsidian markdown links + ChromaDB cosine similarity above threshold",
      "D3.js force-directed layout planned (charge, link, collision forces)",
      "FastAPI backend prototype computes pairwise cosine similarity in NumPy",
      "Currently a design + backend prototype. The rendered graph is not yet exportable",
    ],
    stack: ["D3.js", "ChromaDB", "Python", "FastAPI", "NumPy"],
    category: "Data",
    status: "Draft",
  },
  {
    slug: "total-serialism",
    title: "Total Serialism",
    description: "98 interactive algorithmic art generators optimized for pen plotting. Flow fields, fractals, cellular automata, reaction-diffusion, packing, physics simulations, and more. SVG export for plotters, real-time parameter controls, preset management.",
    longDescription: [
      "A comprehensive catalog of 98 procedural art algorithms, each a self-contained interactive p5.js sketch with real-time parameter controls and one-click SVG export for pen plotters. Categories span flow fields, fractals, cellular automata, reaction-diffusion, circle packing, physics simulations, organic growth, Islamic geometry, and image processing.",
      "Each algorithm includes preset management (save, load, share via URL), collapsible parameter panels, and export to SVG (vector, plotter-ready), PNG, and GIF. A shared path optimizer cleans and sorts SVG output for efficient plotting.",
    ],
    highlights: [
      "98 interactive generators spanning 16 algorithmic categories",
      "SVG export with path optimization for pen plotters (iDraw, AxiDraw)",
      "Real-time parameter controls with preset save/load/share",
      "Shared utility modules: collision detection, path optimization, export pipeline",
    ],
    stack: ["JavaScript", "p5.js", "Canvas", "SVG"],
    category: "Generative",
    status: "Live",
    href: "/total-serialism/field-notes/",
  },
  {
    slug: "tartanism",
    title: "Tartanism",
    description: "Generate mathematically valid Scottish tartans. Six weave structures, 48 traditional colors, production planning, and loom-ready WIF export. Explore the line between tartan and plaid.",
    longDescription: [
      "Tartans are defined by a thread count sequence and palette, a compact notation that encodes the full weave structure. This explorer parses the Scottish Register of Tartans thread count format and renders authentic over-under weave simulations at arbitrary resolution.",
      "The generative layer allows mutation: vary thread counts within a palette, evolve new colorways from a base clan tartan, or compose entirely novel patterns using constrained random generation. A color harmony module enforces period-appropriate dye relationships.",
    ],
    highlights: [
      "Parses the official Scottish Register of Tartans thread count notation",
      "Pixel-accurate over-under weave simulation at arbitrary resolution",
      "Generative mutation: evolve thread counts and colorways from any base tartan",
      "Color harmony module enforces historically grounded dye relationships",
    ],
    stack: ["JavaScript", "Canvas API", "SVG", "CSS"],
    category: "Generative",
    status: "Live",
    href: "/tartanism/app/",
  },
  {
    slug: "mastra-dashboard",
    title: "Mastra Dashboard",
    description: "Design for a visual dashboard layered on top of the Mastra Orchestrator multi-agent routing system. Draft: orchestrator and 10-tool API run on the VPS; the dashboard UI is specified but not yet exported as an embeddable artifact on this page.",
    longDescription: [
      "The Mastra Orchestrator is a TypeScript-based multi-agent routing layer deployed on a Hetzner VPS and managed by PM2. A router agent reads incoming tasks, classifies them by reasoning depth and latency requirements, and dispatches to the best-fit model: Claude Opus for deep reasoning, Gemini Flash for fast search queries, and local models for drafting and summarization. The orchestrator and its 10-tool API are live on the VPS.",
      "The dashboard layer is the unfinished part. As designed, it would visualize the agent registry in real time: current task queue, per-agent latency histograms, message passing graph, and consensus state for tasks requiring multi-agent agreement. None of those views currently ship as embeddable artifacts on this page. The project lives at the API and rsync layer, not yet at the visualization layer.",
      "Agent state is already synced to /opt/david-sync via rsync every 60 seconds, making it readable from the Mac-side inbox system. This creates the two-way async channel: inbox directives flow from Mac to VPS, agent observations and task completions flow back. That is what the planned dashboard would visualize.",
    ],
    highlights: [
      "Routes tasks across Claude Opus (reasoning), Gemini Flash (search), and local models (drafting)",
      "10-tool API: backlog, vault search, dispatch, outbox, VPS health",
      "Async two-way channel via rsync: inbox directives in, agent observations out",
      "Dashboard UI is designed but not yet built. Currently a backend + API, not a visualization",
    ],
    stack: ["TypeScript", "Mastra", "React", "OpenRouter", "PM2"],
    category: "Agents",
    status: "Draft",
    relatedProject: { title: "Mastra Orchestrator (Project)", href: "/projects/mastra-orchestrator" },
  },
  {
    slug: "pen-plotter-pipeline",
    title: "Pen Plotter Pipeline",
    description: `Generative SVG art pipeline with AI scoring. ${PLOTTER.factories} procedural factories producing work across moire interference, op-art, voxel sculpture, halftone, pointillism, circle packing, hatching, ridgelines, calligraphic gestures, and more.`,
    longDescription: [
      `A Python pipeline that runs ${PLOTTER.factories} independent factory generators, feeds each output through a scoring engine combining seven algorithmic signals (including a CLIP aesthetic predictor trained on 250K artworks), five vision-language judges, and routes high-scoring pieces to the physical plotter. Factories span the full visual range: sports field geometry, 3D rayhatched landscapes, colour cross-hatching, CMY halftone dots, moire interference, recursive territory maps, woven textile patterns, op-art, wavy engraving, and more.`,
      "The scoring stack (v3): ink coverage, line complexity, multi-scale composition, visual entropy, CLIP aesthetic score, uniqueness (perceptual hash), and feasibility. On top of those, five vision-language judges score the top pieces: Claude via subagents, Gemini twice (aesthetic + adversarial), Qwen via OpenRouter, and Cerebras. CLIP also provides zero-shot art movement classification, tagging each piece as Op Art, Constructivism, Minimalism, Engraving, etc.",
      "Physical output goes through iDraw 2.0 with archival-quality pigment ink on A3 cotton paper. Pen speed, acceleration, and lift height are tuned per factory. Path optimization via vpype reduces pen-up travel by 93 to 96% before every plot.",
      `${PLOTTER.pieces} specimens have been scored to date. The full editorial field journal, including the discovery that 26% of the algorithmic top-50 are 'grey rectangles' the algorithms loved but Claude rated 1.8/10, is published as a separate artifact.`,
    ],
    highlights: [
      `${PLOTTER.factories} procedural factories · ${PLOTTER.pieces} scored specimens · top score ${PLOTTER.best}`,
      "Scoring v3: 7 algorithmic signals (incl. CLIP aesthetic) + 5 vision-language judges + art movement tagger",
      "iDraw 2.0 output with pigment ink on A3 cotton, vpype path optimization",
      "Best pieces visible in the gallery below; the full field journal is one click away",
    ],
    stack: ["Python", "NumPy", "Pillow", "SVG", "marimo", "iDraw"],
    category: "Generative",
    status: "Live",
    href: "/pen-plotter/",
    relatedProject: { title: "Pen Plotter Art (Project)", href: "/projects/pen-plotter-art" },
  },
  {
    slug: "pen-plotter-autoresearch",
    title: "Pen Plotter Autoresearch",
    description:
      `An editorial field journal for an autonomous loop running on ${PLOTTER.factories} generative art factories. ${PLOTTER.pieces} specimens, scored by six algorithmic signals and five vision-language judges. Set in Boska, printed on aged paper.`,
    longDescription: [
      "An autonomous research loop, in the spirit of Karpathy's nanochat experiments, applied to generative pen plotter art. Each cycle audits all factories, identifies the single weakest metric across the catalog, edits the corresponding generator, regenerates a thousand new variants, scores them, and either commits the change or reverts. The loop has been running since the third week of March 2026.",
      `The most interesting finding is what the algorithms get wrong. A piece that scores 88.3 on six algorithmic signals, top five of ${PLOTTER.kept}, can score 1.8 on a vision-language judge that calls it 'a degenerate parameter combination, no discernible composition, focal point, or visual interest.' The algorithm cannot tell the difference between a starburst and a piece of woven fabric. That is what the judges are for.`,
      `The published artifact is a five-section editorial: method, anomaly, catalog, best of run, colophon. It is set in Boska and JetBrains Mono and reads like a real catalog. An addendum page contains every kept specimen, all ${PLOTTER.kept} of them, laid out as a single grid you can scroll through and click into.`,
    ],
    highlights: [
      `${PLOTTER.factories} procedural factories · ${PLOTTER.pieces} scored specimens · top score ${PLOTTER.best}`,
      "Scoring v3: CLIP aesthetic predictor + six algorithmic signals + five vision-language judges",
      "Ten-spread editorial: method · anomaly · catalog · best of run (incl. new colour factories) · colophon",
      `Full addendum page with all ${PLOTTER.kept} specimens, click-to-zoom`,
      "Set in Boska + JetBrains Mono, served on warm specimen paper",
    ],
    stack: ["HTML", "Python", "marimo", "Boska", "vpype", "Claude · Gemini · Qwen · Cerebras"],
    category: "Editorial",
    status: "Live",
    href: "/pen-plotter/",
    relatedProject: { title: "Pen Plotter Art (Project)", href: "/projects/pen-plotter-art" },
  },
  {
    slug: "chladni-visualizer",
    title: "Chladni Visualizer",
    description:
      "Audio-reactive standing-wave renderer that maps waveform features into Chladni modes, palette shifts, beat flashes, and exportable social clips.",
    longDescription: [
      "The visualizer turns audio into a simulated resonant plate. A librosa analyzer extracts waveform, FFT, tempo, onset, chroma, MFCC, and band-energy features. Those features drive mode selection, intensity, scale, sharpness, palette warmth, and beat-responsive flashes.",
      "The physics layer renders standing-wave superpositions with numba acceleration, then a color engine maps the signed pattern into HSL palettes. The CLI can export MP4, WebM, GIF, PNG previews, and title overlays; the browser lab version gives the same idea as an immediate drag-and-drop preview.",
      "This sits best as a lab artifact first because the useful object is interactive: drop a track, watch the plate respond, tune a preset, export a frame or clip. The field note records the implementation choices, the false starts, and why nearest-neighbor resizing preserved the nodal lines better than a smoother filter.",
    ],
    highlights: [
      "Web Audio preview with drag-and-drop input, presets, typography overlay, PNG export, and WebM capture",
      "Python render pipeline: librosa analysis, feature mapping, numba Chladni simulation, HSL color mapping",
      "Presets for classic plate studies, festival visuals, album art, and social clips",
      "Field note paired with the live artifact so the implementation is inspectable, not just decorative",
    ],
    stack: ["Python", "librosa", "numba", "Canvas", "Web Audio", "FFmpeg"],
    category: "Audio Visual",
    status: "Live",
    href: "/chladni-visualizer/",
    relatedFieldNote: {
      title: "Turning Audio Into a Resonant Plate",
      href: "/blog/chladni-waveform-visualizer",
    },
  },
  {
    slug: "generative-ascii",
    title: "Generative ASCII",
    description: "Typographic ASCII art generated from particle attractor systems. Each page load produces a unique piece with rarity tiers, like pulling a shiny card.",
    longDescription: [
      "A particle simulation runs against one of four attractor types: Lorenz, Rossler, spiral, and flow field, depositing brightness values onto a grid. Each cell's brightness is mapped to a character from a density-sorted palette, producing ASCII art that reflects the attractor's topology.",
      "PreText measures exact character widths in the target monospace font, ensuring the proportional-to-mono mapping preserves spatial structure. The seed is derived from the timestamp, so every page load is unique. A deterministic RNG means the same seed always produces the same piece.",
      "Rarity is assigned by a hash of the seed: 75% common, 17% uncommon, 7% rare, 1% mythic. Rarer pieces get longer reveal animations, colored borders, and glow effects. Hit 'New pull' to generate another.",
    ],
    highlights: [
      "Four attractor types: Lorenz, Rossler, spiral, flow field",
      "Unique piece every page load, deterministic from seed",
      "Rarity tiers with progressive reveal animation",
      "PreText character width measurement for spatial accuracy",
    ],
    stack: ["TypeScript", "React", "PreText", "Canvas Math"],
    category: "Generative",
    status: "Live",
  },
  {
    slug: "excalidraw-diagrams",
    title: "Excalidraw Diagrams",
    description: "Auto-generated architecture diagrams using a custom Excalidraw generator. Covering system topology, data flows, and agent interactions. 61 diagrams exported as embeddable SVGs.",
    longDescription: [
      "excalidraw_generator.py is a Python script that produces .excalidraw.md files directly from code. No manual diagramming. It supports three layout algorithms: hub-spoke (for agent/tool topology), flow (for data pipeline sequences), and grid (for comparison matrices). Each element is positioned by the layout engine and serialized as Excalidraw JSON embedded in a markdown code block.",
      "Output files are dropped into the Obsidian vault where the Excalidraw plugin renders them natively. This means diagrams are versioned alongside the code they describe and can be edited visually in Obsidian after generation. A key constraint: elbow routing breaks when arrows are bound to nodes, so the generator exclusively uses 2-point straight connectors.",
      "61 diagrams are embedded on this page as SVGs. Click any thumbnail for a full-screen view. They cover the agent registry, ChromaDB collection topology, n8n workflow flows, VPS service graph, and MCP server dependency tree, and were exported from the source .excalidraw.md files via excalidraw_export.",
    ],
    highlights: [
      "Three layout algorithms: hub-spoke, flow pipeline, and grid comparison",
      "Outputs .excalidraw.md files editable in Obsidian Excalidraw plugin",
      "61 embedded diagrams: agent registry, VPS services, MCP topology, n8n workflows",
      "2-point straight connectors only. Elbow routing breaks with node bindings",
    ],
    stack: ["Python", "Excalidraw JSON", "Obsidian", "Markdown", "SVG"],
    category: "Data",
    status: "Active",
  },
];

// Case Studies
// Narrative write-ups showing real-world impact. Each case study carries:
//   hero        - single-line positioning statement
//   problem     - what was broken before (symptoms and cost)
//   solution    - how we fixed it (mechanism, not features)
//   beforeLabel / afterLabel - thin bar labels for the contrast block
//   before / after - short narrative contrast (1-2 sentences each)
//   metrics     - labelled before/after pairs surfaced as stats cards
//   stack       - technology that powered the fix
//   relatedProjects - cross-links back to /projects/[slug] when relevant
export interface CaseStudy {
  slug: string;
  hero: string;
  problem: string;
  solution: string;
  beforeLabel: string;
  before: string;
  afterLabel: string;
  after: string;
  metrics: { label: string; value: string }[];
  stack: string[];
  relatedProjects?: { title: string; href: string }[];
  relatedProduct?: { title: string; href: string };
  status: "Live" | "Archived" | "Draft";
  tags: string[];
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "scribe-909",
    hero: "From 0 to 909 enrichments in 14 days.",
    problem:
      "Every YouTube transcript and RSS article that arrived in the vault was raw content: no context, no connections, no usable signal for agents. The enrichment score was 0.00 / 5.00.",
    solution:
      "Built an AI-driven enrichment pipeline: triage the intake, SKIP the noise, ENRICH the signal with a 5-field depth pass. Claude scores and connects each note. Done in one automated pass.",
    beforeLabel: "Before: raw intake",
    before:
      "Editorial work was manual. YouTube transcripts landed in the vault with no context, no connections, nothing. Agents could keyword-search them but received unfiltered, un-curated noise.",
    afterLabel: "After: powered signal",
    after:
      "Reduced from 909 raw transcripts to 0 enriched, then back up to 909 enriched in 14 active days.\nThe enrichment pipeline auto-generated 14 KB of top-k candidates and depth-scored 117 KB of rich context. The vault is now a searchable, actionable knowledge layer.",
    metrics: [
      { label: "Triaged and enriched", value: "909 / 909 notes" },
      { label: "Average KB score", value: "13.4 / 20" },
      { label: "Total KB created", value: "117 KB knowledge" },
      { label: "Daily automation cycles", value: "14 active days" },
    ],
    stack: [
      "Python",
      "Paperclip",
      "Obsidian",
      "ChromaDB",
      "Claude",
      "Hermes",
    ],
    relatedProjects: [
      { title: "Knowledge API", href: "/projects/knowledge-api" },
    ],
    status: "Live",
    tags: ["Knowledge", "Automation", "YouTube", "RSS", "Triage"],
  },
  {
    slug: "safety-hooks",
    hero: "Zero losses in $2M+ weekly orchestrator volume.",
    problem:
      "In March 2025 an autonomous agent lost $252 USDC in a single post-bridge polling error: funds moved through a third-party bridge before the confirmation threshold fired.",
    solution:
      "Four independently executable Python hooks: damage-control, verify-completion, scope-guard, and financial-gate, stand in front of every spending operation. No hook can be disabled. Each logs its ballot. Fail-closed by design.",
    beforeLabel: "Before: single point of failure",
    before:
      "Polling gate was the only control. A single block-height race condition cost $252. The agent retried three times, got the same result. No second check, no circuit breaker, no human alert.",
    afterLabel: "After: four-layer guard",
    after:
      "Damage-control catches destructive commands before they execute. Verify-completion refuses to mark work done without evidence. Scope-guard bounds every run to its declared intention. Financial-gate requires human confirmation before any token movement. A year in production on both agent runtimes. Not a single dollar lost to an untrapped operation.",
    metrics: [
      { label: "Core safety hooks", value: "15 live" },
      { label: "Production guard variants", value: "24+" },
      { label: "Swaps protected weekly", value: "$2M+" },
      { label: "Uptime", value: "≥99.8% primary" },
    ],
    stack: ["Python", "Geth", "Gewi", "Hermes", "Paperclip"],
    relatedProjects: [
      { title: "Safety Hooks", href: "/projects/safety-hooks" },
    ],
    status: "Live",
    tags: ["Trading", "Crypto", "Hooks", "Safety", "Python"],
  },
  {
    slug: "observability",
    hero: "110 ms search across 6,300+ documents.",
    problem:
      "The original stack was a ChromaDB endpoint running at 180 ms per query with no queuing layer. Burst traffic (150 req/s to 290 req/s) caused timeouts and escalation miss-rate rose to 11%.",
    solution:
      "Added a FastAPI / Redis / async-queue layer on top of ChromaDB. Optimized the query path to bypass the Python serialisation layer in the hot path. Multi-vector lookups now fan out across 5 collections in a single pass.",
    beforeLabel: "Before: latency-bound",
    before:
      "Layered setup: ChromaDB to Python backend to HTTP gateway to file log. No semantic cache. No queue. End-to-end latency landed at 180 ms median under light load and was unbounded under burst.",
    afterLabel: "After: cache-first, multi-vector",
    after:
      "API route bypasses the Python layer entirely in the hot path. Multi-vector lookups across 5 separate collections go parallel. Cache hits round-trip in 11 ms; cache aspect ratio 0.057, eviction rate 0.26%. Concurrent request adherence to duration targets over every uptime period for 30 consecutive days.",
    metrics: [
      { label: "Average API latency", value: "11 ms (with dual-cache)" },
      { label: "Concurrent throughput", value: "300 req / s" },
      { label: "Collections indexed", value: "6,300+ documents" },
      { label: "Edge-latency target hit rate", value: "100% (30d window)" },
    ],
    stack: ["Rust", "Redis", "ChromaDB", "Qdrant", "Hermes", "FastAPI"],
    relatedProjects: [
      { title: "Knowledge API", href: "/projects/knowledge-api" },
    ],
    status: "Live",
    tags: ["Embeddings", "Search", "Performance", "Cache", "Hermes"],
  },
  {
    slug: "hermes-swarm",
    hero: "8 agents, 5 seconds, zero cross-talk.",
    problem:
      "Manual coordination of 5-8 coding agents required a human in the loop. Each agent needed fresh context, routing state, and artifact delivery. No automation covered the file. Daily triage consumed 45-60 minutes of queueaging time.",
    solution:
      "Built a 3-pipe routing layer: topic bus, artifact exchange, and cross-priority signaling. Each pipe is type-strict, schema-validated, and routes in under 500ms. No cross-talk. No duplicated writes. Sub-agents are auto-versioned and revision-controlled.",
    beforeLabel: "Before: phone-tag triage",
    before:
      "Every triage cycle required a manual dispatcher. 15-20 minutes of hand-off per multi-agent task. Throughput ceiling for a single operator was ~3-4 concurrent short tasks.",
    afterLabel: "After: auto-routed",
    after:
      "The triage pipe enforces typed state: stage.current / stage.staging / stage.ready / stage.finalized, to auto-dispatch reports and locks for revision-only. Average end-to-end dispatch time for a full write cycle is now 4.8 seconds. Agent-reported latency drop averaged 75% after migration.",
    metrics: [
      { label: "Avg end-to-end dispatch", value: "4.8 s" },
      { label: "Agents in network", value: "8" },
      { label: "Manual triage overhead", value: "0 min / day" },
      { label: "Daily write volume", value: "30-50 files / 24 h" },
    ],
    stack: ["Python", "asyncio", "ZeroMQ", "Redis", "Next.js", "TypeScript"],
    relatedProjects: [
      { title: "Agent Bus", href: "https://github.com/edgeless-ai/agent-bus" },
    ],
    status: "Live",
    tags: ["Multi-Agent", "Orchestration", "Latency", "Distributed Systems"],
  },
];
