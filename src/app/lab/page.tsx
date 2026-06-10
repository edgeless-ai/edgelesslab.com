import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabHeader, LabGrid } from "@/components/lab-client";
import { LazyLabPlayground, LazyAttractorPlayground, LazyASCIIArtGenerator } from "@/components/lazy-playground-wrapper";
import { experiments } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";
import { ArrowUpRight, AudioLines } from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata({
  title: "Lab Experiments",
  description: "Generative systems, data visualizations, and agent interfaces. Prototypes at the edge of what ships.",
  path: "/lab",
  keywords: ["generative art", "AI experiments", "data visualization", "creative coding"],
});

export default function LabPage() {
  const gridExperiments = experiments.filter((experiment) => experiment.slug !== "chladni-visualizer");

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-40 pb-16">
        <div className="max-w-[1280px] mx-auto">
          <LabHeader />
        </div>
      </section>

      {/* Interactive Playgrounds */}
      <section className="px-6 pb-12 space-y-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-6">
            <span
              className="text-xs font-mono uppercase tracking-[0.14em] block mb-2"
              style={{ color: "var(--accent)" }}
            >
              Interactive
            </span>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Try It Live
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Link
              href="/lab/chladni-visualizer"
              className="group relative flex h-[320px] flex-col justify-between overflow-hidden rounded-lg border p-6 transition-colors hover:border-white/20"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-24 opacity-70"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, rgba(129,140,248,0.12) 0 1px, transparent 1px 8px), radial-gradient(circle at 20% 40%, rgba(129,140,248,0.45), transparent 26%), radial-gradient(circle at 74% 55%, rgba(52,211,153,0.32), transparent 24%)",
                }}
              />
              <div>
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                  style={{ background: "var(--accent-ghost)" }}
                >
                  <AudioLines className="h-5 w-5" style={{ color: "var(--accent)" }} />
                </div>
                <span
                  className="mb-3 block text-xs font-mono uppercase tracking-[0.14em]"
                  style={{ color: "var(--accent)" }}
                >
                  Audio Visual
                </span>
                <h3 className="mb-3 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Chladni Visualizer
                </h3>
                <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  Drop in audio, scrub to a section, tune resonant modes, save presets, and export a plate study.
                </p>
              </div>
              <span className="relative inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                Open visualizer <ArrowUpRight size={14} />
              </span>
            </Link>
            <LazyLabPlayground />
            <LazyAttractorPlayground />
            <LazyASCIIArtGenerator />
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <LabGrid experiments={gridExperiments} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
