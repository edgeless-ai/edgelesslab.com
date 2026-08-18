import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { PromptEngineClient } from "./prompt-engine-client";

export const metadata = createPageMetadata({
  title: "Prompt Engine",
  description:
    "Combinatorial MidJourney prompt generator — roll wide across themed recipe banks, museum-artwork style refs, coverage-guaranteed picks, and a dedup check against the logged round history.",
  path: "/lab/prompt-engine",
  keywords: [
    "MidJourney prompts",
    "prompt generator",
    "generative prompts",
    "combinatorial prompt engine",
    "museum sref",
    "art direction",
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
            "Combinatorial MidJourney prompt generator with museum style-references and historical dedup.",
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
            A combinatorial MidJourney prompt generator. Pick a theme, roll a wide batch across
            its recipes, and copy the results straight into the imagine bar. Every batch is
            dedup-checked against a snapshot of the historical round log — plus recent
            batches saved in your browser — so you don&apos;t resubmit a prompt that already
            ran. Museum themes pull real artwork URLs as style references.
          </p>

          <PromptEngineClient />
        </div>
      </main>

      <Footer />
    </div>
  );
}
