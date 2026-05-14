"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { GlowingCard } from "@/components/ui/glowing-card";
import { PreTextRichFlow, type RichFlowSegment } from "@/components/ui/pretext-rich-flow";
import { PreTextOrbs } from "@/components/ui/pretext-orbs";
import { useShrinkWrap } from "@/hooks/use-shrink-wrap";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { LiveProjectsShowcase } from "@/components/projects-showcase";
import { products } from "@/lib/data";

/* ── Types ───────────────────────────────────────────────── */

interface FeaturedProject {
  title: string;
  description: string;
  tags: string[];
  snippet: string;
  href: string;
  span: string;
}

interface Capability {
  label: string;
  snippet: string;
}

interface StackNode {
  label: string;
  sublabel: string;
  color: string;
}

interface Experiment {
  title: string;
  category: string;
  href: string;
  external?: boolean;
  description?: string;
  stack?: string[];
  status?: string;
}

export interface HomeBelowFoldProps {
  featured: FeaturedProject[];
  capabilities: Capability[];
  stackNodes: StackNode[];
  homepageExperiments: Experiment[];
}

/* ── Main wrapper (default export for next/dynamic) ──────── */

export default function HomeBelowFold({
  featured,
  capabilities,
  stackNodes,
  homepageExperiments,
}: HomeBelowFoldProps) {
  return (
    <>
      <LiveProjectsShowcase />

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

            <FeaturedGrid projects={featured} />
          </div>
        </ScrollReveal>
      </section>

      {/* Infrastructure */}
      <section
        className="px-6 py-20"
        style={{ background: "var(--bg-surface)" }}
      >
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <h2
              className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
              style={{ color: "var(--text-tertiary)" }}
            >
              Infrastructure
            </h2>

            <CapabilitiesGrid capabilities={capabilities} />
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

            <StackFlow nodes={stackNodes} />
          </div>
        </ScrollReveal>
      </section>

      {/* Lab */}
      <section className="px-6 py-20">
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <h2
                className="text-sm font-mono uppercase tracking-[0.15em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Lab
              </h2>
              <Link
                href="/lab"
                className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                style={{ color: "var(--text-secondary)" }}
              >
                All experiments <ArrowRight size={13} />
              </Link>
            </div>

            <ExperimentsGrid experiments={homepageExperiments} />
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

            <ProductHighlight />
          </div>
        </ScrollReveal>
      </section>

      {/* About */}
      <section className="px-6 py-24">
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <AboutBlurb />
          </div>
        </ScrollReveal>
      </section>

      {/* Subscribe */}
      <SubscribeSection />
    </>
  );
}

/* ── Featured Projects (animated bento grid) ─────────────── */

