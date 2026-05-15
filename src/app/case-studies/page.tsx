"use client";

import { GlowingCard } from "@/components/ui/glowing-card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CASE_STUDIES = [
  {
    slug: "total-serialism-composer",
    title: "Total Serialism: A Live Composer at the Edge of Order and Chaos",
    category: "Experiment",
    tags: ["Generative Art", "Music Theory", "Reactive Systems"],
    description:
      "A real-time animated data feed that turns breaking news into 12-tone composition. Each headline triggers a row of pianos, strings, and synthesizers — one instrument per data feed — processed through a gestalt filter so the whole piece stays legible even at maximum density.",
    color: "var(--accent)",
    href: "/case-studies/total-serialism-composer",
  },
  {
    slug: "pen-plotter-data-migration",
    title: "Pen Plotter Data Migration: Moving 1.2GB of Assets to Static Hosting",
    category: "Infrastructure",
    tags: ["Performance", "CI/CD", "Asset Pipeline"],
    description:
      "Recovered a stalled infrastructure goal: 69,000+ unoptimized PNGs consumed 99% of site budget. The migration pipeline converted them to WebP/AVIF, implemented lazy loading, and cut initial page load time by 87% — all automated via shell scripts in CI.",
    color: "var(--green)",
    href: "/case-studies/pen-plotter-data-migration",
  },
  {
    slug: "envelope-protocol",
    title: "Envelope Protocol: Stopping AI Agents from Infinite Loops",
    category: "Architecture",
    tags: ["AI Agents", "Protocols", "Swarm Coordination"],
    description:
      "Seven Discord bots needed a coordination protocol. Five fields in a message header and a depth counter prevented an agent from consuming 800K tokens in a single loop. The 47-minute loop became a documented pattern with guardrails.",
    color: "var(--accent-muted)",
    href: "/case-studies/envelope-protocol",
  },
];

export default function CaseStudiesPage() {
  return (
    <section className="relative flex min-h-[90svh] items-center px-6 pb-16 pt-28 md:min-h-screen md:pb-24 md:pt-32">
      <div className="relative max-w-[1280px] w-full mx-auto space-y-16">
        {/* Header */}
        <div className="space-y-6">
          <div
            className="inline-flex items-center gap-2.5 mb-3 px-3 py-1.5 rounded-full border"
            style={{
              borderColor: "rgba(52, 211, 153, 0.25)",
              background: "rgba(52, 211, 153, 0.06)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
                style={{ background: "var(--green)" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "var(--green)" }}
              />
            </span>
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--green)" }}
            >
              Case Studies
            </span>
          </div>

          <h1
            className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[0.92] tracking-[-0.035em]"
            style={{ color: "var(--text-primary)" }}
          >
            Deep dives on
            <br />
            <span style={{ color: "var(--accent)" }}>what we shipped</span>
            {" "}and how
          </h1>

          <p
            className="text-lg max-w-2xl font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
          >
            Technical post-mortems from edgeless builds — architecture decisions,
            failure modes, performance wins, and the infrastructure that makes
            multi-agent systems ship reliably.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CASE_STUDIES.map((cs, i) => (
            <div
              key={cs.slug}
              style={{
                animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
                animationDelay: `${i * 0.07}s`,
              }}
            >
              <GlowingCard href={cs.href} className="h-full p-6 group">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{
                      background:
                        "var(--accent-muted)",
                      color: cs.color,
                      border: `1px solid ${cs.color}33`,
                    }}
                  >
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ background: cs.color }}
                    />
                    {cs.category}
                  </span>
                </div>

                <h2
                  className="text-lg font-semibold leading-snug mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {cs.title}
                </h2>

                <p
                  className="text-sm leading-relaxed mb-5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {cs.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {cs.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-text-tertiary"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span
                    className="text-sm font-medium transition-transform duration-fast group-hover:translate-x-1"
                    style={{ color: "var(--accent)" }}
                  >
                    Read <ArrowRight size={12} className="inline" />
                  </span>
                </div>
              </GlowingCard>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div
          className="flex items-center gap-4 pt-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <Link
            href="/projects"
            className="text-sm font-mono text-text-tertiary hover:text-accent transition-colors duration-fast"
          >
            &larr; Back to Projects
          </Link>
        </div>
      </div>
    </section>
  );
};
