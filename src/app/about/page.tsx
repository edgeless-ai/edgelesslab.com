"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const stats = [
  { label: "Agents deployed", value: "7" },
  { label: "Documents indexed", value: "6,889" },
  { label: "Generative experiments", value: "105+" },
  { label: "MCP servers", value: "4" },
];

const timeline = [
  {
    period: "2026",
    title: "Edgeless Labs",
    description:
      "Formalized the lab. Launched the Prompt Engineering OS, MCP server toolkit, and multi-agent orchestration layer. Mastra-based routing across Claude, Gemini, and local models.",
  },
  {
    period: "2025",
    title: "Agent infrastructure",
    description:
      "Built Pamela (autonomous Polymarket trader), the 3-layer memory system (ChromaDB + PyTorch + Obsidian vault), and the unified LLM client with automatic provider fallback.",
  },
  {
    period: "2024",
    title: "Creative technology",
    description:
      "Started the pen plotter art pipeline, generative SVG experiments, and the knowledge graph visualization. Explored algorithmic composition with Total Serialism.",
  },
];

const links = [
  { label: "GitHub", href: "https://github.com/edgeless-ai", description: "Open source projects and tools" },
  { label: "Gumroad", href: "https://edgelessai.gumroad.com", description: "Digital products and templates" },
  { label: "Email", href: "mailto:hello@edgelesslab.com", description: "hello@edgelesslab.com" },
];

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true as const },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export default function About() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      {/* Header */}
      <section className="px-6 pt-32 pb-20">
        <div className="max-w-[1280px] mx-auto">
          <motion.p
            className="text-sm font-mono uppercase tracking-[0.15em] mb-6"
            style={{ color: "var(--text-tertiary)" }}
            {...fade}
          >
            About
          </motion.p>
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-[-0.03em] max-w-3xl"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            One person.
            <br />
            <span style={{ color: "var(--accent)" }}>Real tools.</span>
          </motion.h1>
          <motion.p
            className="mt-8 text-lg max-w-xl font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Edgeless Labs is a solo creative technology studio building agents,
            pipelines, and tools that actually run in production. No team. No
            funding. No vaporware.
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="text-3xl sm:text-4xl font-bold font-mono block mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {stat.value}
                </span>
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.12em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-2xl">
            <motion.h2
              className="text-sm font-mono uppercase tracking-[0.15em] mb-8"
              style={{ color: "var(--text-tertiary)" }}
              {...fade}
            >
              Philosophy
            </motion.h2>
            <motion.div
              className="space-y-6 text-lg font-light"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <p>
                Most AI companies are building demos. We build{" "}
                <span style={{ color: "var(--text-primary)" }}>infrastructure that runs 24/7</span>.
                Pamela trades autonomously. The knowledge pipeline indexes thousands of
                documents. The MCP servers handle real queries from real agents.
              </p>
              <p>
                The lab exists at the intersection of{" "}
                <span style={{ color: "var(--text-primary)" }}>AI, craft, and systems thinking</span>.
                Every project ships. Every tool gets used. If it doesn&apos;t work in
                production, it doesn&apos;t exist.
              </p>
              <p>
                We believe the best AI tools are built by people who{" "}
                <span style={{ color: "var(--text-primary)" }}>use them every day</span>.
                Everything here is dogfooded. The orchestration layer routes our own
                work. The memory system stores our own knowledge. The agents manage
                our own portfolio.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1280px] mx-auto">
          <motion.h2
            className="text-sm font-mono uppercase tracking-[0.15em] mb-12"
            style={{ color: "var(--text-tertiary)" }}
            {...fade}
          >
            Timeline
          </motion.h2>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <motion.div
                key={item.period}
                className="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] gap-6 py-8 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="text-sm font-mono"
                  style={{ color: "var(--accent)" }}
                >
                  {item.period}
                </span>
                <div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm max-w-lg"
                    style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
                  >
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Connect */}
      <section className="px-6 py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.h2
            className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
            style={{ color: "var(--text-tertiary)" }}
            {...fade}
          >
            Connect
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {links.map((link, i) => (
              <motion.a
                key={link.label}
                href={link.href}
                className="group rounded-xl border p-6 transition-colors hover:border-white/[0.12]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {link.label}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
                <p
                  className="text-[13px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {link.description}
                </p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
