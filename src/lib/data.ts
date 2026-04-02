export interface Product {
  name: string;
  price: string;
  description: string;
  features: string[];
  href: string;
  badge: string | null;
  repoUrl?: string;
  comingSoon?: boolean;
}

const UTM = "utm_source=edgelesslab&utm_medium=website&utm_campaign=products";

export const products: Product[] = [
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
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
    badge: "Coming Soon",
    comingSoon: true,
  },
  {
    name: "CLAUDE.md Template Pack",
    price: "$14",
    description:
      "14 battle-tested CLAUDE.md templates for every project type. Drop one into your repo and start building.",
    features: [
      "14 templates: iOS, Android, ML, API, DevOps, Next.js, and more",
      "CLI Tools, Monorepos, and Game Dev configurations",
      "Embedded/IoT, Security Audits, and Open Source templates",
      "Startup MVP and Technical Writing presets",
    ],
    href: `https://edgelessai.gumroad.com/l/kszapk?${UTM}`,
    badge: null,
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
  },
  {
    name: "Quick Reference Cards",
    price: "$9",
    description:
      "Printable cheat sheets for prompt patterns, Claude Code shortcuts, MCP tool reference, and common workflows.",
    features: [
      "Prompt pattern and system prompt reference cards",
      "Claude Code shortcuts and slash commands",
      "Token optimization and temperature settings guide",
      "PDF and markdown formats, pin-next-to-monitor ready",
    ],
    href: `https://edgelessai.gumroad.com/l/dihxts?${UTM}`,
    badge: null,
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
    badge: "Open Source",
    repoUrl: "https://github.com/edgeless-ai/claude-memory-kit",
  },
];

