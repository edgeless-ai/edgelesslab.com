import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LabHeader, LabGrid } from "@/components/lab-client";
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

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <LabGrid experiments={experiments} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
