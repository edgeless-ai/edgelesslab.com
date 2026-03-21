"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const experiments = [
  {
    title: "Strange Attractors",
    category: "Generative",
    description:
      "Lorenz, Rossler, and Chen attractor systems rendered as SVG paths for pen plotting. Real-time parameter exploration with live preview.",
    status: "105+ variants",
    slug: "strange-attractors",
  },
  {
    title: "Knowledge Graph",
    category: "Data",
    description:
      "Force-directed visualization of 7,000+ documents across ChromaDB collections, Obsidian vault links, and semantic similarity edges.",
    status: "Live",
    slug: "knowledge-graph",
  },
  {
    title: "Total Serialism",
    category: "Audio",
    description:
      "Algorithmic music composition using serialist techniques. Generates both audio output and visual score notation from tone rows.",
    status: "Live",
    slug: "total-serialism",
    href: "https://djmclaudeassistant-web.github.io/total-serialism/",
  },
  {
    title: "Tartanism",
    category: "Generative",
    description:
      "Generative tartan pattern explorer. Procedural plaid generation with historical clan data, color theory, and interactive weaving visualization.",
    status: "Live",
    slug: "tartanism",
    href: "https://djmclaudeassistant-web.github.io/tartanism/",
  },
  {
    title: "Mastra Orchestrator",
    category: "Agents",
    description:
      "Visual dashboard for multi-agent task routing. Real-time display of agent states, message passing, and consensus formation.",
    status: "Live",
    slug: "mastra-orchestrator",
  },
  {
    title: "Pen Plotter Art",
    category: "Generative",
    description:
      "Generative SVG art pipeline with AI scoring. Over 75 unique generators producing flow fields, attractors, tessellations.",
    status: "105+ experiments",
    slug: "pen-plotter-art",
  },
  {
    title: "Excalidraw Diagrams",
    category: "Data",
    description:
      "Auto-generated architecture diagrams. 54 diagrams indexed covering system topology, data flows, and agent interactions.",
    status: "54 diagrams",
    slug: "excalidraw-diagrams",
  },
];

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono"
      style={{
        background: isLive ? "var(--green-muted)" : "var(--accent-muted)",
        color: isLive ? "var(--green)" : "var(--accent)",
      }}
    >
      {isLive && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--green)" }}
        />
      )}
      {status}
    </span>
  );
}

export default function LabPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      {/* Page header */}
      <section className="px-6 pt-40 pb-16">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-[11px] font-mono uppercase tracking-[0.15em] block mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Lab
            </span>
          </motion.div>

          <motion.h1
            className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.95] tracking-[-0.03em] mb-6"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            Experiments
          </motion.h1>

          <motion.p
            className="text-lg max-w-xl font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            Generative systems, data visualizations, and agent interfaces.
            Prototypes that explore the edge of what the toolchain can do.
          </motion.p>
        </div>
      </section>

      {/* Experiments grid */}
      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiments.map((exp, i) => (
              <motion.a
                key={exp.slug}
                href={exp.href || `/lab/${exp.slug}`}
                {...(exp.href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group relative flex flex-col rounded-xl border p-6 transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.07,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={{
                  borderColor: "var(--border-focus)",
                }}
              >
                {/* Arrow icon */}
                <ArrowUpRight
                  size={16}
                  className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                />

                {/* Category */}
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.14em] block mb-3"
                  style={{ color: "var(--accent)" }}
                >
                  {exp.category}
                </span>

                {/* Title */}
                <h2
                  className="text-base font-semibold mb-3 pr-6"
                  style={{ color: "var(--text-primary)" }}
                >
                  {exp.title}
                </h2>

                {/* Description */}
                <p
                  className="text-sm flex-1 mb-5"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  {exp.description}
                </p>

                {/* Status badge */}
                <div>
                  <StatusBadge status={exp.status} />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
