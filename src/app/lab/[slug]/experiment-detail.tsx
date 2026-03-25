import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/footer";
import type { experiments } from "@/lib/data";

type Experiment = (typeof experiments)[number];

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": experiment.title,
        "description": experiment.description,
        "creator": { "@type": "Organization", "name": "Edgeless Labs", "url": "https://edgelesslab.com" },
        "genre": experiment.category,
        "url": `https://edgelesslab.com/lab/${experiment.slug}`,
      }} />
      <Nav />

      <section className="px-6 pt-32 pb-16">
        <div className="max-w-[768px] mx-auto">
          <a
            href="/lab"
            className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white"
            style={{
              color: "var(--text-tertiary)",
              animation: "fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
            }}
          >
            <ArrowLeft size={14} /> All experiments
          </a>

          <div
            className="flex items-center gap-3 mb-6"
            style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <span
              className="text-xs font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {experiment.category}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {experiment.status}
              </span>
            </div>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6"
            style={{
              color: "var(--text-primary)",
              animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both",
            }}
          >
            {experiment.title}
          </h1>

          <p
            className="text-lg font-light mb-12"
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both",
            }}
          >
            {experiment.description}
          </p>

          {/* Placeholder for future media/visuals */}
          <div
            className="w-full aspect-video rounded-xl border mb-12"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both",
            }}
          >
            <div className="flex items-center justify-center h-full">
              <span
                className="text-sm font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                Visual documentation coming soon
              </span>
            </div>
          </div>

          <a
            href="/lab"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white"
            style={{
              color: "var(--accent)",
              animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.3s both",
            }}
          >
            <ArrowLeft size={14} /> Back to Lab
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
