import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  HeroSection,
  FeaturedGrid,
  CapabilitiesGrid,
  StackFlow,
  ExperimentsGrid,
  AboutBlurb,
  SubscribeSection,
} from "@/components/home-client";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const featured = [
  {
    title: "Pamela",
    description:
      "Autonomous prediction market agent. ML-driven position sizing, live on Polymarket 24/7.",
    tags: ["TypeScript", "ML", "Polymarket"],
    snippet: `$ pm2 status pamela
│ online │ 47h │ 0 restarts

P&L: +$247.30 (7d)`,
    span: "md:col-span-2 md:row-span-2",
    tall: true,
  },
  {
    title: "MCP Servers",
    description: "Production servers for ChromaDB, knowledge search, and multi-agent orchestration.",
    tags: ["MCP", "Effect-TS"],
    snippet: `server.tool("search", {
  query: z.string(),
  collection: z.enum([
    "vault", "memory"
  ])
})`,
    span: "",
    tall: false,
  },
  {
    title: "Pen Plotter Art",
    description: "105+ generative experiments. AI-scored. SVG to physical media.",
    tags: ["Generative", "Python", "SVG"],
    snippet: `<svg viewBox="0 0 400 400">
  <path d="M200,50 C350,100
    350,300 200,350" />
</svg>`,
    span: "",
    tall: false,
  },
];

const capabilities = [
  {
    label: "Multi-Agent Orchestration",
    snippet: `POST /api/agents/router/generate
{ "messages": [{ "role": "user",
  "content": "dispatch research to gemini-1" }] }`,
  },
  {
    label: "MCP Tool Servers",
    snippet: `server.tool("search", {
  query: z.string(),
  collection: z.enum(["vault", "memory"])
})`,
  },
  {
    label: "Autonomous Trading",
    snippet: `$ pm2 status pamela
│ pamela │ online │ 47h │ 0 restarts │
│ P&L: +$247.30 (7d)                 │`,
  },
  {
    label: "Knowledge Pipelines",
    snippet: `qmd search "agent orchestration"
  --collection claude-vault
  --top-k 10 --min-score 0.6
  # 6,889 documents indexed`,
  },
];

const experiments = [
  { title: "Strange Attractors", category: "Generative" },
  { title: "Knowledge Graph", category: "Data" },
  { title: "Total Serialism", category: "Audio", href: "https://djmclaudeassistant-web.github.io/total-serialism/" },
  { title: "Tartanism", category: "Generative", href: "https://djmclaudeassistant-web.github.io/tartanism/" },
];

const stackNodes = [
  { label: "Claude Code", sublabel: "AI agent layer", color: "var(--accent)" },
  { label: "MCP Servers", sublabel: "tool protocol", color: "var(--accent)" },
  { label: "ChromaDB", sublabel: "vector memory", color: "var(--green)" },
  { label: "Obsidian", sublabel: "knowledge vault", color: "var(--green)" },
  { label: "VPS / Hermes", sublabel: "always-on runtime", color: "var(--green)" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      {/* Nav */}
      <Nav />

      {/* Hero */}
      <HeroSection />

      {/* Featured Projects */}
      <section className="px-6 py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Featured
            </h2>
            <Link
              href="/projects"
              className="text-sm flex items-center gap-1 transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)" }}
            >
              All projects <ArrowRight size={13} />
            </Link>
          </div>

          <FeaturedGrid projects={featured} />
        </div>
      </section>

      {/* Infrastructure */}
      <section
        className="px-6 py-20"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="max-w-[1280px] mx-auto">
          <h2
            className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
            style={{ color: "var(--text-tertiary)" }}
          >
            Infrastructure
          </h2>

          <CapabilitiesGrid capabilities={capabilities} />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
        <div className="max-w-[1280px] mx-auto">
          <h2
            className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
            style={{ color: "var(--text-tertiary)" }}
          >
            How it works
          </h2>

          <StackFlow nodes={stackNodes} />
        </div>
      </section>

      {/* Lab */}
      <section className="px-6 py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Lab
            </h2>
            <Link
              href="/lab"
              className="text-sm flex items-center gap-1 transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)" }}
            >
              All experiments <ArrowRight size={13} />
            </Link>
          </div>

          <ExperimentsGrid experiments={experiments} />
        </div>
      </section>

      {/* About */}
      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <AboutBlurb />
        </div>
      </section>

      {/* Subscribe */}
      <SubscribeSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
