"use client";

import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  FlaskConical,
  Layers,
  Palette,
  Sparkles,
  Terminal,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedText, AnimatedFadeIn } from "@/components/ui/animated-text";
import { GlowingCard } from "@/components/ui/glowing-card";
import { DotBackground } from "@/components/ui/dot-background";

const projects = [
  {
    title: "Pamela",
    description:
      "Autonomous prediction market agent. TypeScript, ML-driven position sizing, live on Polymarket.",
    tags: ["TypeScript", "ML", "Trading"],
    icon: BrainCircuit,
  },
  {
    title: "MCP Server Toolkit",
    description:
      "Production MCP servers for ChromaDB, knowledge search, and multi-agent orchestration.",
    tags: ["MCP", "TypeScript", "Effect-TS"],
    icon: Layers,
  },
  {
    title: "Pen Plotter Art",
    description:
      "105+ generative art experiments scored by an AI judge. SVG to physical media pipeline.",
    tags: ["Generative Art", "Python", "SVG"],
    icon: Palette,
  },
  {
    title: "Mastra Orchestrator",
    description:
      "Multi-agent routing and task dispatch across Claude, Gemini, and local models.",
    tags: ["Mastra", "Agents", "VPS"],
    icon: Bot,
  },
];

const capabilities = [
  { icon: BrainCircuit, label: "AI Agents" },
  { icon: Terminal, label: "CLI Tools" },
  { icon: FlaskConical, label: "Experiments" },
  { icon: Palette, label: "Generative Art" },
  { icon: Layers, label: "MCP Servers" },
  { icon: Code2, label: "Open Source" },
  { icon: Bot, label: "Multi-Agent" },
  { icon: Sparkles, label: "Creative Tech" },
];

const experiments = [
  {
    title: "Strange Attractors",
    description:
      "Lorenz system visualization rendered for pen plotting. Real-time parameter exploration.",
    category: "Generative",
  },
  {
    title: "Knowledge Graph",
    description:
      "Live visualization of 7,000+ documents across ChromaDB, Obsidian, and vector embeddings.",
    category: "Data Viz",
  },
  {
    title: "Total Serialism",
    description:
      "Algorithmic music composition using serialist techniques. Audio + visual score generation.",
    category: "Audio",
  },
];

