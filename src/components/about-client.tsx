import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

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
      <p
        className="text-sm font-mono uppercase tracking-[0.15em] mb-6"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        About
      </p>
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
        className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-[-0.03em] max-w-3xl"
        style={{ color: "var(--text-primary)", ...fadeInStyle(0.1) }}
      >
        One person.
        <br />
        <span style={{ color: "var(--accent)" }}>Real tools.</span>
      </h1>
      <p
        className="mt-8 text-lg max-w-xl font-light"
        style={{ color: "var(--text-secondary)", lineHeight: 1.7, ...fadeInStyle(0.2) }}
      >
        Edgeless Labs is a solo creative technology studio building agents,
        pipelines, and tools that actually run in production. No team. No
        funding. No vaporware.
      </p>
    </>
  );
}

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          style={fadeInStyle(i * 0.08)}
        >
          <span
            className="text-3xl sm:text-4xl font-bold font-mono block mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.value}
          </span>
          <span
            className="text-xs font-mono uppercase tracking-[0.12em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Philosophy() {
  return (
    <div className="max-w-2xl">
      <h2
        className="text-sm font-mono uppercase tracking-[0.15em] mb-8"
        style={{ color: "var(--text-tertiary)", ...fadeInStyle(0) }}
      >
        Philosophy
      </h2>
      <div
        className="space-y-6 text-lg font-light"
        style={{ color: "var(--text-secondary)", lineHeight: 1.7, ...fadeInStyle(0.1) }}
      >
        <p>
          Most AI companies are building demos. This lab builds{" "}
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
          The best AI tools are built by people who{" "}
          <span style={{ color: "var(--text-primary)" }}>use them every day</span>.
          Everything here is dogfooded. The orchestration layer routes my own
          work. The memory system stores my own knowledge. The agents manage
          my own portfolio.
        </p>
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
