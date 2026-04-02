import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  HeroSection,
  FeaturedGrid,
  CapabilitiesGrid,
  StackFlow,
  ExperimentsGrid,
  ProductHighlight,
  AboutBlurb,
  SubscribeSection,
} from "@/components/home-client";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { experiments, projects } from "@/lib/data";

const featured = [
  { slug: "pamela", span: "md:col-span-2 md:row-span-2" },
  { slug: "mcp-servers", span: "" },
  { slug: "pen-plotter-art", span: "" },
].map(({ slug, span }) => {
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    throw new Error(`Missing homepage featured project: ${slug}`);
  }

  return {
    title: project.title,
    description: project.description,
    tags: project.tags.slice(0, 3),
    snippet: project.snippet,
    href: `/projects/${project.slug}`,
    span,
  };
});

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
│ pamela │ online │ 0 restarts │
│ 24/7 autonomous execution     │`,
  },
  {
    label: "Knowledge Pipelines",
    snippet: `qmd search "agent orchestration"
  --collection claude-vault
  --top-k 10 --min-score 0.6`,
  },
];

const homepageExperiments = [
  "strange-attractors",
  "knowledge-graph",
  "total-serialism",
  "tartanism",
].map((slug) => {
  const experiment = experiments.find((item) => item.slug === slug);
  if (!experiment) {
    throw new Error(`Missing homepage experiment: ${slug}`);
  }

  return {
    title: experiment.title,
    category: experiment.category,
    href: experiment.href ?? `/lab/${experiment.slug}`,
    external: Boolean(experiment.href),
  };
});

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
      <Nav />

      <main id="main-content">
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

        {/* Stack */}
        <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
          <div className="max-w-[1280px] mx-auto">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
              style={{ color: "var(--text-tertiary)" }}
            >
              Stack
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

            <ExperimentsGrid experiments={homepageExperiments} />
          </div>
        </section>

        {/* Products */}
        <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <h2
                className="text-sm font-mono uppercase tracking-[0.15em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Products
              </h2>
              <Link
                href="/products"
                className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                style={{ color: "var(--text-secondary)" }}
              >
                All products <ArrowRight size={13} />
              </Link>
            </div>

            <ProductHighlight />
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
      </main>

      <Footer />
    </div>
  );
}