export default function Home() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{
          background: "rgba(240, 242, 244, 0.8)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Edgeless Labs
          </span>
          <div className="flex items-center gap-6">
            {["Projects", "Lab", "About", "Journal"].map((link) => (
              <a
                key={link}
                href={`/${link.toLowerCase()}`}
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-secondary)" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-screen px-6 pt-14">
        <DotBackground />
        <div className="relative max-w-[1280px] w-full">
          <AnimatedFadeIn>
            <p
              className="text-sm font-medium mb-4 uppercase"
              style={{
                color: "var(--accent)",
                letterSpacing: "0.08em",
              }}
            >
              Creative Technology Lab
            </p>
          </AnimatedFadeIn>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold max-w-3xl"
            style={{
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 0.95,
            }}
          >
            <AnimatedText text="Tools for the" delay={0.1} />
            <span style={{ color: "var(--accent)" }}>
              <AnimatedText text=" AI-native" delay={0.35} />
            </span>
            <AnimatedText text=" developer." delay={0.5} />
          </h1>
          <AnimatedFadeIn delay={0.6}>
            <p
              className="mt-6 text-lg sm:text-xl max-w-xl"
              style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
            >
              We build agents, MCP servers, generative art pipelines, and
              experimental tools at the intersection of AI and craft.
            </p>
          </AnimatedFadeIn>
          <AnimatedFadeIn delay={0.8}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href="/projects"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 text-sm font-medium text-white rounded-full transition-colors hover:brightness-110"
                style={{ background: "var(--accent)" }}
              >
                View Projects <ArrowRight size={16} />
              </a>
              <a
                href="/lab"
                className="inline-flex items-center justify-center h-12 px-6 text-sm font-medium rounded-full border hover:bg-black/[0.03] transition-colors"
                style={{
                  color: "var(--text-primary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                Explore the Lab
              </a>
            </div>
          </AnimatedFadeIn>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="px-6 py-20 sm:py-24">
        <div className="max-w-[1280px] mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-semibold mb-12"
            style={{
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Featured Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((project, i) => (
              <GlowingCard
                key={project.title}
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
                  <div
                    className="w-full h-40 rounded-xl mb-6 flex items-center justify-center"
                    style={{ background: "var(--bg-base)" }}
                  >
                    <project.icon
                      size={48}
                      strokeWidth={1.2}
                      style={{ color: "var(--accent)", opacity: 0.5 }}
                    />
                  </div>
                  <h3
                    className="text-xl font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {project.title}
                  </h3>
                  <p
                    className="text-sm mb-4 max-w-lg"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs font-medium rounded-full"
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
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Strip */}
      <section
        className="px-6 py-16"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-8">
            {capabilities.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                className="flex flex-col items-center gap-3 text-center"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-muted)" }}
                >
                  <Icon size={22} style={{ color: "var(--accent)" }} />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lab Preview */}
      <section className="px-6 py-20 sm:py-24">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2
              className="text-3xl sm:text-4xl font-semibold"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              From the Lab
            </h2>
            <a
              href="/lab"
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: "var(--accent)" }}
            >
              All experiments <ArrowRight size={14} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.map((exp, i) => (
              <GlowingCard
                key={exp.title}
                href={`/lab/${exp.title.toLowerCase().replace(/\s+/g, "-")}`}
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
                  <div
                    className="w-full h-48 rounded-xl mb-4"
                    style={{ background: "var(--bg-base)" }}
                  />
                  <span
                    className="text-xs font-medium uppercase"
                    style={{
                      color: "var(--accent)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {exp.category}
                  </span>
                  <h3
                    className="text-lg font-semibold mt-2 mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {exp.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {exp.description}
                  </p>
                </motion.div>
              </GlowingCard>
            ))}
          </div>
        </div>
      </section>

      {/* About Teaser */}
      <section
        className="px-6 py-20 sm:py-24"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="max-w-[768px] mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-semibold mb-6"
            style={{
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            Built different.
          </h2>
          <p
            className="text-lg mb-8"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            Edgeless Labs is a one-person creative technology studio. We ship
            real tools -- agents that trade, pipelines that learn, art that
            plots itself. No pitch decks. No vaporware. Just working software
            at the edge of what&apos;s possible.
          </p>
          <a
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Learn more about the lab <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-12 border-t"
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Edgeless Labs
              </span>
              <p
                className="text-sm mt-2 max-w-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Creative technology lab. Tools for the AI-native developer.
              </p>
            </div>
            <div>
              <span
                className="text-xs font-medium uppercase mb-3 block"
                style={{
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                }}
              >
                Links
              </span>
              <div className="flex flex-col gap-2">
                {["Projects", "Lab", "About", "Journal", "Contact"].map(
                  (link) => (
                    <a
                      key={link}
                      href={`/${link.toLowerCase()}`}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {link}
                    </a>
                  )
                )}
              </div>
            </div>
            <div>
              <span
                className="text-xs font-medium uppercase mb-3 block"
                style={{
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.08em",
                }}
              >
                Connect
              </span>
              <div className="flex flex-col gap-2">
                <a
                  href="https://github.com/edgeless-labs"
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  GitHub
                </a>
                <a
                  href="mailto:hello@edgelesslab.com"
                  className="text-sm hover:opacity-80 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  hello@edgelesslab.com
                </a>
              </div>
            </div>
          </div>
          <div
            className="pt-6 border-t flex items-center justify-between"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-center gap-4">
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                &copy; 2026 Edgeless Labs
              </span>
              <a
                href="/privacy"
                className="text-xs hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-xs hover:opacity-80 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              >
                Terms
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "#4ADE80" }}
              />
              <span
                className="text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
