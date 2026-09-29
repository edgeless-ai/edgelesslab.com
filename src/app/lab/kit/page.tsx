import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabSection } from "@/components/lab-section";
import { StatBars, type Stat } from "@/components/stat-bars";
import { LabTerminal } from "@/components/lab-terminal";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Lab Kit — preview",
  robots: { index: false, follow: false },
};

// Placeholder figures — swap for real numbers before this ships.
const STATS: Stat[] = [
  { value: "98", label: "Plotter generators", ratio: 1.0 },
  { value: "40+", label: "Field Notes", ratio: 0.55, tone: "malachite" },
  { value: "12", label: "Systems in production", ratio: 0.34 },
  { value: "6", label: "Safety hooks live", ratio: 0.22, tone: "malachite" },
];

export default function LabKitPreview() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />
      <main id="main-content" className="px-6 pb-24 pt-32">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-24">
          <div>
            <div className="lab-metadata mb-4" style={{ color: "var(--accent)" }}>
              Internal / design kit preview
            </div>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
              Borrowed motifs,
              <br />
              in Edgeless language.
            </h1>
          </div>

          {/* 1 — Interactive terminal inside a framed section */}
          <LabSection label="Workspace" status="LIVE" tone="accent">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <Reveal>
                <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                  Watch the lab work.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  A guided terminal that opens a workspace, runs a generative
                  system, and reports back. It keeps running without you.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <LabTerminal />
              </Reveal>
            </div>
          </LabSection>

          {/* 2 — Hatched stat bars */}
          <LabSection label="By the numbers" status="FIG. 001" tone="relay">
            <Reveal>
              <h2 className="mb-10 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                The decade, counted.
              </h2>
            </Reveal>
            <StatBars stats={STATS} />
          </LabSection>

          {/* 3 — Section chrome on the paper (field sheet) theme */}
          <div className="field-sheet -mx-6 px-6 py-16">
            <div className="mx-auto max-w-[1280px]">
              <LabSection label="Field Sheet" status="PAPER MODE" tone="malachite">
                <Reveal>
                  <h2 className="font-editorial text-4xl leading-[0.95] sm:text-6xl" style={{ color: "var(--ink)" }}>
                    Same chrome,
                    <br />
                    printed on paper.
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                    The pill, the hairline, and the corner tick all re-tone for
                    the warm field-sheet ground without new colors.
                  </p>
                </Reveal>
              </LabSection>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
