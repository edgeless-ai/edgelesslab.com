"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedText, AnimatedFadeIn } from "@/components/ui/animated-text";
import { GlowingCard } from "@/components/ui/glowing-card";
import { DotBackground } from "@/components/ui/dot-background";

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
  { title: "Total Serialism", category: "Audio" },
  { title: "Mastra Orchestrator", category: "Agents" },
];


export default function Home() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      {/* Nav — minimal, floating */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 pt-5">
          <div
            className="flex items-center justify-between h-12 px-5 rounded-full border backdrop-blur-xl"
            style={{
              background: "rgba(17, 17, 19, 0.7)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <span
              className="text-sm font-semibold tracking-tight font-mono"
              style={{ color: "var(--text-primary)" }}
            >
              edgeless
            </span>
            <div className="flex items-center gap-5">
              {["Projects", "Lab", "About"].map((link) => (
                <a
                  key={link}
                  href={`/${link.toLowerCase()}`}
                  className="text-[13px] hover:text-white transition-colors"
                  style={{ color: "var(--text-secondary)" }}
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

      {/* Hero — dramatic, asymmetric */}
      <section className="relative min-h-screen flex items-end px-6 pb-24 pt-32">
        <DotBackground />
        <div className="relative max-w-[1280px] w-full mx-auto">
          {/* Small status badge */}
          <AnimatedFadeIn>
            <div className="flex items-center gap-2 mb-8">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                Shipping daily
              </span>
            </div>
          </AnimatedFadeIn>

          <h1
            className="text-[clamp(3rem,8vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.04em] max-w-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            <AnimatedText text="Tools for" delay={0.1} />
            <br />
            <span style={{ color: "var(--accent)" }}>
              <AnimatedText text="AI-native" delay={0.3} />
            </span>
            <br />
            <AnimatedText text="developers." delay={0.45} />
          </h1>

          <AnimatedFadeIn delay={0.7}>
            <p
              className="mt-8 text-lg max-w-md font-light"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              Agents that trade. Pipelines that learn. Art that plots itself.
              A one-person lab at the edge of what ships.
            </p>
          </AnimatedFadeIn>

          <AnimatedFadeIn delay={0.9}>
            <div className="mt-12 flex items-center gap-6">
              <a
                href="/projects"
                className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium text-white rounded-full transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{ background: "var(--accent)" }}
              >
                View projects <ArrowRight size={15} />
              </a>
              <a
                href="https://github.com/edgeless-ai"
                className="text-sm font-medium flex items-center gap-1.5 transition-colors hover:text-white"
                style={{ color: "var(--text-secondary)" }}
              >
                GitHub <ArrowUpRight size={14} />
              </a>
            </div>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* Projects — asymmetric bento grid */}
      <section className="px-6 py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Featured
            </h2>
            <a
              href="/projects"
              className="text-sm flex items-center gap-1 transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)" }}
            >
              All projects <ArrowRight size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-[auto_auto]">
            {featured.map((project, i) => (
              <div key={project.title} className={project.span}>
              <GlowingCard
                className="h-full"
                href={`/projects/${project.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {/* Code window */}
                  <div
                    className="w-full rounded-lg mb-6 overflow-hidden"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                      <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                      <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                      <span
                        className="ml-2 text-[10px] font-mono"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {project.title.toLowerCase().replace(/\s+/g, "-")}
                      </span>
                    </div>
                    <pre
                      className={`px-3 py-3 text-[11px] leading-[1.7] font-mono whitespace-pre overflow-hidden ${
                        i === 0 ? "min-h-[120px]" : "min-h-[80px]"
                      }`}
                      style={{ color: "var(--green)" }}
                    >
                      {project.snippet}
                    </pre>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3
                        className="text-lg font-semibold mb-1.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {project.title}
                      </h3>
                      <p
                        className="text-sm max-w-md"
                        style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                      >
                        {project.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
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
                </motion.div>
              </GlowingCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities — The Technical Foundation (Gemini recommendation: Vercel-style modular blocks) */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.label}
                className="rounded-xl border overflow-hidden"
                style={{
                  background: "var(--bg-base)",
                  borderColor: "var(--border-subtle)",
                }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div
                  className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {cap.label}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--green)" }}
                  />
                </div>
                <pre
                  className="px-5 py-4 text-[11px] leading-[1.8] font-mono whitespace-pre overflow-x-auto"
                  style={{ color: "var(--green)" }}
                >
                  {cap.snippet}
                </pre>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lab — horizontal scroll tease */}
      <section className="px-6 py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Lab
            </h2>
            <a
              href="/lab"
              className="text-sm flex items-center gap-1 transition-colors hover:text-white"
              style={{ color: "var(--text-secondary)" }}
            >
              All experiments <ArrowRight size={13} />
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {experiments.map((exp, i) => (
              <motion.a
                key={exp.title}
                href={`/lab/${exp.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="group relative rounded-xl border p-5 transition-colors hover:border-white/[0.12]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.12em] block mb-3"
                  style={{ color: "var(--accent)" }}
                >
                  {exp.category}
                </span>
                <span
                  className="text-sm font-medium block"
                  style={{ color: "var(--text-primary)" }}
                >
                  {exp.title}
                </span>
                <ArrowUpRight
                  size={14}
                  className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* About — editorial, left-aligned */}
      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-2xl">
            <motion.p
              className="text-2xl sm:text-3xl font-light leading-[1.5]"
              style={{ color: "var(--text-secondary)" }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span style={{ color: "var(--text-primary)" }}>Edgeless Labs</span> is a
              one-person creative technology studio. We ship agents, MCP servers,
              generative art pipelines, and tools that work.{" "}
              <span style={{ color: "var(--text-primary)" }}>No pitch decks. No vaporware.</span>
            </motion.p>
            <motion.div
              className="mt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <a
                href="/about"
                className="text-sm font-medium flex items-center gap-1.5 transition-colors hover:text-white"
                style={{ color: "var(--accent)" }}
              >
                About the lab <ArrowRight size={14} />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer — multi-column infrastructure map (Gemini: Vercel-style structured footer) */}
      <footer className="px-6 pt-16 pb-8 mt-auto border-t" style={{ borderColor: "var(--border-subtle)" }}>
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
                {["Pamela Agent", "MCP Servers", "Knowledge API", "LLM Client"].map((item) => (
                  <li key={item}>
                    <a
                      href={`/projects/${item.toLowerCase().replace(/\s+/g, "-")}`}
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
                Lab
              </h3>
              <ul className="space-y-2.5">
                {["Pen Plotter Art", "Strange Attractors", "Total Serialism", "Knowledge Graph"].map((item) => (
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

          {/* Bottom bar with lab status */}
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
