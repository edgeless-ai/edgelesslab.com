import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import SwarmSpecimenEmbed from "./SwarmSpecimenEmbed";

export const metadata = createPageMetadata({
  title: "Swarm Specimen",
  description:
    "An interactive field notebook: assemble a tiny autonomous-agent ecology, run a deterministic in-browser simulation, and watch coordination emerge — or collapse. Built on tldraw. Every specimen is reproducible from its seed.",
  path: "/lab/swarm-specimen",
  keywords: [
    "agent simulation",
    "swarm",
    "tldraw",
    "interactive canvas",
    "autonomous agents",
    "generative systems",
    "in-browser simulation",
  ],
});

export default function SwarmSpecimenPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Swarm Specimen",
          applicationCategory: "Simulation",
          operatingSystem: "Web",
          description:
            "Interactive, deterministic autonomous-agent ecology simulation running entirely in the browser, built on tldraw.",
          url: "https://edgelesslab.com/lab/swarm-specimen",
        }}
      />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Interactive · deterministic · runs in your browser
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Swarm Specimen
            </h1>
            <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              tldraw · seed-reproducible
            </span>
          </div>

          <p
            className="max-w-[68ch] text-base leading-relaxed mb-8"
            style={{ color: "var(--text-secondary, var(--text-tertiary))" }}
          >
            We build autonomous agent swarms for a living. This is one, miniaturized and put under
            glass: a handful of agents, a beacon they&rsquo;re trying to reach, and a few finite
            resources between them and it. Place a few agents, press <strong>Run</strong>, and watch
            an ecology try to coordinate before it burns out. It&rsquo;s deterministic — the same
            seed always produces the same run — so every specimen you make is a shareable, exact
            artifact. The field note writes its own postmortem.
          </p>

          <SwarmSpecimenEmbed />

          <p className="mt-6 text-xs font-mono max-w-[68ch] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
            Agents seek the beacon; when their energy runs low they break for a resource node. Blue
            explorers wander, violet optimizers beeline, green caretakers share energy with failing
            neighbours, orange opportunists take what they can. Coordination &ldquo;emerges&rdquo;
            when a majority converge on the beacon — but the ecology rarely all makes it. Export a
            specimen, or share its seed.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
