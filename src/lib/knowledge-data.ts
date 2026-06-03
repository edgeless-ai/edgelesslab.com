export type KnowledgeSource = "YouTube" | "Research" | "Docs" | "Tools";

export interface KnowledgeEntry {
  id: string;
  title: string;
  summary: string;
  source: KnowledgeSource;
  tags: string[];
  date?: string;
}

export const knowledgeEntries: KnowledgeEntry[] = [
  // ── YouTube: AI Agents ──────────────────────────────────
  {
    id: "yt-claude-24h",
    title: "I Forced Claude to Code for 24 Hours Nonstop",
    summary:
      "Anthropic released an open-source harness enabling AI coding agents to work autonomously for extended periods. Claude Code ran for 24 continuous hours, a departure from agents that stop after short durations or require frequent intervention.",
    source: "YouTube",
    tags: ["claude-code", "autonomous-agents", "long-running"],
    date: "2026-02",
  },
  {
    id: "yt-learn-agents-30min",
    title: "Learn 90% of Building AI Agents in 30 Minutes",
    summary:
      "A comprehensive guide to AI agent development covering essential concepts in 30 minutes. Key technical components include tool use, memory systems, context management, and error recovery patterns.",
    source: "YouTube",
    tags: ["ai-agents", "tutorial", "fundamentals"],
    date: "2026-01",
  },
  {
    id: "yt-agentic-coding-workflow",
    title: "My Complete Agentic Coding Workflow to Build Anything",
    summary:
      "A practical framework for building applications with AI coding agents. The workflow centers on three core components: a PRD defining project scope, global rules for code style, and modular task files that agents execute sequentially.",
    source: "YouTube",
    tags: ["agentic-coding", "workflow", "productivity"],
    date: "2026-02",
  },
  {
    id: "yt-agent-threads",
    title: "Agent Threads: How to Ship like Boris Cherny",
    summary:
      "A taxonomy of thread types that progressively reduce human involvement: base threads (single agent), P-threads (parallel execution), C-threads (chained workflows), F-threads (fusion of outputs), and B-threads (meta-structural orchestration).",
    source: "YouTube",
    tags: ["agent-threads", "orchestration", "patterns"],
    date: "2026-03",
  },
  {
    id: "yt-agent-experts",
    title: "Agent Experts: Finally, Agents That Actually Learn",
    summary:
      "Parallel specialization with consensus voting reduces single-agent failure modes. If 3 out of 4 experts agree, confidence is high. The system uses 21 websocket event types for agent lifecycle tracking, enabling serious observability.",
    source: "YouTube",
    tags: ["multi-agent", "learning", "observability"],
    date: "2026-03",
  },
  {
    id: "yt-one-agent-rule-all",
    title: "The One Agent to Rule Them All: Advanced Agentic Coding",
    summary:
      "Scout/builder patterns and context window protection techniques maximize agent effectiveness. Engineering productivity now scales with your ability to command and orchestrate AI systems, not just use individual AI tools.",
    source: "YouTube",
    tags: ["agentic-coding", "scout-builder", "productivity"],
    date: "2026-01",
  },
  {
    id: "yt-big3-super-agent",
    title: "BIG 3 Super Agent: Gemini Computer Use, OpenAI Realtime, Claude Code",
    summary:
      "Build custom observability systems to monitor multiple agents working simultaneously. Voice-controlled interfaces via the OpenAI Realtime API manage and coordinate AI agents in real-time with closed-loop validation.",
    source: "YouTube",
    tags: ["multi-agent", "observability", "voice-control"],
    date: "2026-02",
  },
  {
    id: "yt-cracked-skills",
    title: "I Finally Cracked Claude Agent Skills (Breakdown for Engineers)",
    summary:
      "The composition hierarchy: Skills > MCP Servers > Sub-agents > Slash Commands > Raw Prompts. Skills can contain all lower-level primitives, orchestrating them as needed. Progressive disclosure loads only necessary capabilities per session.",
    source: "YouTube",
    tags: ["claude-code", "skills", "composition"],
    date: "2026-01",
  },
  // ── YouTube: MCP ────────────────────────────────────────
  {
    id: "yt-claude-real-purpose",
    title: "Claude Code's Real Purpose: It's Bigger Than You Think",
    summary:
      "Agents modifying their own architecture at runtime by adding MCP servers to a running system. A Telegram bot gains new capabilities without restart by integrating the sequential thinking MCP server.",
    source: "YouTube",
    tags: ["claude-code", "mcp", "self-modifying"],
    date: "2026-01",
  },
  {
    id: "yt-mcp-problem-solution",
    title: "The BIG Problem with MCP Servers (and the Solution)",
    summary:
      "Each MCP server consumes substantial context window space, causing 'context rot' as tool definitions accumulate. The solution involves selective tool loading and smarter context management strategies.",
    source: "YouTube",
    tags: ["mcp", "context-window", "optimization"],
    date: "2026-01",
  },
  {
    id: "yt-ditching-mcp",
    title: "Why Are Top Engineers Ditching MCP Servers? 3 Proven Solutions",
    summary:
      "Three practical alternatives to MCP: CLI scripts (teach agents to read READMEs and invoke commands), file system scripts (isolated Python with Astral UV), and skills (portable directories with progressive disclosure). Each trades convenience for context savings.",
    source: "YouTube",
    tags: ["mcp", "alternatives", "cli-tools"],
    date: "2026-02",
  },
  {
    id: "yt-anthropic-mcp-blog",
    title: "Anthropic's New MCP Blog Post is Huge",
    summary:
      "Anthropic introduces a code execution approach solving MCP's context window limitation. Traditional implementations load all tool definitions upfront, consuming hundreds of thousands of tokens before processing requests.",
    source: "YouTube",
    tags: ["mcp", "anthropic", "code-execution"],
    date: "2026-01",
  },
  // ── YouTube: RAG & Knowledge ────────────────────────────
  {
    id: "yt-any-file-llm",
    title: "Turn Any File into LLM Knowledge in Seconds",
    summary:
      "Dockling streamlines the document processing pipeline for RAG systems. Raw documents cannot be directly inserted into vector databases. They must first be intelligently chunked, cleaned, and embedded for retrieval.",
    source: "YouTube",
    tags: ["rag", "document-processing", "vector-db"],
    date: "2026-01",
  },
  {
    id: "yt-abandoned-rag",
    title: "Why the Best AI Coding Tools Abandoned RAG",
    summary:
      "RAG is not dead, but it is being replaced in specific domains. Coding tools like Claude Code abandoned traditional semantic search RAG (chunking + vector databases) in favor of file-level retrieval and grep-based search.",
    source: "YouTube",
    tags: ["rag", "coding-tools", "retrieval"],
    date: "2026-02",
  },
  {
    id: "yt-every-rag-strategy",
    title: "Every RAG Strategy Explained in 13 Minutes",
    summary:
      "Re-ranking with cross-encoder models, agentic RAG (letting AI choose search approach), contextual retrieval (LLM-enriched chunks), knowledge graphs (entity relationships), query expansion, and self-reflective RAG (quality grading).",
    source: "YouTube",
    tags: ["rag", "strategies", "retrieval"],
    date: "2026-01",
  },
  {
    id: "yt-second-brain",
    title: "I Built My Second Brain with Claude Code + Obsidian + Skills",
    summary:
      "Combine Obsidian's markdown format with Claude Code for optimal LLM understanding and knowledge management. Create modular, reusable skills with trigger phrases rather than monolithic prompts.",
    source: "YouTube",
    tags: ["obsidian", "second-brain", "claude-code"],
    date: "2026-02",
  },
  {
    id: "yt-no-saas-system",
    title: "You Don't Need SaaS: The $0.10 System That Replaced My AI Workflow",
    summary:
      "An 'Open Brain' architecture: a user-owned, database-backed knowledge system accessible to AI agents via MCP. Overcomes limitations of isolated context windows by providing persistent, shared memory across sessions.",
    source: "YouTube",
    tags: ["knowledge-system", "mcp", "self-hosted"],
    date: "2026-02",
  },
  {
    id: "yt-4-patterns",
    title: "They Ignored My Tool Stack and Built Something Better: 4 Patterns That Work",
    summary:
      "Architecture is portable while tools are not. Focus on understanding underlying patterns rather than specific implementations. The four patterns emerge from observing how developers build 'second brain' systems with diverse tool stacks.",
    source: "YouTube",
    tags: ["architecture", "patterns", "second-brain"],
    date: "2026-02",
  },
  // ── YouTube: Prompt Engineering ─────────────────────────
  {
    id: "yt-agentic-prompt-eng",
    title: "Agentic Prompt Engineering with Claude Code",
    summary:
      "How to write prompts for agents, teams, and other agents. Covers CLAUDE.md configuration, skill trigger phrases, and the layered prompt hierarchy that controls Claude Code behavior at project, user, and system levels.",
    source: "YouTube",
    tags: ["prompt-engineering", "claude-code", "configuration"],
    date: "2026-01",
  },
  {
    id: "yt-5-techniques",
    title: "The 5 Techniques Separating Top Agentic Engineers Right Now",
    summary:
      "Advanced context management and elite context engineering techniques for working with AI coding agents. The gap between average and top-tier agentic engineers comes down to how they structure and manage information flow.",
    source: "YouTube",
    tags: ["context-engineering", "techniques", "agentic-coding"],
    date: "2026-02",
  },
  {
    id: "yt-stop-prompting",
    title: "90% of AI Users Are Getting Mediocre Output (Stop Prompting, Do This Instead)",
    summary:
      "Move beyond raw prompting to AI customization. Configure persistent instructions, project-level rules, and custom memory systems. The difference between mediocre and excellent output is structural, not syntactic.",
    source: "YouTube",
    tags: ["ai-customization", "prompt-engineering", "productivity"],
    date: "2026-01",
  },
  // ── YouTube: Creative & Genertic Art ────────────────────
  {
    id: "yt-drawing-machines",
    title: "Intro to Drawing Machines 101",
    summary:
      "Covers the landscape of drawing machines for creative technology and generative art. From vintage plotters to modern CNC-driven pen plotters, the video surveys hardware options and their creative potential.",
    source: "YouTube",
    tags: ["pen-plotter", "creative-technology", "hardware"],
    date: "2026-01",
  },
  {
    id: "yt-3b1b-manim",
    title: "How I Animate 3Blue1Brown: A Manim Demo",
    summary:
      "Grant Sanderson demonstrates Manim, the Python animation engine behind 3Blue1Brown. The tool enables programmatic creation of mathematical animations, emphasizing visual communication of complex ideas.",
    source: "YouTube",
    tags: ["manim", "animation", "math-visualization"],
    date: "2025-12",
  },
  {
    id: "yt-agentic-design-tools",
    title: "Agentic Design Tools with MCP to Iterate Designs",
    summary:
      "Paper.design and Pencil.dev are agentic coding design tools positioned as Figma alternatives. They leverage MCP to translate prompts into designs, components, and design systems, exporting as HTML, CSS, and React.",
    source: "YouTube",
    tags: ["design-tools", "mcp", "figma-alternative"],
    date: "2026-02",
  },
  // ── YouTube: Autonomous Systems ─────────────────────────
  {
    id: "yt-oz-warp",
    title: "How to Build Anything with Oz by Warp",
    summary:
      "Build autonomous AI news monitoring with Oz by Warp. Deploy three scheduled agents: one researching stories every 3 hours, one generating tweet drafts every 6 hours, and a maintenance agent running daily. Cloud-based execution with zero local compute.",
    source: "YouTube",
    tags: ["autonomous-agents", "scheduling", "cloud"],
    date: "2026-02",
  },
  {
    id: "yt-openclaw-agents",
    title: "OpenClaw Agents Are Hiring Each Other and Building Societies",
    summary:
      "An open-source AI orchestration platform with 100,000+ GitHub stars connecting LLMs to personal devices. AI agents autonomously form social networks, create organizational structures, and transfer cryptocurrency between each other.",
    source: "YouTube",
    tags: ["openclaw", "autonomous-agents", "agent-society"],
    date: "2026-02",
  },
  {
    id: "yt-morning-routine",
    title: "Claude Code Runs My Morning Routine",
    summary:
      "A personal operating system using Claude Code and Obsidian that automates morning routines. The system reconstructs the previous day by analyzing Pomodoro session notes and voice recordings, then generates a structured daily plan.",
    source: "YouTube",
    tags: ["automation", "obsidian", "personal-os"],
    date: "2026-01",
  },
  // ── YouTube: Prediction Markets ─────────────────────────
  {
    id: "yt-eliza-polymarket",
    title: "How to Use an Eliza Agent with Polymarket",
    summary:
      "A technical livestream demonstrating a community-created Polymarket plugin for AI agents. Covers debugging market data retrieval, GPT performance improvements, and architectural decisions for multi-agent trading systems.",
    source: "YouTube",
    tags: ["polymarket", "trading-bot", "eliza"],
    date: "2026-01",
  },
  {
    id: "yt-singularity",
    title: "We Just Entered the Singularity",
    summary:
      "AI breakthroughs across multiple domains: systems matching human engineering capabilities (one Google engineer claims AI built in one hour what a team built in a year), mathematical breakthroughs accelerating, and AI solving complex Erdos problems.",
    source: "YouTube",
    tags: ["singularity", "ai-progress", "breakthroughs"],
    date: "2026-01",
  },
  // ── Research ────────────────────────────────────────────
  {
    id: "rs-generative-algorithms",
    title: "Creative Generative Algorithms and Computational Art",
    summary:
      "Curl noise for turbulent, incompressible flow. Wave function collapse for procedural generation. Applications span abstract art, data visualization, generative typography, and pen plotter output.",
    source: "Research",
    tags: ["generative-art", "algorithms", "curl-noise", "wfc"],
    date: "2026-03",
  },
  {
    id: "rs-polymarket-system",
    title: "Polymarket Trading System Knowledge Base",
    summary:
      "Central knowledge repository for autonomous prediction market trading. Synthesizes research from Claude, GPT, Perplexity, and empirical Monte Carlo simulations. Covers Kelly Criterion sizing, momentum signals, and risk management.",
    source: "Research",
    tags: ["polymarket", "trading", "kelly-criterion", "monte-carlo"],
    date: "2026-03",
  },
  {
    id: "rs-momentum-signals",
    title: "Momentum Signals Deep Dive for Prediction Markets",
    summary:
      "In prediction markets, prices are bounded [0, 1], making traditional momentum analysis insufficient. Small price moves near boundaries carry outsized information. This research covers adapted signal detection for bounded price spaces.",
    source: "Research",
    tags: ["momentum", "prediction-markets", "signal-processing"],
    date: "2026-03",
  },
  {
    id: "rs-multiagent-architecture",
    title: "Multiagent Systems Architecture",
    summary:
      "Separation of concerns across tiers: each tier has distinct responsibilities. Built-in fault tolerance (system continues with failed components), scalability (easy to add agents), and observability (monitoring and health reporting).",
    source: "Research",
    tags: ["multi-agent", "architecture", "fault-tolerance"],
    date: "2026-03",
  },
  {
    id: "rs-prompt-framework",
    title: "Prompt Engineering Framework v1.0",
    summary:
      "Synthesizes IndyDevDan's Tactical Agentic Coding (8 Tactics, Core Four, ADWs), Anthropic's official 9 techniques, community patterns (awesome-claude-code, Holy Trinity, 4-block pattern), and Prompt Decorators (declarative composable syntax).",
    source: "Research",
    tags: ["prompt-engineering", "framework", "tactics"],
    date: "2026-02",
  },
  // ── Research: MCP & Benchmarks ──────────────────────────
  {
    id: "rs-mcptoolbench",
    title: "MCPToolBench++: Large Scale AI Agent MCP Tool Use Benchmark",
    summary:
      "LLM capabilities are enhanced by function calls integrating data sources and API results into the context window. Typical tools include search, web crawlers, maps, financial data, file systems, and browser usage. This benchmark measures tool use at scale.",
    source: "Research",
    tags: ["mcp", "benchmarks", "tool-use"],
    date: "2025-08",
  },
  {
    id: "rs-mcp-security",
    title: "MCPSecBench: Security Benchmark for Model Context Protocol",
    summary:
      "A systematic security benchmark for testing MCP implementations. As LLMs integrate into real-world applications via MCP, security becomes critical. This framework tests for prompt injection, data exfiltration, and privilege escalation.",
    source: "Research",
    tags: ["mcp", "security", "benchmarks"],
    date: "2025-08",
  },
  {
    id: "rs-agents-structured-queries",
    title: "Agents Abandon Natural Language for Structured Queries",
    summary:
      "When given the choice between natural language and structured queries for knowledge graph access, AI agents abandoned natural language within minutes. Agents prefer structured query languages and direct entity/relationship traversal over NL queries.",
    source: "Research",
    tags: ["agents", "knowledge-graphs", "query-languages"],
    date: "2026-03",
  },
  // ── Tools & Docs ────────────────────────────────────────
  {
    id: "tl-pen-plotter-ecosystem",
    title: "Pen Plotter Ecosystem Reference Guide",
    summary:
      "Complete reference for the pen plotter art pipeline: 21+ generative algorithms, SVG export optimized for single-line paths, layer support with separate SVG files per layer, and a browser-based gallery for previewing outputs.",
    source: "Tools",
    tags: ["pen-plotter", "svg", "generative-art"],
    date: "2026-03",
  },
  {
    id: "tl-fragment-creative",
    title: "Fragment Creative Coding Integration",
    summary:
      "Fragment is a web development environment for creative coding. It provides hot-reloading, shader support, and a structured project system for building generative art pieces that can be exported for physical output.",
    source: "Tools",
    tags: ["fragment", "creative-coding", "shaders"],
    date: "2025-08",
  },
  {
    id: "tl-mcp-configuration",
    title: "MCP Complete Configuration Guide",
    summary:
      "Full configuration reference for MCP server setups including ChromaDB (vector database for embeddings with semantic search), Obsidian integration, browser automation, and custom tool servers.",
    source: "Tools",
    tags: ["mcp", "configuration", "chromadb"],
    date: "2026-01",
  },
  {
    id: "tl-obsidian-chromadb",
    title: "Obsidian ChromaDB Integration",
    summary:
      "Bridge between Obsidian markdown vaults and ChromaDB vector storage. The embedding pipeline converts vault notes into vectors, enabling semantic search across thousands of markdown documents.",
    source: "Tools",
    tags: ["obsidian", "chromadb", "embeddings"],
    date: "2025-12",
  },
  {
    id: "tl-obsidian-plugins",
    title: "Obsidian Plugins: Biggest ROI for New Users",
    summary:
      "With thousands of community plugins available, this guide identifies the highest-value Obsidian plugins for knowledge management. Covers Dataview, Templater, QuickAdd, and database plugins for structured note-taking.",
    source: "Tools",
    tags: ["obsidian", "plugins", "productivity"],
    date: "2026-01",
  },
  {
    id: "tl-obsidian-library",
    title: "Build a Gorgeous Obsidian Library in 5 Minutes",
    summary:
      "A visual library interface for Obsidian vaults without any coding. Leverages database plugins and custom views to create a browsable, searchable knowledge library with cover images and metadata.",
    source: "Tools",
    tags: ["obsidian", "ui", "knowledge-management"],
    date: "2026-01",
  },
  // ── Research: 2026-06 additions ──────────────────────────
  {
    id: "rs-robust-shielding",
    title: "Robust Shielding for Safe Reinforcement Learning",
    summary:
      "Shielding for Robust MDPs (RMDPs) with PAC-learned transition probabilities. LTL safety guarantees under worst-case adversary. Sound and optimal: every admissible policy is safe, every safe policy is admissible. Three domains: GridWorld, Pacman, Streaming. Submissions from Manchester, Oxford, Imperial.",
    source: "Research",
    tags: ["safe-rl", "shielding", "robust-mdps", "LTL", "formal-verification"],
    date: "2026-05",
  },
  {
    id: "rs-feedback-distillation",
    title: "Distilling LLM Feedback for Lean Theorem Proving",
    summary:
      "Feedback Distillation (FD) for formal theorem-proving LLMs: student matches token-level distribution of EMA-smoothed teacher conditioned on privileged LLM feedback about failed proof attempts. On Lean4, FD maintains trajectory diversity and better pass@k than GRPO alone. FAIR Meta + Inria + Sorbonne + ENS/PSL.",
    source: "Research",
    tags: ["theorem-proving", "knowledge-distillation", "lean", "formal-methods", "reinforcement-learning"],
    date: "2026-05",
  },
  {
    id: "rs-interactive-reasoning-benchmark",
    title: "Evaluating Interactive Reasoning in LLMs — Executable Games Benchmark",
    summary:
      "Multi-turn interactive reasoning evaluation: 474 executable games across 5 difficulty levels (2,370 configurations). LLMs receive only task rules, must issue targeted queries, integrate observations, and decide when to answer. Metacognitive revision is the weakest capability across frontier models.",
    source: "Research",
    tags: ["LLM-evaluation", "interactive-reasoning", "benchmarking", "metacognition"],
    date: "2026-05",
  },
];

export const KNOWLEDGE_STATS = {
  totalDocuments: knowledgeEntries.length, // auto-calculated, was 41 now 44
  collections: 4,
  sources: ["YouTube", "Research", "Tools"] as const,
};
