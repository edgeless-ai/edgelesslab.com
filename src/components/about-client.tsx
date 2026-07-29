"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EditorialBlock } from "@/components/ui/pretext-pull-quote";

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
    <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:items-start">
      <div className="flex items-center gap-3 pt-2" style={fadeInStyle(0)}>
        <span
          className="w-2 h-2 shrink-0"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="text-[11px] font-mono uppercase tracking-[0.14em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          About Edgeless Lab
        </span>
      </div>
      <div>
        <h1
          className="text-4xl sm:text-5xl font-semibold leading-[1.02] tracking-[-0.035em] max-w-3xl"
          style={{ color: "var(--text-primary)", ...fadeInStyle(0.08) }}
        >
          I build systems that work, and studies that make them visible.
        </h1>
        <p
          className="mt-7 text-lg max-w-2xl"
          style={{ color: "var(--text-secondary)", lineHeight: 1.65, ...fadeInStyle(0.16) }}
        >
          I&apos;m David Murray, a creative technologist working across agent
          infrastructure, generative art, and tools for people who want more
          control over their technology. Edgeless Lab is where I build in
          public, document what I learn, and turn the strongest experiments
          into useful work.
        </p>
        <div
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
          style={fadeInStyle(0.24)}
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
            style={{ color: "var(--accent)" }}
          >
            See the work <ArrowUpRight size={14} />
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: "var(--text-secondary)" }}
          >
            Read the blog <ArrowUpRight size={14} />
          </Link>
          <a
            href="mailto:david@edgelesslab.com?subject=Working%20with%20Edgeless%20Lab"
            className="inline-flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: "var(--text-secondary)" }}
          >
            Work with me <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

const philosophyParagraphs = [
  "Most AI companies are building demos. This lab builds infrastructure that runs 24/7. The knowledge pipeline indexes thousands of documents. The MCP servers handle real queries from real agents. The hooks catch mistakes before they cost real money.",
  "The lab exists at the intersection of AI, craft, and systems thinking. Every project ships. Every tool gets used. If it doesn\u2019t work in production, it doesn\u2019t exist.",
  "The best AI tools are built by people who use them every day. Everything here is dogfooded. The orchestration layer routes my own work. The memory system stores my own knowledge. The hooks guard my own agents.",
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

export function Manifesto() {
  const lines = [
    "Ship weekly.",
    "Price honestly.",
    "Open-source the boring parts.",
    "Run it in production before selling it.",
    "Answer every email.",
    "No vaporware. Ever.",
  ];
  return (
    <div className="max-w-3xl">
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Operating principles
      </h2>
      <ul className="space-y-3">
        {lines.map((line, i) => (
          <li
            key={line}
            className="flex items-baseline gap-4 text-2xl sm:text-3xl font-light tracking-tight"
            style={{
              color: "var(--text-primary)",
              ...fadeInStyle(0.08 + i * 0.06),
            }}
          >
            <span
              className="text-xs font-mono shrink-0 w-6 text-right"
              style={{ color: "var(--accent)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
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
