import { ArrowRight } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  HeroSection,
  SubscribeSection,
} from "@/components/home-client";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { experiments, projects } from "@/lib/data";
import { posts } from "@/lib/blog";
import { LazyAttractorPlayground } from "@/components/lazy-playground-wrapper";

// Below-fold sections loaded dynamically to keep the initial RSC payload small.
// Each pulls heavy data modules that don't need to be in the critical path for LCP.
const RecentActivity = dynamic(
  () => import("@/components/recent-activity").then((m) => ({ default: m.RecentActivity })),
  { loading: () => <div className="min-h-[200px]" /> }
);
const ProjectShowcaseSection = dynamic(
  () => import("@/components/sections/project-showcase-section"),
  { loading: () => <div className="min-h-[300px]" /> }
);
const TechShowcaseSection = dynamic(
  () => import("@/components/sections/tech-showcase-section"),
  { loading: () => <div className="min-h-[300px]" /> }
);
const CTASection = dynamic(
  () => import("@/components/sections/cta-section"),
  { loading: () => <div className="min-h-[200px]" /> }
);

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

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-24 rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
      <div className="h-3 w-full rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
      <div className="h-3 w-5/6 rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
    </div>
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[520px]">{children}</div>;
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content">
        {/* Hero */}
        <HeroSection />

        {/* Recent Activity (chronological stream) */}
        <SectionBlock>
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

              <Suspense fallback={<SectionSkeleton />}>
                <RecentActivity posts={posts} />
              </Suspense>
            </div>
          </section>
        </SectionBlock>

        {/* Playground — embedded interactive generative art you can actually touch */}
        <SectionBlock>
          <section className="px-6 py-20 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="max-w-[1280px] mx-auto">
              <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>
                      Play with it
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[0.95]" style={{ color: "var(--text-primary)" }}>
                    Strange attractors, live
                  </h2>
                  <p className="mt-3 max-w-md text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Chaos you can steer. Change the system, drag the parameters, watch the structure reorganize in real time.
                  </p>
                </div>
                <Link
                  href="/creative"
                  className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  38 more experiments <ArrowRight size={13} />
                </Link>
              </div>
              <Suspense fallback={<SectionSkeleton />}>
                <LazyAttractorPlayground />
              </Suspense>
            </div>
          </section>
        </SectionBlock>

        {/* Featured Projects */}
        <SectionBlock>
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

                <Suspense fallback={<SectionSkeleton />}>
                  <ProjectShowcaseSection projects={featured} capabilities={capabilities} />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Stack */}
        <SectionBlock>
          <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
            <ScrollReveal>
              <div className="max-w-[1280px] mx-auto">
                <h2
                  className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Stack
                </h2>

                <Suspense fallback={<SectionSkeleton />}>
                  <TechShowcaseSection nodes={stackNodes} experiments={homepageExperiments} />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Products */}
        <SectionBlock>
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

                <Suspense fallback={<SectionSkeleton />}>
                  <CTASection />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Subscribe */}
        <SubscribeSection />
      </main>

      <Footer />
    </div>
  );
}
