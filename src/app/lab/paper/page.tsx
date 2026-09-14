import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabSection } from "@/components/lab-section";
import { StatBars, type Stat } from "@/components/stat-bars";
import { LabTerminal } from "@/components/lab-terminal";
import { Reveal } from "@/components/reveal";

import "@/styles/lab-kit.css";

export const metadata: Metadata = {
  title: "Paper-brutalist — preview",
  robots: { index: false, follow: false },
};

// Placeholder figures — swap for real numbers before this ships.
const STATS: Stat[] = [
  { value: "98", label: "Plotter generators", ratio: 1.0, tone: "ink" },
  { value: "40+", label: "Field Notes", ratio: 0.55, tone: "malachite" },
  { value: "12", label: "Systems in production", ratio: 0.34, tone: "oxide" },
  { value: "6", label: "Safety hooks live", ratio: 0.22, tone: "ink" },
];

const NOTES = [
  { code: "A1", title: "Flow-field particle ecosystem", meta: "Generative / live" },
  { code: "A2", title: "Harmonograph × Lissajous", meta: "Plotter / SVG" },
  { code: "A3", title: "Tartan weave synthesizer", meta: "Generative / textile" },
];

export default function PaperBrutalistPreview() {
  return (
    <div className="field-sheet flex min-h-full flex-col" style={{ color: "var(--ink)" }}>
      <Nav />

      <main id="main-content" className="px-6 pb-24 pt-32">
        <div className="mx-auto max-w-[1280px]">
          {/* Brutalist hero */}
          <div className="lab-metadata mb-6" style={{ color: "var(--malachite)" }}>
            Edgeless Lab — Field Index / 2026
          </div>
          <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
            <div
              className="font-mono text-sm leading-none"
              style={{ color: "var(--ink-faint)" }}
            >
              01
            </div>
            <div>
              <h1
                className="brutal-head"
                style={{ fontSize: "clamp(3rem, 11vw, 10rem)", color: "var(--ink)" }}
              >
                Systems
                <br />
                that <span style={{ color: "var(--malachite)" }}>work.</span>
              </h1>
            </div>
          </div>

          <div className="print-rule my-10" style={{ color: "var(--ink-faint)" }} />

          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <p className="max-w-xl text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
              A public research studio for autonomous software, generative
              systems, and physical artifacts. Built under real constraints,
              published as it changes.
            </p>
            <div className="flex gap-6">
              <Link href="/field-notes" className="inline-flex items-center gap-2 font-mono text-xs uppercase" style={{ color: "var(--malachite)" }}>
                Field Notes <ArrowRight size={13} />
              </Link>
              <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-xs uppercase" style={{ color: "var(--ink-soft)" }}>
                Blog <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Field Notes — paper editorial index */}
          <LabSection label="Field Notes" status="INDEX / 001" tone="malachite" surface="paper" className="mt-24">
            <div className="border-t" style={{ borderColor: "var(--ink)" }}>
              {NOTES.map((note) => (
                <Reveal key={note.code}>
                  <a
                    href="/field-notes"
                    className="group grid items-baseline gap-4 border-b py-6 sm:grid-cols-[64px_1fr_auto]"
                    style={{ borderColor: "var(--paper-rule)" }}
                  >
                    <span className="font-mono text-xs" style={{ color: "var(--malachite)" }}>
                      {note.code}
                    </span>
                    <h3
                      className="brutal-head"
                      style={{ fontSize: "clamp(1.6rem, 4vw, 3rem)", color: "var(--ink)" }}
                    >
                      {note.title}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-faint)" }}>
                      {note.meta}
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </LabSection>
        </div>

        {/* Systems — dark dithered island with the terminal */}
        <div className="dither-dark mt-24 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-[1280px]">
            <LabSection label="Systems" status="LIVE" tone="accent">
              <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <Reveal>
                  <h2
                    className="brutal-head"
                    style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)", color: "var(--paper)" }}
                  >
                    Autonomous
                    <br />
                    software,
                    <br />
                    <span style={{ color: "var(--accent)" }}>running.</span>
                  </h2>
                  <p className="mt-6 max-w-md text-sm leading-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Agent infrastructure, memory, and safety hooks built in
                    production. Open the workspace and watch it work.
                  </p>
                </Reveal>
                <Reveal delay={0.1}>
                  <LabTerminal />
                </Reveal>
              </div>
            </LabSection>
          </div>
        </div>

        {/* By the numbers — paper stat bars */}
        <div className="px-6">
          <div className="mx-auto max-w-[1280px]">
            <LabSection label="By the numbers" status="FIG. 001" tone="oxide" surface="paper" className="mt-24">
              <Reveal>
                <h2
                  className="brutal-head mb-12"
                  style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)", color: "var(--ink)" }}
                >
                  The decade,
                  <br />
                  counted.
                </h2>
              </Reveal>
              <StatBars stats={STATS} surface="paper" />
            </LabSection>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
