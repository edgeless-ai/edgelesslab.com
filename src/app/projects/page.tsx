"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { GlowingCard } from "@/components/ui/glowing-card";

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
      "Unified multi-provider client. OpenRouter → Gemini → Anthropic → OpenAI with automatic fallback.",
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
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 pt-5">
          <div
            className="flex items-center justify-between h-12 px-5 rounded-full border backdrop-blur-xl"
            style={{
              background: "rgba(17, 17, 19, 0.7)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <a
              href="/"
              className="text-sm font-semibold tracking-tight font-mono"
              style={{ color: "var(--text-primary)" }}
            >
              edgeless
            </a>
            <div className="flex items-center gap-5">
              {["Projects", "Lab", "About"].map((link) => (
                <a
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  className="text-[13px] hover:text-white transition-colors"
                  style={{
                    color:
                      link === "Projects"
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {link}
                </a>
              ))}
              <a
                href="https://github.com/edgeless-ai"
                className="text-[13px] hover:text-white transition-colors flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                GitHub <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Page header */}
      <section className="relative px-6 pt-40 pb-16">
        {/* Subtle background gradient */}
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 mb-6"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
            <span
              className="text-xs font-mono uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              What ships
            </span>
          </motion.div>

          <motion.h1
            className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.95] tracking-[-0.03em]"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            Projects
          </motion.h1>

          <motion.p
            className="mt-5 text-base max-w-md font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            Agents, APIs, and pipelines built in the open. Every project runs in
            production.
          </motion.p>
        </div>
      </section>

      {/* Divider */}
      <div
        className="mx-6 max-w-[1280px] mx-auto border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      />

      {/* Projects grid */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <GlowingCard href={`/projects/${project.slug}`} className="h-full">
                  {/* Code window */}
                  <div
                    className="w-full rounded-lg mb-6 overflow-hidden"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="flex items-center gap-1.5 px-3 py-2.5 border-b"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: "rgba(255,255,255,0.1)" }}
                      />
                      <span
                        className="ml-2 text-[10px] font-mono"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {project.slug}
                      </span>
                    </div>
                    <pre
                      className="px-3 py-3 text-[11px] leading-[1.7] font-mono whitespace-pre overflow-hidden min-h-[80px]"
                      style={{ color: "var(--green)" }}
                    >
                      {project.snippet}
                    </pre>
                  </div>

                  {/* Card body */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h2
                          className="text-lg font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {project.title}
                        </h2>
                        {/* Status badge */}
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono"
                          style={{
                            background: "var(--green-muted)",
                            color: "var(--green)",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "var(--green)" }}
                          />
                          {project.status}
                        </span>
                      </div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                      >
                        {project.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 text-[11px] font-mono rounded-md"
                        style={{
                          background: "var(--accent-muted)",
                          color: "var(--accent)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </GlowingCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 pt-16 pb-8 mt-auto border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            <div>
              <h3
                className="text-[11px] font-mono uppercase tracking-[0.12em] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Tools
              </h3>
              <ul className="space-y-2.5">
                {["Pamela Agent", "MCP Servers", "Knowledge API", "LLM Client"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href={`/projects/${item.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-[13px] hover:text-white transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>
            <div>
              <h3
                className="text-[11px] font-mono uppercase tracking-[0.12em] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Lab
              </h3>
              <ul className="space-y-2.5">
                {[
                  "Pen Plotter Art",
                  "Strange Attractors",
                  "Total Serialism",
                  "Knowledge Graph",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href={`/lab/${item.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-[13px] hover:text-white transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className="text-[11px] font-mono uppercase tracking-[0.12em] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Social
              </h3>
              <ul className="space-y-2.5">
                {[
                  { label: "GitHub", href: "https://github.com/edgeless-ai" },
                  { label: "Gumroad", href: "https://edgelessai.gumroad.com" },
                  { label: "Email", href: "mailto:hello@edgelesslab.com" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-[13px] hover:text-white transition-colors inline-flex items-center gap-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                      <ArrowUpRight size={11} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3
                className="text-[11px] font-mono uppercase tracking-[0.12em] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Legal
              </h3>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy", href: "/privacy" },
                  { label: "Terms", href: "/terms" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="text-[13px] hover:text-white transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              &copy; 2026 Edgeless Labs
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span
                className="text-[11px] font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                7 agents active
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
