import { ArrowUpRight } from "lucide-react";

interface Experiment {
  title: string;
  category: string;
  description: string;
  status: string;
  slug: string;
  href?: string;
}

export function LabHeader() {
  return (
    <>
      <div
        className="inline-flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border"
        style={{
          borderColor: "rgba(129, 140, 248, 0.25)",
          background: "var(--accent-muted)",
          animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span
          className="text-small font-mono uppercase tracking-[0.14em]"
          style={{ color: "var(--accent)" }}
        >
          Works in progress
        </span>
      </div>

      <h1
        className="text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.92] tracking-[-0.035em] mb-6"
        style={{
          color: "var(--text-primary)",
          animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both",
        }}
      >
        Experiments
      </h1>

      <p
        className="text-lg max-w-xl font-light mb-3"
        style={{
          color: "var(--text-secondary)",
          lineHeight: 1.55,
          animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both",
        }}
      >
        75 generative art systems and 100+ pen plotter runs. Prototypes I keep loose on purpose.
      </p>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "Live";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
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

export function LabGrid({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {experiments.map((exp, i) => (
        <a
          key={exp.slug}
          href={exp.href || `/lab/${exp.slug}`}
          {...(exp.href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="group relative flex flex-col rounded-xl border p-6 transition-colors hover:border-[var(--border-hover)]"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            animation: `fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both`,
          }}
        >
          <ArrowUpRight
            size={16}
            className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-tertiary)" }}
          />
          <span
            className="text-xs font-mono uppercase tracking-[0.14em] block mb-3"
            style={{ color: "var(--accent)" }}
          >
            {exp.category}
          </span>
          <h2
            className="text-base font-semibold mb-3 pr-6"
            style={{ color: "var(--text-primary)" }}
          >
            {exp.title}
          </h2>
          <p
            className="text-sm flex-1 mb-5"
            style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
          >
            {exp.description}
          </p>
          <div>
            <StatusBadge status={exp.status} />
          </div>
        </a>
      ))}
    </div>
  );
}
