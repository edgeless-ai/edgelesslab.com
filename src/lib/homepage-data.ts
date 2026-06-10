import { experiments, projects, products } from "./data";
import { posts } from "./blog";

/* ── Homepage Blog Posts (8 most recent, minimal fields) ── */
export const homepagePosts = [...posts]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 8)
  .map((p) => ({
    slug: p.slug,
    date: p.date,
    title: p.title,
    isLaunch: p.isLaunch ?? false,
  }));

/* ── Homepage Products (top paid + free, minimal fields) ── */
export const homepageProducts = {
  featured: products
    .filter((p) => p.price !== "Free")
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      price: p.price,
      description: p.description,
      href: p.href,
    })),
  free: (() => {
    const f = products.find((p) => p.price === "Free");
    return f
      ? {
          name: f.name,
          price: f.price,
          description: f.description,
          href: f.href,
        }
      : null;
  })(),
  remaining: products.length,
};

/* ── Homepage Featured Projects (3 items, minimal fields) ── */
const FEATURED_SLUGS = ["safety-hooks", "mcp-servers", "pen-plotter-art"];

export const homepageProjects = FEATURED_SLUGS.map((slug) => {
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
    span: slug === "safety-hooks" ? "md:col-span-2 md:row-span-2" : "",
  };
});

/* ── Homepage Experiments (4 items, minimal fields) ── */
const EXPERIMENT_SLUGS = [
  "strange-attractors",
  "knowledge-graph",
  "total-serialism",
  "tartanism",
];

export const homepageExperiments = EXPERIMENT_SLUGS.map((slug) => {
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

/* ── Homepage Stack Nodes ── */
export const homepageStackNodes = [
  { label: "Claude Code", sublabel: "AI agent layer", color: "var(--accent)" },
  { label: "MCP Servers", sublabel: "tool protocol", color: "var(--accent)" },
  { label: "ChromaDB", sublabel: "vector memory", color: "var(--green)" },
  { label: "Obsidian", sublabel: "knowledge vault", color: "var(--green)" },
  { label: "VPS / Hermes", sublabel: "always-on runtime", color: "var(--green)" },
];

/* ── Homepage Capabilities ── */
export const homepageCapabilities = [
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
✓ 0 incidents this week`,
  },
  {
    label: "Knowledge Pipelines",
    snippet: `qmd search "agent orchestration"
  --collection claude-vault
  --top-k 10 --min-score 0.6`,
  },
];
