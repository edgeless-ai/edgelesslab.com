import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabHeader, LabGrid } from "@/components/lab-client";
import { LazyLabPlayground, LazyAttractorPlayground, LazyASCIIArtGenerator } from "@/components/lazy-playground-wrapper";
import { experiments } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Lab Experiments",
  description: "Generative systems, data visualizations, and agent interfaces. Prototypes at the edge of what ships.",
  path: "/lab",
  keywords: ["generative art", "AI experiments", "data visualization", "creative coding"],
});

export default function LabPage() {
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
            <LazyLabPlayground />
            <LazyAttractorPlayground />
            <LazyASCIIArtGenerator />
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <LabGrid experiments={experiments} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
