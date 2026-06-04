import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  HeroSection,
  RecentActivity,
  SubscribeSection,
} from "@/components/home-client";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { experiments, projects } from "@/lib/data";
import { posts } from "@/lib/blog";
import ProjectShowcaseSection from "@/components/sections/project-showcase-section";
import TechShowcaseSection from "@/components/sections/tech-showcase-section";
import CTASection from "@/components/sections/cta-section";

const featured = [
  { slug: "safety-hooks", span: "md:col-span-2 md:row-span-2" },
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
    label: "Agent Safety Hooks",
    snippet: `$ hook: damage-control
  blocked: rm -rf /
  reason: destructive operation
✓ safety hooks armed`,
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
    description: experiment.description,
    stack: experiment.stack.slice(0, 3),
    status: experiment.status,
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

        {/* Recent Activity (chronological stream) */}
        <section className="px-6 py-16 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[920px] mx-auto">
            <div className="flex items-baseline justify-between mb-6">
              <h2
                className="text-sm font-mono uppercase tracking-[0.15em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Recent activity
              </h2>
              <Link
                href="/blog"
                className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                style={{ color: "var(--text-secondary)" }}
              >
                Full feed <ArrowRight size={13} />
              </Link>
            </div>

            <RecentActivity posts={posts} />
          </div>
        </section>

        {/* Featured Projects */}
        <section className="px-6 py-20">
          <ScrollReveal>
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

              <ProjectShowcaseSection projects={featured} capabilities={capabilities} />
            </div>
          </ScrollReveal>
        </section>

        {/* Stack */}
        <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
          <ScrollReveal>
            <div className="max-w-[1280px] mx-auto">
              <h2
                className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stack
              </h2>

              <TechShowcaseSection nodes={stackNodes} experiments={homepageExperiments} />
            </div>
          </ScrollReveal>
        </section>

        {/* Products */}
        <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
          <ScrollReveal>
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

              <CTASection />
            </div>
          </ScrollReveal>
        </section>

        {/* Subscribe */}
        <SubscribeSection />
      </main>

      <Footer />
    </div>
  );
}
