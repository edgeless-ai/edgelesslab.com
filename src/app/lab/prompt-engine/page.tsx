import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { PromptEngineClient } from "./prompt-engine-client";

export const metadata = createPageMetadata({
  title: "Prompt Engine",
  description:
    "Combinatorial MidJourney prompt generator. The wide engine walks 18 sentence shapes and 226 aesthetic registers with persistent coverage and per-batch repeat caps, pulling museum-artwork style refs; the classic themes let you bring your own taste. Every batch is dedup-checked against the logged round history, all client-side.",
  path: "/lab/prompt-engine",
  keywords: [
    "MidJourney prompts",
    "prompt generator",
    "generative prompts",
    "combinatorial prompt engine",
    "museum sref",
    "art direction",
    "custom prompt banks",
    "taste pack",
  ],
});

export default function PromptEnginePage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Edgeless Lab Prompt Engine",
          description:
            "Combinatorial MidJourney prompt generator with museum style-references, historical dedup, and fully customizable, weightable prompt banks.",
          url: "https://edgelesslab.com/lab/prompt-engine",
          applicationCategory: "DesignApplication",
          operatingSystem: "Any",
        }}
      />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Roll wide, filter for spread
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Prompt Engine
            </h1>
            <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              combinatorial &middot; coverage-guaranteed &middot; dedup-checked
            </span>
          </div>

          <p
            className="text-base mb-12 max-w-2xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            A combinatorial MidJourney prompt generator. The default wide engine writes each
            prompt in one of 18 sentence shapes and 226 aesthetic registers, walking every bank
            before anything repeats; or pick a classic theme and roll across its recipes. Copy
            the results straight into the imagine bar. Every batch is
            dedup-checked against a snapshot of the historical round log — plus recent
            batches saved in your browser — so you don&apos;t resubmit a prompt that already
            ran. Real museum artwork URLs ride along as style references. On the classic
            engine, open Customize to bring your own taste: add, disable, or weight entries on any axis, and export the
            result as a taste pack.
          </p>

          <PromptEngineClient />
        </div>
      </main>

      <Footer />
    </div>
  );
}