function FeaturedGrid({ projects }: { projects: FeaturedProject[] }) {
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

function CapabilitiesGrid({ capabilities }: { capabilities: Capability[] }) {
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

/* ── Stack Flow (rich inline pipeline) ───────────────────── */

const MONO_FONT = '600 14px "Geist Mono"';
const SANS_FONT = '300 14px "Geist"';
const FLOW_LINE_HEIGHT = 28;

function buildFlowSegments(nodes: StackNode[]): RichFlowSegment[] {
  const segments: RichFlowSegment[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    segments.push({
      text: node.label,
      font: MONO_FONT,
      lineHeight: FLOW_LINE_HEIGHT,
      style: { color: "var(--accent)" },
    });
    segments.push({
      text: ` ${node.sublabel}`,
      font: SANS_FONT,
      lineHeight: FLOW_LINE_HEIGHT,
      style: { color: "var(--text-tertiary)" },
    });
    if (i < nodes.length - 1) {
      segments.push({
        text: " → ",
        font: SANS_FONT,
        lineHeight: FLOW_LINE_HEIGHT,
        style: { color: "var(--border-focus)" },
      });
    }
  }
  return segments;
}

function StackFlow({ nodes }: { nodes: StackNode[] }) {
  const flowSegments = useMemo(() => buildFlowSegments(nodes), [nodes]);

  return (
    <>
      <div className="max-w-2xl">
        <PreTextRichFlow
          segments={flowSegments}
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>

      <div className="mt-8 max-w-2xl">
        <PreTextOrbs
          text="Agents call tools through MCP. Knowledge persists across sessions in vector memory and markdown vaults. A single VPS keeps the whole system running, unattended. Every tool is an MCP server. Every agent can use any tool. Add a new capability and it's immediately available to every agent in the system."
          font='300 14px "Geist"'
          lineHeight={24}
          orbCount={3}
          orbRadius={36}
          textColor="var(--text-tertiary)"
        />
      </div>
    </>
  );
}

/* ── Lab Experiments (animated cards) ─────────────────────── */

function ExperimentsGrid({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {experiments.map((exp, i) => (
        <a
          key={exp.title}
          href={exp.href}
          {...(exp.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="group relative rounded-xl border p-5 transition-all hover:scale-[1.02] flex flex-col"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-xs font-mono uppercase tracking-[0.12em]"
              style={{ color: "var(--accent)" }}
            >
              {exp.category}
            </span>
            {exp.status && (
              <span
                className="text-[10px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{
                  background: exp.status === "Live" ? "var(--green-muted)" : "var(--accent-muted)",
                  color: exp.status === "Live" ? "var(--green)" : "var(--accent)",
                }}
              >
                {exp.status}
              </span>
            )}
          </div>
          <span
            className="text-sm font-medium block mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {exp.title}
          </span>
          {exp.description && (
            <p
              className="text-xs line-clamp-2 mb-3 flex-1"
              style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
            >
              {exp.description}
            </p>
          )}
          {exp.stack && exp.stack.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {exp.stack.map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
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

/* ── Product Highlight ───────────────────────────────────── */

function ProductHighlight() {
  const featured = products.filter((p) => p.price !== "Free").slice(0, 6);
  const free = products.find((p) => p.price === "Free");
  const remaining = products.length - featured.length - (free ? 1 : 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {featured.map((product, i) => (
        <a
          key={product.name}
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:border-white/20"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {product.name}
            </span>
            <ArrowUpRight
              size={14}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
            />
          </div>
          <span
            className="text-lg font-bold font-mono block mb-2"
            style={{ color: "var(--accent)" }}
          >
            {product.price}
          </span>
          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
          >
            {product.description}
          </p>
        </a>
      ))}
      {free && (
        <Link
          href="/products/"
          className="group block rounded-xl border p-5 transition-all hover:scale-[1.01] hover:border-white/20"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.24s both`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {free.name}
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-md"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--green)" }}
            >
              Free
            </span>
          </div>
          <p
            className="text-xs mb-3"
            style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
          >
            {free.description}
          </p>
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: "var(--accent)" }}
          >
            +{remaining} more products <ArrowRight size={12} />
          </span>
        </Link>
      )}
    </div>
  );
}

/* ── About Blurb (animated + shrink-wrapped) ──────────────── */

const ABOUT_TEXT =
  "One person shipping agents, MCP servers, generative art, and developer tools. In production, in the open, since day one. No pitch decks. No vaporware.";
const ABOUT_FONT = '300 28px "Geist"';
const ABOUT_LINE_HEIGHT = 42;

function AboutBlurb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const balancedWidth = useShrinkWrap(ABOUT_TEXT, ABOUT_FONT, ABOUT_LINE_HEIGHT, containerWidth);

  return (
    <div className="max-w-2xl" ref={containerRef}>
      <p
        className="text-2xl sm:text-3xl font-light leading-[1.5]"
        style={{
          color: "var(--text-secondary)",
          animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
          ...(balancedWidth ? { maxWidth: `${balancedWidth}px` } : {}),
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>One person</span> shipping
        agents, MCP servers, generative art, and developer tools. In production,
        in the open, since day one.{" "}
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

function SubscribeSection() {
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
              Everything ships on GitHub.
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              Agent frameworks, generative art, and developer tools - all in the open.
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
