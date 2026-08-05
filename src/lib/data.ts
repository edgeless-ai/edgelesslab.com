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
  /**
   * Product category for section grouping in the grid.
   */
  category: string;
  /**
   * Visual tag annotations for the card (braille-style scoring dimensions).
   * Each tag is a { label, score } pair displayed as dot annotations.
   */
  scoreTags?: Array<{ label: string; score: 1 | 2 | 3 }>;
}

/** Braille-dot annotation presets */
export const TAG_ESSENTIAL = { label: "Essential", score: 3 as const };
export const TAG_RECOMMENDED = { label: "Recommended", score: 2 as const };
export const TAG_SPECIALIZED = { label: "Specialized", score: 1 as const };
export const TAG_BEGINNER = { label: "Beginner", score: 2 as const };
export const TAG_INTERMEDIATE = { label: "Intermediate", score: 2 as const };
export const TAG_ADVANCED = { label: "Advanced", score: 3 as const };

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
    category: "Agent Config",
    scoreTags: [TAG_ESSENTIAL, TAG_BEGINNER],
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
    category: "Reference Docs",
    scoreTags: [TAG_BEGINNER],
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
    category: "Agent Config",
    scoreTags: [TAG_BEGINNER],
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
    category: "Agent Config",
    scoreTags: [TAG_ESSENTIAL, TAG_BEGINNER],
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
    category: "Agent Infrastructure",
    scoreTags: [TAG_ESSENTIAL, TAG_ADVANCED],
  },
  {
    name: "Multi-Agent Orchestration Blueprint",
    price: "$39",
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
    category: "Agent Infrastructure",
    scoreTags: [TAG_RECOMMENDED, TAG_ADVANCED],
  },
  {
    name: "The Agent Cookbook",
    price: "$39",
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
    category: "Agent Infrastructure",
    scoreTags: [TAG_RECOMMENDED, TAG_INTERMEDIATE],
  },
  {
    name: "Claude Memory Kit Pro",
    price: "$29",
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
    category: "Agent Config",
    scoreTags: [TAG_RECOMMENDED, TAG_INTERMEDIATE],
  },
  {
    name: "The Prompt Engineering OS",
    price: "$29",
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
    category: "Reference Docs",
    scoreTags: [TAG_ESSENTIAL, TAG_INTERMEDIATE],
  },
  {
    name: "Generative Art Starter Kit",
    price: "$29",
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
    category: "Creative Kits",
    scoreTags: [TAG_SPECIALIZED, TAG_INTERMEDIATE],
  },
  {
    name: "Always-On Agent Deployment Kit",
    price: "$29",
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
    category: "Agent Infrastructure",
    scoreTags: [TAG_RECOMMENDED, TAG_ADVANCED],
  },
  {
    name: "Production MCP Server Kit",
    price: "$29",
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
    category: "Developer Kits",
    scoreTags: [TAG_RECOMMENDED, TAG_ADVANCED],
  },
  {
    name: "AI Code Review Playbook",
    price: "$24",
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
    category: "Safety & Quality",
    scoreTags: [TAG_RECOMMENDED, TAG_INTERMEDIATE],
  },
  {
    name: "Digital Product Launch Toolkit",
    price: "$24",
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
    category: "Creative Kits",
    scoreTags: [TAG_SPECIALIZED, TAG_BEGINNER],
  },
  {
    name: "n8n AI Workflow Templates",
    price: "$24",
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
    category: "Developer Kits",
    scoreTags: [TAG_SPECIALIZED, TAG_INTERMEDIATE],
  },
  {
    name: "MCP Server Starter Kit",
    price: "$24",
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
    category: "Developer Kits",
    scoreTags: [TAG_BEGINNER],
  },
  {
    name: "Obsidian + Claude Code Setup Kit",
    price: "$19",
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
    category: "Agent Config",
    scoreTags: [TAG_SPECIALIZED, TAG_BEGINNER],
  },
  {
    name: "Prompt Testing Framework",
    price: "$19",
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
    category: "Safety & Quality",
    scoreTags: [TAG_SPECIALIZED, TAG_ADVANCED],
  },
  {
    name: "Autonomous Agent Safety Patterns",
    price: "$19",
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
    category: "Safety & Quality",
    scoreTags: [TAG_ESSENTIAL, TAG_ADVANCED],
  },
  {
    name: "Claude Code Hooks Deep Dive",
    price: "$19",
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
    category: "Safety & Quality",
    scoreTags: [TAG_RECOMMENDED, TAG_ADVANCED],
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
    category: "Agent Infrastructure",
    scoreTags: [TAG_ESSENTIAL, TAG_INTERMEDIATE],
  },
  {
    name: "Hooks Library",
    price: "$14",
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
    category: "Developer Kits",
    scoreTags: [TAG_RECOMMENDED, TAG_INTERMEDIATE],
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
    snippet: `client = UnifiedLLM()\nresult = client.complete(\n  "analyze this market",\n  model="auto"  // best available\n)`,
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
  // ... remaining experiments omitted for brevity
];
