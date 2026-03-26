"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { trackCTA } from "@/lib/analytics";
import { AnimatedText, AnimatedFadeIn } from "@/components/ui/animated-text";
import { GlowingCard } from "@/components/ui/glowing-card";
import { DotBackground } from "@/components/ui/dot-background";

/* ── Hero ────────────────────────────────────────────────── */

export function HeroSection() {
  return (
    <section className="relative flex min-h-[92svh] items-center px-6 pb-16 pt-28 md:min-h-screen md:items-end md:pb-24 md:pt-32">
      <DotBackground />
      <div className="relative max-w-[1280px] w-full mx-auto">
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
            className="mt-8 max-w-lg text-lg font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Agents that trade. Pipelines that learn. Art that plots itself.
            A one-person lab at the edge of what ships.
          </p>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={0.9}>
          <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium text-white rounded-full transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: "var(--accent)" }}
              onClick={() => trackCTA("hero_view_products", "/products")}
            >
              View Products <ArrowRight size={15} />
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium rounded-full border transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
              onClick={() => trackCTA("hero_view_projects", "/projects")}
            >
              Browse projects <ArrowRight size={15} />
            </Link>
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
  );
}

/* ── Featured Projects (animated bento grid) ─────────────── */

interface FeaturedProject {
  title: string;
  description: string;
  tags: string[];
  snippet: string;
  href: string;
  span: string;
}

export function FeaturedGrid({ projects }: { projects: FeaturedProject[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-[auto_auto]">
      {projects.map((project, i) => (
        <div key={project.title} className={project.span}>
          <GlowingCard
            className="h-full"
            href={project.href}
          >
            <div
              style={{
                animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s both`,
              }}
            >
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
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <span
                    className="ml-2 text-xs font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {project.title.toLowerCase().replace(/\s+/g, "-")}
                  </span>
                </div>
                <pre
                  className={`px-3 py-3 text-xs leading-[1.7] font-mono whitespace-pre overflow-hidden ${
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
                    className="px-2.5 py-1 text-xs font-mono rounded-md"
                    style={{
                      background: "var(--accent-muted)",
                      color: "var(--accent)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </GlowingCard>
        </div>
      ))}
    </div>
  );
}

/* ── Capabilities (animated cards) ────────────────────────── */

interface Capability {
  label: string;
  snippet: string;
}

export function CapabilitiesGrid({ capabilities }: { capabilities: Capability[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {capabilities.map((cap, i) => (
        <div
          key={cap.label}
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--bg-base)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
          }}
        >
          <div
            className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <span
              className="text-xs font-mono"
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
            className="px-5 py-4 text-xs leading-[1.8] font-mono whitespace-pre overflow-x-auto"
            style={{ color: "var(--green)" }}
          >
            {cap.snippet}
          </pre>
        </div>
      ))}
    </div>
  );
}

/* ── Stack Flow (animated pipeline) ──────────────────────── */

interface StackNode {
  label: string;
  sublabel: string;
  color: string;
}

export function StackFlow({ nodes }: { nodes: StackNode[] }) {
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex flex-col sm:flex-row items-start sm:items-center min-w-0">
            <div
              className="flex flex-col gap-1 px-4 py-3 rounded-xl border shrink-0 transition-all hover:scale-[1.02]"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
                animation: `fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1) ${i * 0.09}s both`,
              }}
            >
              <span
                className="text-[13px] font-semibold font-mono leading-none"
                style={{ color: "var(--text-primary)" }}
              >
                {node.label}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {node.sublabel}
              </span>
            </div>

            {i < nodes.length - 1 && (
              <div className="flex items-center justify-center sm:px-3 py-2 sm:py-0">
                <span
                  className="hidden sm:block text-xs font-mono select-none"
                  style={{ color: "var(--border-focus)" }}
                >
                  ──▶
                </span>
                <span
                  className="sm:hidden block text-xs font-mono ml-6 select-none"
                  style={{ color: "var(--border-focus)" }}
                >
                  ↓
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <p
        className="mt-8 text-sm max-w-lg"
        style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}
      >
        Claude Code agents dispatch tasks through MCP servers, persist knowledge in ChromaDB and Obsidian, and run autonomously on a Hetzner VPS via the Hermes gateway.
      </p>
    </>
  );
}

/* ── Lab Experiments (animated cards) ─────────────────────── */

interface Experiment {
  title: string;
  category: string;
  href: string;
  external?: boolean;
}

export function ExperimentsGrid({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {experiments.map((exp, i) => (
        <a
          key={exp.title}
          href={exp.href}
          {...(exp.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="group relative rounded-xl border p-5 transition-all hover:scale-[1.02]"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
          }}
        >
          <span
            className="text-xs font-mono uppercase tracking-[0.12em] block mb-3"
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
          <div
            className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowUpRight size={14} />
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── Product Highlight (single featured product card) ──────── */

export function ProductHighlight() {
  return (
    <>
      <a
        href="/products"
        className="group block rounded-xl border p-6 transition-all hover:scale-[1.01]"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Claude Memory Kit
              </span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded-md"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
              >
                Free
              </span>
            </div>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
            >
              Drop-in persistent memory for Claude Code. Three-layer system: ChromaDB, PyTorch, and Obsidian vault.
            </p>
          </div>
          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowUpRight size={16} />
          </div>
        </div>
      </a>
    </>
  );
}

/* ── About Blurb (animated) ───────────────────────────────── */

export function AboutBlurb() {
  return (
    <div className="max-w-2xl">
      <p
        className="text-2xl sm:text-3xl font-light leading-[1.5]"
        style={{
          color: "var(--text-secondary)",
          animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>Edgeless Labs</span> is a
        one-person creative technology studio. We ship agents, MCP servers,
        generative art pipelines, and tools that work.{" "}
        <span style={{ color: "var(--text-primary)" }}>No pitch decks. No vaporware.</span>
      </p>
      <div
        className="mt-8"
        style={{ animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
      >
        <Link
          href="/about"
          className="text-sm font-medium flex items-center gap-1.5 transition-colors hover:text-white"
          style={{ color: "var(--accent)" }}
        >
          About the lab <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

/* ── Subscribe / CTA Section ──────────────────────────────── */

export function SubscribeSection() {
  return (
    <section
      className="px-6 py-20 border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-lg">
          <div
            style={{ animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                Stay in the loop
              </span>
            </div>
            <h2
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Follow the lab on GitHub.
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              Agent experiments, generative art drops, and infra updates. All open source.
            </p>

            <a
              href="https://github.com/edgeless-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium text-white rounded-full transition-all hover:brightness-110 hover:scale-[1.02]"
              style={{ background: "var(--accent)" }}
            >
              GitHub <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
