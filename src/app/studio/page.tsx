import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { experiments, projects } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Index",
  description:
    "One front door to everything built at Edgeless Lab — field notes, generative experiments, systems, standalone studies, and interactive notebooks.",
  path: "/studio",
  keywords: [
    "sitemap",
    "generative art",
    "creative coding",
    "interactive studies",
    "index",
  ],
});

type Entry = {
  title: string;
  href: string;
  meta?: string;
  external?: boolean;
};

const FEATURED_FIELD_NOTES: Entry[] = [
  {
    title: "Total Serialism",
    href: "/total-serialism/field-notes/",
    meta: "98 algorithms · 16 families",
    external: true,
  },
  {
    title: "Tartanism",
    href: "/tartanism/field-notes/",
    meta: "6 weaves · 48 dye colors",
    external: true,
  },
];

// Standalone microsites that live in /public and are not in any data array.
const STANDALONE_STUDIES: Entry[] = [
  { title: "Maison Hermès", href: "/maison/", meta: "Autonomous agents, bench-made", external: true },
  { title: "Scoop Scout", href: "/scoop-scout/", meta: "Kate's Ice Cream", external: true },
  { title: "Edgeless Print Studio", href: "/product-factory/", meta: "Limited-edition prints", external: true },
];

const NOTEBOOKS: Entry[] = [
  { title: "Marimo Demos", href: "/marimo-demos/", meta: "Reactive notebooks", external: true },
  { title: "Marimo × Excalidraw", href: "/marimo-excalidraw-demos/", meta: "Diagram-driven", external: true },
  { title: "MLB Data Exploration", href: "/marimo-mlb-demos/", meta: "Sports data", external: true },
  { title: "NBA Sports Demos", href: "/marimo-sports-demos/", meta: "Sports data", external: true },
  { title: "Gaussian Probability", href: "/marimo-gaussian-demo/", meta: "Interactive stat", external: true },
  { title: "Reactive Slider", href: "/marimo-reactive-slider/", meta: "Notebook primitive", external: true },
];

const EXPERIMENTS: Entry[] = experiments.map((e) => ({
  title: e.title,
  href: e.href ?? `/lab/${e.slug}`,
  meta: [e.category, e.status].filter(Boolean).join(" · "),
  external: Boolean(e.href),
}));

const SYSTEMS: Entry[] = projects.map((p) => ({
  title: p.title,
  href: `/projects/${p.slug}`,
  meta: p.tags?.slice(0, 2).join(" · "),
}));

function Group({ label, blurb, entries }: { label: string; blurb: string; entries: Entry[] }) {
  return (
    <section className="border-t py-10 sm:py-14" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="mb-7 max-w-2xl">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {label}
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {blurb}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              prefetch={false}
              {...(entry.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="group flex h-full items-start justify-between gap-4 rounded-md border p-5 transition-colors"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}
            >
              <div>
                <div className="text-[15px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {entry.title}
                </div>
                {entry.meta && (
                  <div
                    className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {entry.meta}
                  </div>
                )}
              </div>
              <ArrowUpRight
                aria-hidden="true"
                size={16}
                className="mt-0.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ color: "var(--accent)" }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function IndexPage() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content" className="mx-auto w-full max-w-[1280px] px-6 pb-24 pt-40">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Edgeless Lab — Index",
            description:
              "One front door to everything built at Edgeless Lab — field notes, experiments, systems, standalone studies, and notebooks.",
            url: "https://edgelesslab.com/studio/",
          }}
        />

        <header className="mb-6 max-w-3xl">
          <div
            className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--accent)" }}
          >
            Edgeless Lab / everything
          </div>
          <h1
            className="text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Index.
          </h1>
          <p className="mt-5 text-base leading-7" style={{ color: "var(--text-secondary)" }}>
            Every built thing, in one place. Long-form field notes, generative
            experiments, shipped systems, standalone studies, and interactive
            notebooks — no more hunting through the archive.
          </p>
        </header>

        <Group
          label="Field Notes"
          blurb="Long-form studies with their own microsites. The complete accounts."
          entries={FEATURED_FIELD_NOTES}
        />
        <Group
          label="Experiments"
          blurb="Generative systems, data visualizations, and agent interfaces from the Lab."
          entries={EXPERIMENTS}
        />
        <Group
          label="Systems"
          blurb="Shipped infrastructure and the projects behind it."
          entries={SYSTEMS}
        />
        <Group
          label="Standalone studies"
          blurb="Self-contained microsites built as one-off explorations."
          entries={STANDALONE_STUDIES}
        />
        <Group
          label="Notebooks"
          blurb="Reactive Marimo notebooks — interactive data and math."
          entries={NOTEBOOKS}
        />
      </main>

      <Footer />
    </div>
  );
}
