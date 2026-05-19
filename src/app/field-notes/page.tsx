import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { fieldNotes } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Field Notes",
  description: "Research journals and interactive tools from the lab. Standalone applications documenting generative art, algorithmic music, and data visualization experiments.",
  path: "/field-notes",
  keywords: ["field notes", "generative art", "pen plotter", "algorithmic art", "data visualization"],
});

export default function FieldNotesPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <section className="px-6 pt-40 pb-16">
        <div className="max-w-[960px] mx-auto">
          <div className="mb-4">
            <span
              className="text-xs font-mono uppercase tracking-[0.14em] block mb-2"
              style={{ color: "var(--phosphor)" }}
            >
              $ ls field-notes/
            </span>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Field Notes
            </h1>
          </div>
          <p
            className="text-base font-mono max-w-[560px]"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Research journals and interactive tools from the lab. Each opens in its own standalone design system.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 flex-1">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {fieldNotes.map((note) => (
            <a
              key={note.slug}
              href={note.href}
              className="tui-border block p-6 transition-colors hover:border-[var(--border-hover)] overflow-hidden"
              data-label={note.stat}
              style={{ background: "var(--bg-surface)" }}
            >
              <h2
                className="text-lg font-semibold font-mono mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {note.title}
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
              >
                {note.description}
              </p>
              <span
                className="text-xs font-mono uppercase tracking-wider"
                style={{ color: "var(--phosphor)" }}
              >
                Open →
              </span>
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
