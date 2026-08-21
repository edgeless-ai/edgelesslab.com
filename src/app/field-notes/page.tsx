import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { FieldNotesGallery } from "@/components/field-notes-gallery";
import { getFieldNotes } from "@/lib/field-notes.server";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Field Notes",
  description:
    "Interactive studies, cited science plots, generative systems, and visual research from Edgeless Lab.",
  path: "/field-notes",
  keywords: [
    "generative art",
    "scientific visualization",
    "creative coding",
    "interactive studies",
    "pen plotter",
  ],
});

export default function FieldNotesPage() {
  const notes = getFieldNotes();

  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content" className="field-sheet pt-28 sm:pt-32">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Edgeless Lab Field Notes",
            description:
              "Interactive studies, cited science plots, generative systems, and visual research.",
            url: "https://edgelesslab.com/field-notes",
            numberOfItems: notes.length + 2,
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Total Serialism: Field Notes on Algorithmic Constraint",
                url: "https://edgelesslab.com/total-serialism/field-notes/index.html",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Tartanism: Field Notes on Generative Plaid",
                url: "https://edgelesslab.com/tartanism/field-notes/index.html",
              },
              ...notes.map((note, index) => ({
                "@type": "ListItem",
                position: index + 3,
                name: note.title,
                url: `https://edgelesslab.com/creative-demos/${note.slug}/`,
              })),
            ],
          }}
        />

        <header className="mx-auto max-w-[1280px] px-6 pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="lab-metadata mb-6" style={{ color: "var(--malachite)" }}>
                Edgeless Lab / research archive
              </div>
              <h1 className="font-editorial max-w-4xl text-[clamp(4.5rem,12vw,10rem)] leading-[0.78] tracking-[-0.055em]">
                Field
                <br />
                <em className="font-normal" style={{ color: "var(--malachite)" }}>
                  notes.
                </em>
              </h1>
            </div>

            <div className="border-l pl-5 sm:pl-7" style={{ borderColor: "var(--malachite)" }}>
              <p className="font-editorial text-2xl leading-tight sm:text-3xl">
                Where science meets algorithmic art.
              </p>
              <p className="mt-5 max-w-lg text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                Live studies in code, scientific pattern, typography, agent behavior,
                plotting, and generative form. Open one, change it, and see what the
                system knows.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-px border" style={{ borderColor: "var(--ink)" }}>
                <div className="p-3" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                  <div className="font-editorial text-3xl">{notes.length}</div>
                  <div className="lab-metadata mt-1">Studies</div>
                </div>
                <div className="p-3">
                  <div className="font-editorial text-3xl">Live</div>
                  <div className="lab-metadata mt-1">In browser</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1280px] pb-20">
          <section className="border-y" style={{ borderColor: "var(--ink)" }}>
            <a
              href="/total-serialism/field-notes/index.html"
              className="group grid lg:grid-cols-[1.15fr_0.85fr]"
            >
              <div
                className="relative min-h-[300px] overflow-hidden border-b lg:min-h-[440px] lg:border-b-0 lg:border-r"
                style={{ borderColor: "var(--ink)", background: "var(--ink)" }}
              >
                <Image
                  src="/total-serialism/field-notes/assets/og-image.png"
                  alt="Total Serialism pen plotter specimens arranged as an algorithmic field study"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>

              <div
                className="flex flex-col justify-between p-6 sm:p-9 lg:p-10"
                style={{ background: "var(--paper-deep)", color: "var(--ink)" }}
              >
                <div>
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: "var(--malachite)" }}
                  >
                    Long-form field note / May 2026
                  </div>
                  <h2 className="mt-7 font-editorial text-5xl leading-[0.92] tracking-[-0.035em] sm:text-6xl">
                    Total
                    <br />
                    <em className="font-normal">Serialism.</em>
                  </h2>
                  <p className="mt-7 max-w-lg text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                    Ninety-eight algorithmic art generators, sixteen families,
                    and one physical constraint: a pen on paper. The complete
                    account of the system, its visual lineage, its failures,
                    and the specimens that survived.
                  </p>
                </div>

                <div className="mt-10">
                  <div
                    className="grid grid-cols-3 gap-px border"
                    style={{ borderColor: "var(--ink)" }}
                  >
                    {[
                      ["98", "Algorithms"],
                      ["16", "Families"],
                      ["1", "Constraint"],
                    ].map(([value, label]) => (
                      <div key={label} className="p-3 sm:p-4">
                        <div className="font-editorial text-3xl">{value}</div>
                        <div className="lab-metadata mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="font-mono text-xs uppercase tracking-[0.1em]">
                      Read the original Field Note
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      size={20}
                      className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: "var(--malachite)" }}
                    />
                  </div>
                </div>
              </div>
            </a>
          </section>

          <section className="border-b" style={{ borderColor: "var(--ink)" }}>
            <a
              href="/tartanism/field-notes/index.html"
              className="group grid lg:grid-cols-[0.85fr_1.15fr]"
            >
              <div
                className="flex flex-col justify-between p-6 sm:p-9 lg:p-10 lg:order-1 order-2"
                style={{ background: "var(--paper-deep)", color: "var(--ink)" }}
              >
                <div>
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: "var(--malachite)" }}
                  >
                    Long-form field note / generative plaid
                  </div>
                  <h2 className="mt-7 font-editorial text-5xl leading-[0.92] tracking-[-0.035em] sm:text-6xl">
                    Tartan
                    <br />
                    <em className="font-normal">ism.</em>
                  </h2>
                  <p className="mt-7 max-w-lg text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                    Six weave structures, forty-eight period-correct dye colors,
                    and a mutation engine that walks the line between generated
                    plaid and authentic Scottish tartan. Where does a threadcount
                    stop being a pattern and start being a clan?
                  </p>
                </div>

                <div className="mt-10">
                  <div
                    className="grid grid-cols-3 gap-px border"
                    style={{ borderColor: "var(--ink)" }}
                  >
                    {[
                      ["6", "Weaves"],
                      ["48", "Dye colors"],
                      ["1", "Mutation engine"],
                    ].map(([value, label]) => (
                      <div key={label} className="p-3 sm:p-4">
                        <div className="font-editorial text-3xl">{value}</div>
                        <div className="lab-metadata mt-1">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <span className="font-mono text-xs uppercase tracking-[0.1em]">
                      Read the field note &middot; open the plaid maker
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      size={20}
                      className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: "var(--malachite)" }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="relative min-h-[300px] overflow-hidden border-b lg:order-2 order-1 lg:min-h-[440px] lg:border-b-0 lg:border-l"
                style={{ borderColor: "var(--ink)", background: "var(--ink)" }}
              >
                <Image
                  src="/tartanism/field-notes/assets/og-image.png"
                  alt="Generative tartan specimens arranged as a plaid field study"
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                />
              </div>
            </a>
          </section>

          <FieldNotesGallery notes={notes} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
