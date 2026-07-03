import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { creativeDemos } from "@/lib/creative-demos";
import { DemoPreview } from "@/components/demo-preview";
import Link from "next/link";

export const metadata = createPageMetadata({
  title: "Creative",
  description:
    "Interactive generative art demos, creative coding experiments, and p5.js explorations from Edgeless Lab.",
  path: "/creative",
  keywords: [
    "generative art",
    "creative coding",
    "p5.js",
    "interactive demos",
    "web art",
  ],
});

export default function CreativePage() {
  // Sort by date descending
  const sorted = [...creativeDemos].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Extract all tags
  const allTags = Array.from(new Set(sorted.flatMap((d) => d.tags)));

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Edgeless Lab Creative",
          description: "Interactive generative art demos and creative coding experiments.",
          url: "https://edgelesslab.com/creative",
          numberOfItems: sorted.length,
          itemListElement: sorted.map((demo, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: demo.title,
            url: `https://edgelesslab.com/creative-demos/${demo.slug}/`,
          })),
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
              Interactive experiments
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Creative
            </h1>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {sorted.length} demos &middot; p5.js, Canvas 2D, WebGL
            </span>
          </div>

          <p
            className="text-base mb-12 max-w-xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            Generative art, interactive typography, physics simulations, and creative coding experiments. 
            Each demo is a standalone HTML file — no build step required. Open, explore, remix.
          </p>

          {/* Tags */}
          <div className="mb-10 flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 text-xs font-mono rounded-md border"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((demo) => (
              <DemoCard key={demo.slug} demo={demo} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DemoCard({ demo }: { demo: (typeof creativeDemos)[0] }) {
  return (
    <Link
      href={`/creative-demos/${demo.slug}/`}
      className="group block rounded-lg border p-4 transition-all hover:border-[var(--border-hover)]"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <DemoPreview slug={demo.slug} title={demo.title} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3
          className="text-[15px] font-medium leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {demo.title}
        </h3>
        {demo.hasControls && (
          <span
            className="shrink-0 px-2 py-0.5 text-[10px] font-mono rounded border"
            style={{
              borderColor: "var(--accent-muted)",
              color: "var(--accent)",
            }}
          >
            controls
          </span>
        )}
      </div>

      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
      >
        {demo.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {demo.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] font-mono rounded"
              style={{
                background: "var(--accent-muted)",
                color: "var(--accent)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <span
          className="text-[10px] font-mono"
          style={{ color: "var(--text-tertiary)" }}
        >
          {new Date(demo.date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </Link>
  );
}
