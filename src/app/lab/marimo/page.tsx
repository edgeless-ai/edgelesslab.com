import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { createPageMetadata } from "@/lib/metadata";
import { publishedMarimoDemos, marimoCategories, type PublishedMarimoDemo } from "@/lib/marimo-demos";
import { MarimoPreview } from "@/components/marimo-preview";

export const metadata = createPageMetadata({
  title: "Marimo",
  description:
    "Verified published interactive Python notebooks running in the browser — mathematics, AI evaluation, and research demos from Edgeless Lab.",
  path: "/lab/marimo",
  keywords: [
    "marimo",
    "reactive notebooks",
    "Python WASM",
    "Pyodide",
    "interactive demos",
    "research demos",
  ],
});

export default function MarimoPage() {
  const allTags = Array.from(new Set(publishedMarimoDemos.flatMap((d) => d.tags)));

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Edgeless Lab Marimo",
          description:
            "Verified published interactive Python notebooks running on Pyodide and WASM.",
          url: "https://edgelesslab.com/lab/marimo",
          numberOfItems: publishedMarimoDemos.length,
          itemListElement: publishedMarimoDemos.map((demo, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: demo.title,
            url: demo.published_url,
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
              Reactive Python, compiled to WASM
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Marimo
            </h1>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {publishedMarimoDemos.length} published notebooks &middot; Pyodide, WASM
            </span>
          </div>

          <p
            className="text-base mb-12 max-w-xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            Published interactive Python notebooks, verified live in your browser.
            These standalone marimo apps run on Pyodide and WASM without a Python server.
            Unpublished and legacy notebooks are omitted until their live URLs are verified.
          </p>

          {/* Tags */}
          <div className="mb-14 flex flex-wrap gap-2">
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

          {/* Grouped by category */}
          {marimoCategories.map((category) => {
            const demos = publishedMarimoDemos.filter((d) => d.category === category);
            if (demos.length === 0) return null;
            return (
              <section key={category} className="mb-14">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {category}
                  </h2>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {demos.length} {demos.length === 1 ? "demo" : "demos"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {demos.map((demo) => (
                    <DemoCard key={demo.slug} demo={demo} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DemoCard({ demo }: { demo: PublishedMarimoDemo }) {
  return (
    <a
      href={demo.published_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border p-4 transition-all hover:border-[var(--border-hover)]"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <MarimoPreview slug={demo.slug} title={demo.title} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3
          className="text-[15px] font-medium leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {demo.title}
        </h3>
      </div>

      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
      >
        {demo.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {demo.tags.slice(0, 3).map((tag) => (
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
    </a>
  );
}
