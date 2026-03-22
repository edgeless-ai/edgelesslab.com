import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectsHeader, ProjectsGrid } from "@/components/projects-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Agents, APIs, and pipelines built in the open. Every project runs in production.",
  alternates: { canonical: "https://edgelesslab.com/projects" },
};

const projects = [
  {
    title: "Pamela",
    slug: "pamela",
    description:
      "Autonomous prediction market agent. ML-driven position sizing, live on Polymarket 24/7.",
    tags: ["TypeScript", "ML", "Polymarket"],
    status: "Live",
    snippet: `$ pm2 status pamela
│ online │ 47h │ 0 restarts

P&L: +$247.30 (7d)`,
  },
  {
    title: "MCP Servers",
    slug: "mcp-servers",
    description:
      "Production MCP servers for ChromaDB knowledge search and multi-agent orchestration.",
    tags: ["MCP", "Effect-TS"],
    status: "Live",
    snippet: `server.tool("search", {
  query: z.string(),
  collection: z.enum([
    "vault", "memory"
  ])
})`,
  },
  {
    title: "Pen Plotter Art",
    slug: "pen-plotter-art",
    description:
      "105+ generative experiments. AI-scored. SVG pipelines to physical media via pen plotter.",
    tags: ["Generative Art", "Python", "SVG"],
    status: "Active",
    snippet: `<svg viewBox="0 0 400 400">
  <path d="M200,50 C350,100
    350,300 200,350" />
</svg>`,
  },
  {
    title: "Mastra Orchestrator",
    slug: "mastra-orchestrator",
    description:
      "Multi-agent routing layer. Dispatches tasks across Claude, Gemini, and specialist agents.",
    tags: ["Mastra", "Multi-Agent", "TypeScript"],
    status: "Live",
    snippet: `router → claude-opus (thinking)
router → gemini-flash (search)
✓ consensus reached`,
  },
  {
    title: "Knowledge API",
    slug: "knowledge-api",
    description:
      "Semantic search across 7,000+ documents. ChromaDB-backed with BM25 fusion re-ranking.",
    tags: ["ChromaDB", "Python", "API"],
    status: "Live",
    snippet: `qmd search "agent orchestration"
  --collection claude-vault
  --top-k 10 --min-score 0.6`,
  },
  {
    title: "LLM Client",
    slug: "llm-client",
    description:
      "Unified multi-provider client. OpenRouter -> Gemini -> Anthropic -> OpenAI with automatic fallback.",
    tags: ["Python", "OpenRouter"],
    status: "Live",
    snippet: `client = UnifiedLLM()
result = client.complete(
  "analyze this",
  model="auto"
)`,
  },
];

export default function ProjectsPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      {/* Page header */}
      <section className="relative px-6 pt-40 pb-16">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute top-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20 blur-[140px]"
            style={{ background: "var(--accent)" }}
          />
        </div>

        <div className="relative max-w-[1280px] mx-auto">
          <ProjectsHeader />
        </div>
      </section>

      <div
        className="mx-6 max-w-[1280px] lg:mx-auto border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      />

      {/* Projects grid */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <ProjectsGrid projects={projects} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
