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
            numberOfItems: notes.length,
            itemListElement: notes.map((note, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: note.title,
              url: `https://edgelesslab.com/creative-demos/${note.slug}/`,
            })),
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
          <FieldNotesGallery notes={notes} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
