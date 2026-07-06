"use client";

import dynamic from "next/dynamic";

// Each section loads its own data client-side so the static RSC payload
// in out/index.html stays small — just hero + nav + footer.

const RecentActivity = dynamic(
  () =>
    Promise.all([
      import("@/components/recent-activity"),
      import("@/lib/blog"),
    ]).then(([compMod, blogMod]) => {
      const Component = () => (
        <compMod.RecentActivity posts={blogMod.posts} />
      );
      return { default: Component };
    }),
  { ssr: false, loading: () => <div className="min-h-[200px]" /> }
);

const ProjectShowcaseSection = dynamic(
  () =>
    Promise.all([
      import("@/components/sections/project-showcase-section"),
      import("@/lib/data"),
    ]).then(([compMod, dataMod]) => {
      const { projects } = dataMod;
      const featured = [
        { slug: "safety-hooks", span: "md:col-span-2 md:row-span-2" },
        { slug: "mcp-servers", span: "" },
        { slug: "pen-plotter-art", span: "" },
      ].map(({ slug, span }) => {
        const project = projects.find((item: any) => item.slug === slug);
        if (!project)
          throw new Error(`Missing homepage featured project: ${slug}`);
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
          snippet: `POST /api/agents/router/generate\n{ "messages": [{ "role": "user",\n  "content": "dispatch research to gemini-1" }] }`,
        },
        {
          label: "MCP Tool Servers",
          snippet: `server.tool("search", {\n  query: z.string(),\n  collection: z.enum(["vault", "memory"])\n})`,
        },
        {
          label: "Agent Safety Hooks",
          snippet: `$ hook: damage-control\n  blocked: rm -rf /\n  reason: destructive operation\n✓ safety hooks armed`,
        },
        {
          label: "Knowledge Pipelines",
          snippet: `qmd search "agent orchestration"\n  --collection claude-vault\n  --top-k 10 --min-score 0.6`,
        },
      ];
      const Comp = compMod.default;
      const Component = () => (
        <Comp projects={featured} capabilities={capabilities} />
      );
      return { default: Component };
    }),
  { ssr: false, loading: () => <div className="min-h-[300px]" /> }
);

const TechShowcaseSection = dynamic(
  () =>
    Promise.all([
      import("@/components/sections/tech-showcase-section"),
      import("@/lib/data"),
    ]).then(([compMod, dataMod]) => {
      const { experiments } = dataMod;
      const homepageExperiments = [
        "strange-attractors",
        "knowledge-graph",
        "total-serialism",
        "tartanism",
      ].map((slug) => {
        const experiment = experiments.find(
          (item: any) => item.slug === slug
        );
        if (!experiment)
          throw new Error(`Missing homepage experiment: ${slug}`);
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
        {
          label: "Claude Code",
          sublabel: "AI agent layer",
          color: "var(--accent)",
        },
        {
          label: "MCP Servers",
          sublabel: "tool protocol",
          color: "var(--accent)",
        },
        {
          label: "ChromaDB",
          sublabel: "vector memory",
          color: "var(--green)",
        },
        {
          label: "Obsidian",
          sublabel: "knowledge vault",
          color: "var(--green)",
        },
        {
          label: "VPS / Hermes",
          sublabel: "always-on runtime",
          color: "var(--green)",
        },
      ];
      const Comp = compMod.default;
      const Component = () => (
        <Comp nodes={stackNodes} experiments={homepageExperiments} />
      );
      return { default: Component };
    }),
  { ssr: false, loading: () => <div className="min-h-[300px]" /> }
);

const CTASection = dynamic(
  () => import("@/components/sections/cta-section"),
  { ssr: false, loading: () => <div className="min-h-[200px]" /> }
);

export {
  RecentActivity,
  ProjectShowcaseSection,
  TechShowcaseSection,
  CTASection,
};