export const projects = [
  {
    slug: "pamela",
    title: "Pamela",
    description: "Autonomous prediction market agent. ML-driven position sizing, live on Polymarket 24/7.",
    longDescription: "Pamela is an autonomous trading agent that monitors prediction markets on Polymarket, identifies mispriced contracts using ML-driven sentiment analysis and probability estimation, and executes trades with intelligent position sizing. Built in TypeScript, deployed on a Hetzner VPS, managed by PM2 for 24/7 uptime.",
    tags: ["TypeScript", "ML", "Polymarket", "PM2"],
    category: "Agents",
    snippet: `$ pm2 status pamela\n│ online │ 0 restarts\n\n24/7 autonomous execution`,
    stack: ["TypeScript", "Node.js", "PM2", "Hetzner VPS", "Polymarket API"],
    status: "Live",
    related: [
      { title: "Mastra Orchestrator", href: "/projects/mastra-orchestrator" },
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
      { title: "Pamela", href: "/projects/pamela" },
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
    slug: "strange-attractors",
    title: "Strange Attractors",
    description: "Lorenz, Rossler, and Chen attractor systems rendered as SVG paths for pen plotting. Real-time parameter exploration with live preview.",
    longDescription: [
      "The three classical strange attractors — Lorenz (sigma=10, rho=28, beta=8/3), Rossler, and Chen — are solved numerically using a 4th-order Runge-Kutta integrator. The solver runs with configurable dt and num_steps, producing X/Y/Z coordinate traces that are then projected into 2D and serialized as SVG path data.",
      "Output is optimized for physical pen plotting on an AxiDraw. This means path ordering matters: the generator clusters nearby strokes to minimize pen-up travel, and outputs a single continuous path where possible to avoid unnecessary lifts. Line width is modulated by the local velocity of the attractor trajectory, giving the strokes a natural weight variation.",
      "Parameters like rho, sigma, and initial conditions are exposed as sliders for live exploration. Small changes near the bifurcation points produce dramatically different topologies — the visualization makes those boundaries immediately visible in a way that static plots do not.",
    ],
    highlights: [
      "4th-order Runge-Kutta solver with configurable dt and step count",
      "SVG path output optimized for AxiDraw: minimal pen lifts, velocity-weighted stroke width",
      "Live parameter exploration with real-time SVG preview",
      "All three classical attractors: Lorenz, Rossler, Chen",
    ],
    stack: ["Python", "NumPy", "SVG", "matplotlib", "AxiDraw"],
    category: "Generative",
    status: "Active",
  },
  {
    slug: "knowledge-graph",
    title: "Knowledge Graph",
    description: "Force-directed visualization of documents across ChromaDB collections, Obsidian vault links, and semantic similarity edges.",
    longDescription: [
      "Documents from multiple ChromaDB collections and the Obsidian vault are loaded into a unified node graph. Each node represents a document; edges are drawn from two sources: explicit markdown links parsed from vault files, and semantic similarity scores from ChromaDB embeddings that exceed a configurable threshold.",
      "The graph is rendered with D3.js using a force-directed layout with charge, link, and collision forces tuned to avoid overlap at scale. Nodes are color-coded by source collection. Filtering controls let you isolate a topic cluster, hide weak-similarity edges, or focus on a single vault folder.",
      "The FastAPI backend exposes an endpoint that accepts collection names and a similarity threshold, queries ChromaDB for all embeddings in that collection, computes pairwise cosine similarity in NumPy, and returns the edge list. The frontend streams updates as new documents are ingested.",
    ],
    highlights: [
      "Dual edge sources: explicit Obsidian markdown links + ChromaDB cosine similarity above threshold",
      "D3.js force-directed layout with charge, link, and collision forces",
      "Color-coded by collection; real-time filter controls for topic and similarity cutoff",
      "FastAPI backend streams edge updates as new documents are ingested",
    ],
    stack: ["D3.js", "ChromaDB", "Python", "FastAPI", "NumPy"],
    category: "Data",
    status: "Live",
  },
  {
    slug: "total-serialism",
    title: "Total Serialism",
    description: "Algorithmic music composition using serialist techniques. Generates both audio output and visual score notation from tone rows and transformation matrices.",
    longDescription: [
      "An interactive implementation of 12-tone and total serialist composition techniques. Input a tone row and the system generates all 48 canonical transformations: prime, retrograde, inversion, and retrograde-inversion across all 12 transpositions. These can be sequenced manually or fed into an automatic generator that applies serialist principles to rhythm, dynamics, and articulation as well.",
      "The score renderer outputs standard notation using VexFlow, rendered to SVG. The audio engine uses the Web Audio API for real-time synthesis.",
    ],
    highlights: [
      "All 48 canonical tone row transformations: P, R, I, RI across 12 transpositions",
      "Total serialism extends the matrix to rhythm, dynamics, and articulation",
      "VexFlow score rendering and Web Audio API synthesis in the browser",
      "Interactive row editor with live preview of the transformation matrix",
    ],
    stack: ["JavaScript", "VexFlow", "Web Audio API", "SVG"],
    category: "Audio",
    status: "Live",
    href: "https://djmclaudeassistant-web.github.io/total-serialism/",
  },
  {
    slug: "tartanism",
    title: "Tartanism",
    description: "Generative tartan pattern explorer. Procedural plaid generation with historical clan data, color theory, and interactive weaving visualization.",
    longDescription: [
      "Tartans are defined by a thread count sequence and palette — a compact notation that encodes the full weave structure. This explorer parses the Scottish Register of Tartans thread count format and renders authentic over-under weave simulations at arbitrary resolution.",
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
    href: "https://djmclaudeassistant-web.github.io/tartanism/",
  },
  {
    slug: "mastra-dashboard",
    title: "Mastra Dashboard",
    description: "Visual dashboard for multi-agent task routing. Real-time display of agent states, message passing, and consensus formation across Claude, Gemini, and local models.",
    longDescription: [
      "The Mastra Orchestrator is a TypeScript-based multi-agent routing layer deployed on a Hetzner VPS and managed by PM2. A router agent reads incoming tasks, classifies them by reasoning depth and latency requirements, and dispatches to the best-fit model: Claude Opus for deep reasoning, Gemini Flash for fast search queries, and local models for drafting and summarization.",
      "The dashboard visualizes the agent registry in real time: current task queue, per-agent latency histograms, message passing graph, and consensus state for tasks requiring multi-agent agreement. The 10-tool API covers backlog read/write, vault search, task dispatch, outbox polling, and VPS service health checks.",
      "Agent state is synced to /opt/david-sync via rsync every 60 seconds, making it readable from the Mac-side inbox system. This creates a two-way async channel: inbox directives flow from Mac to VPS, agent observations and task completions flow back.",
    ],
    highlights: [
      "Routes tasks across Claude Opus (reasoning), Gemini Flash (search), and local models (drafting)",
      "10-tool API: backlog, vault search, dispatch, outbox, VPS health",
      "Real-time dashboard: agent states, latency histograms, message graph, consensus display",
      "Async two-way channel via rsync: inbox directives in, agent observations out",
    ],
    stack: ["TypeScript", "Mastra", "React", "OpenRouter", "PM2"],
    category: "Agents",
    status: "Live",
    relatedProject: { title: "Mastra Orchestrator (Project)", href: "/projects/mastra-orchestrator" },
  },
  {
    slug: "pen-plotter-pipeline",
    title: "Pen Plotter Pipeline",
    description: "Generative SVG art pipeline with AI scoring. Dozens of unique generators producing work across flow fields, attractors, tessellations, and algorithmic calligraphy.",
    longDescription: [
      "A Python pipeline that runs dozens of independent SVG generators, feeds each output to an AI judge, and routes high-scoring pieces to the physical plotter. Generators span four categories: flow fields (curl noise, streamlines from vector fields), strange attractors (Lorenz, Rossler, Chen), geometric tessellations (Penrose, Voronoi, Truchet), and algorithmic calligraphy (stroke-based glyph systems).",
      "The AI judge scores each piece on three axes: composition (balance, focal point, edge usage), line quality (density, variation, absence of tangencies), and visual interest (surprise, pattern at multiple scales). Scores above a threshold are queued for plotting; others feed back into the parameter search to improve the next generation.",
      "Physical output goes through AxiDraw with archival-quality Platinum Carbon ink on 100% cotton Fabriano paper. Pen speed, acceleration, and lift height are tuned per generator to match the stroke characteristics of each piece.",
    ],
    highlights: [
      "75+ generators across flow fields, attractors, tessellations, and calligraphy",
      "AI judge scores on composition, line quality, and visual interest; feedback loop into parameter search",
      "AxiDraw output with Platinum Carbon ink on 100% cotton Fabriano paper",
      "Path optimization: stroke clustering and pen-lift minimization before every plot",
    ],
    stack: ["Python", "NumPy", "Pillow", "SVG", "AxiDraw"],
    category: "Generative",
    status: "Active",
    relatedProject: { title: "Pen Plotter Art (Project)", href: "/projects/pen-plotter-art" },
  },
  {
    slug: "generative-ascii",
    title: "Generative ASCII",
    description: "Typographic ASCII art generated from particle attractor systems. Each page load produces a unique piece with rarity tiers, like pulling a shiny card.",
    longDescription: [
      "A particle simulation runs against one of four attractor types -- Lorenz, Rossler, spiral, and flow field -- depositing brightness values onto a grid. Each cell's brightness is mapped to a character from a density-sorted palette, producing ASCII art that reflects the attractor's topology.",
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
    description: "Auto-generated architecture diagrams using a custom Excalidraw generator. Covering system topology, data flows, and agent interactions.",
    longDescription: [
      "excalidraw_generator.py is a Python script that produces .excalidraw.md files directly from code — no manual diagramming. It supports three layout algorithms: hub-spoke (for agent/tool topology), flow (for data pipeline sequences), and grid (for comparison matrices). Each element is positioned by the layout engine and serialized as Excalidraw JSON embedded in a markdown code block.",
      "Output files are dropped into the Obsidian vault where the Excalidraw plugin renders them natively. This means diagrams are versioned alongside the code they describe and can be edited visually in Obsidian after generation. A key constraint: elbow routing breaks when arrows are bound to nodes, so the generator exclusively uses 2-point straight connectors.",
      "54 diagrams are currently indexed at claude-vault/Excalidraw/Diagram Index.md, covering the agent registry, ChromaDB collection topology, n8n workflow flows, VPS service graph, and MCP server dependency tree.",
    ],
    highlights: [
      "Three layout algorithms: hub-spoke, flow pipeline, and grid comparison",
      "Outputs .excalidraw.md files editable in Obsidian Excalidraw plugin",
      "54 indexed diagrams: agent registry, VPS services, MCP topology, n8n workflows",
      "2-point straight connectors only — elbow routing breaks with node bindings",
    ],
    stack: ["Python", "Excalidraw JSON", "Obsidian", "Markdown"],
    category: "Data",
    status: "Active",
  },
];
