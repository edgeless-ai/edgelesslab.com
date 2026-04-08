"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { EditorialBlock } from "@/components/ui/pretext-pull-quote";

interface Stat {
  label: string;
  value: string;
}

interface TimelineItem {
  period: string;
  title: string;
  description: string;
}

interface Link {
  label: string;
  href: string;
  description: string;
}

const fadeInStyle = (delay = 0): React.CSSProperties => ({
  animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
});

export function AboutHeader() {
  return (
    <>
      <div
        className="inline-flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-surface)",
          ...fadeInStyle(0),
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="text-[11px] font-mono uppercase tracking-[0.14em]"
          style={{ color: "var(--text-secondary)" }}
        >
          About &middot; David Murray
        </span>
      </div>
      <Image
        src="/og-image.png"
        alt="Edgeless Labs"
        width={0}
        height={0}
        className="sr-only"
        aria-hidden="true"
        loading="lazy"
      />
      <h1
        className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-[-0.035em] max-w-4xl"
        style={{ color: "var(--text-primary)", ...fadeInStyle(0.1) }}
      >
        One developer.
        <br />
        <span style={{ color: "var(--accent)" }}>Production systems.</span>
      </h1>
      <p
        className="mt-8 text-lg max-w-2xl font-light"
        style={{ color: "var(--text-secondary)", lineHeight: 1.55, ...fadeInStyle(0.2) }}
      >
        Edgeless Labs is one person shipping autonomous agents, MCP servers, and generative art. 18 products live, 4 services running 24/7 on a single VPS. No team, no funding, no vaporware.
      </p>
    </>
  );
}

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="border-l-2 pl-5"
          style={{
            borderColor: "var(--accent)",
            ...fadeInStyle(i * 0.08),
          }}
        >
          <span
            className="text-4xl sm:text-5xl font-bold font-mono block mb-2 tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.value}
          </span>
          <span
            className="text-[11px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const philosophyParagraphs = [
  "Most AI companies are building demos. This lab builds infrastructure that runs 24/7. Pamela trades autonomously. The knowledge pipeline indexes thousands of documents. The MCP servers handle real queries from real agents.",
  "The lab exists at the intersection of AI, craft, and systems thinking. Every project ships. Every tool gets used. If it doesn\u2019t work in production, it doesn\u2019t exist.",
  "The best AI tools are built by people who use them every day. Everything here is dogfooded. The orchestration layer routes my own work. The memory system stores my own knowledge. The agents manage my own portfolio.",
];

const philosophyPullQuotes = [
  {
    text: "Infrastructure that runs 24/7.",
    side: "right" as const,
    yOffset: 20,
    width: 240,
  },
  {
    text: "If it doesn\u2019t work in production, it doesn\u2019t exist.",
    side: "right" as const,
    yOffset: 200,
    width: 260,
  },
];

export function Philosophy() {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-8"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Philosophy
      </h2>
      <div style={fadeInStyle(0.1)}>
        <EditorialBlock
          paragraphs={philosophyParagraphs}
          pullQuotes={philosophyPullQuotes}
          font='300 18px "Geist"'
          lineHeight={30}
          quoteFont='600 22px "Geist"'
          quoteLineHeight={30}
          className="text-lg font-light"
          style={{ color: "var(--text-secondary)" }}
        />
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <>
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-12"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Timeline
      </h2>
      <div className="space-y-0">
        {items.map((item, i) => (
          <div
            key={item.period}
            className="grid grid-cols-[80px_1fr] sm:grid-cols-[120px_1fr] gap-6 py-8 border-t"
            style={{ borderColor: "var(--border-subtle)", ...fadeInStyle(i * 0.1) }}
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
          </div>
        ))}
      </div>
    </>
  );
}

export function ConnectGrid({ links }: { links: Link[] }) {
  return (
    <>
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Connect
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {links.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            className="group rounded-xl border p-6 transition-colors hover:border-white/[0.12]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              ...fadeInStyle(i * 0.08),
            }}
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
          </a>
        ))}
      </div>
    </>
  );
}
