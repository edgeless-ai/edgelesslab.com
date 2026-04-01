"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { trackCTA } from "@/lib/analytics";
import { AnimatedText, AnimatedFadeIn } from "@/components/ui/animated-text";
import { GlowingCard } from "@/components/ui/glowing-card";
import { DotBackground } from "@/components/ui/dot-background";
import { KineticPreText } from "@/components/ui/kinetic-pretext";
import { StaggerReveal } from "@/components/ui/pretext-stagger-reveal";
import { PreTextRichFlow, type RichFlowSegment } from "@/components/ui/pretext-rich-flow";
import { useShrinkWrap } from "@/hooks/use-shrink-wrap";
import { products } from "@/lib/data";

const HERO_SUBTITLE =
  "Edgeless Lab builds autonomous agents, generative art, and developer tools. One person. Everything in production.";

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
          <AnimatedText text="Built solo." delay={0.1} />
          <br />
          <span style={{ color: "var(--accent)" }}>
            <AnimatedText text="Shipped" delay={0.3} />
          </span>
          <br />
          <AnimatedText text="open." delay={0.45} />
        </h1>

        <AnimatedFadeIn delay={0.7}>
          <div className="mt-8 max-w-lg">
            <KineticPreText
              text={HERO_SUBTITLE}
              font='300 18px "Geist"'
              lineHeight={30}
              cursorRadius={36}
              cursorColor="var(--accent)"
              className="text-lg font-light"
              style={{ color: "var(--text-secondary)" }}
              fallback={
                <p style={{ lineHeight: 1.7 }}>{HERO_SUBTITLE}</p>
              }
            />
          </div>
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

/* ── Stack Flow (rich inline pipeline) ───────────────────── */

interface StackNode {
  label: string;
  sublabel: string;
  color: string;
}

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
      text: ` ${node.sublabel}`,
      font: SANS_FONT,
      lineHeight: FLOW_LINE_HEIGHT,
      style: { color: "var(--text-tertiary)" },
    });
    if (i < nodes.length - 1) {
      segments.push({
        text: " \u2192 ",
        font: SANS_FONT,
        lineHeight: FLOW_LINE_HEIGHT,
        style: { color: "var(--border-focus)" },
      });
    }
  }
  return segments;
}

export function StackFlow({ nodes }: { nodes: StackNode[] }) {
  const flowSegments = useMemo(() => buildFlowSegments(nodes), [nodes]);

  return (
    <>
      <div className="max-w-2xl">
        <PreTextRichFlow
          segments={flowSegments}
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>

      <div className="mt-8 max-w-lg">
        <StaggerReveal
          text="Agents dispatch tasks through MCP servers. Knowledge persists in ChromaDB and Obsidian. A Hetzner VPS keeps everything running, unattended."
          font='300 14px "Geist"'
          lineHeight={24}
          staggerMs={50}
          maxSlide={20}
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
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
  // Show top 3 paid products + the free kit
  const featured = products.filter((p) => p.price !== "Free").slice(0, 3);
  const free = products.find((p) => p.price === "Free");

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
        <a
          href="/products"
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
            +{products.length - 4} more products <ArrowRight size={12} />
          </span>
        </a>
      )}
    </div>
  );
}

/* ── About Blurb (animated + shrink-wrapped) ──────────────── */

const ABOUT_TEXT =
  "One person shipping agents, MCP servers, generative art, and developer tools. In production, in the open, since day one. No pitch decks. No vaporware.";
const ABOUT_FONT = '300 28px "Geist"';
const ABOUT_LINE_HEIGHT = 42;

export function AboutBlurb() {
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
