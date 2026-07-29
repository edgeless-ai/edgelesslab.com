import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DemoPreview } from "@/components/demo-preview";
import { FeaturedArtifact } from "@/components/featured-artifact";
import { posts } from "@/lib/blog";
import { projects } from "@/lib/data";
import { getFieldNotes } from "@/lib/field-notes.server";

const FIELD_NOTE_SLUGS = [
  "flow-field-particle-ecosystem",
  "harmonograph-lissajous",
  "tartan-weave-synth",
];

const PROJECT_SLUGS = ["safety-hooks", "mcp-servers", "pen-plotter-art"];

const PROJECT_OUTCOMES: Record<string, string> = {
  "safety-hooks": "Destructive operations stopped before execution",
  "mcp-servers": "One protocol layer across knowledge, tools, and agents",
  "pen-plotter-art": "98 plotter-ready generators from screen to SVG",
};

export default function Home() {
  const fieldNotes = getFieldNotes();
  const featuredNotes = FIELD_NOTE_SLUGS.map((slug) =>
    fieldNotes.find((note) => note.slug === slug)
  ).filter((note): note is NonNullable<typeof note> => Boolean(note));
  const recentPosts = [...posts]
    .filter((post) => post.editorial || !post.isLaunch)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const featuredProjects = PROJECT_SLUGS.map((slug) =>
    projects.find((project) => project.slug === slug)
  ).filter((project): project is NonNullable<typeof project> => Boolean(project));
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content">
        <section className="relative overflow-hidden px-6 pb-16 pt-32 sm:pb-24 sm:pt-40">
          <div className="mx-auto grid max-w-[1280px] gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <div className="lab-metadata mb-7 flex items-center gap-3" style={{ color: "var(--accent)" }}>
                <span className="h-2 w-2" style={{ background: "var(--accent)" }} />
                Public research studio / live
              </div>

              <h1 className="max-w-3xl text-[clamp(3.65rem,7vw,7.2rem)] font-semibold leading-[0.86] tracking-[-0.055em]">
                Systems that
                <br />
                work.
                <br />
                <span className="font-editorial font-normal italic" style={{ color: "var(--accent)" }}>
                  Studies that
                  <br />
                  show why.
                </span>
              </h1>

              <p
                className="mt-8 max-w-xl text-base leading-7 sm:text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Edgeless Lab is a public research studio for autonomous
                software, generative systems, and physical artifacts. I build
                under real constraints, publish how the work changes, and turn
                the strongest results into useful tools and editions.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/field-notes"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm px-5 text-sm font-medium transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
                >
                  Explore Field Notes <ArrowRight size={15} />
                </Link>
                <Link
                  href="/blog"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border px-5 text-sm font-medium transition-colors hover:text-white"
                  style={{
                    borderColor: "var(--border-focus)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Read the Blog <ArrowRight size={15} />
                </Link>
                <Link
                  href="/services/private-ai-systems"
                  className="inline-flex min-h-11 items-center gap-2 px-2 text-sm transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Work with David <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <FeaturedArtifact />
          </div>
        </section>

        <section className="px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-end">
              <div>
                <div className="lab-metadata mb-4" style={{ color: "var(--accent)" }}>
                  Field Notes / selected studies
                </div>
                <h2 className="font-editorial text-5xl leading-[0.95] sm:text-7xl">
                  Start with
                  <br />
                  the evidence.
                </h2>
              </div>
              <div>
                <p className="max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  Three working studies, selected because each exposes the
                  behavior behind the image. Open one, hide the controls, and
                  inspect the system directly.
                </p>
                <Link href="/field-notes" className="mt-5 inline-flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
                  Browse the full archive <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="grid gap-px border md:grid-cols-3" style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}>
              {featuredNotes.map((note) => (
                <a
                  key={note.slug}
                  href={`/creative-demos/${note.slug}/`}
                  className="group p-4 sm:p-5"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <DemoPreview slug={note.slug} title={note.title} />
                  <div className="lab-metadata mb-2" style={{ color: "var(--accent)" }}>
                    {note.category}
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-editorial text-2xl leading-tight">{note.title}</h3>
                    <ArrowUpRight size={16} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="field-sheet px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <div className="lab-metadata mb-5" style={{ color: "var(--malachite)" }}>
                  Blog / recent reports
                </div>
                <h2 className="font-editorial text-5xl leading-[0.95] sm:text-7xl">
                  Publish the
                  <br />
                  method, not
                  <br />
                  just the result.
                </h2>
                <p className="mt-6 max-w-md text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                  Reports, tutorials, and postmortems about agent systems,
                  knowledge infrastructure, recovery work, and what changes
                  after a system meets reality.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-xs uppercase" style={{ color: "var(--malachite)" }}>
                    All posts <ArrowRight size={13} />
                  </Link>
                  <Link href="/feed.xml" className="inline-flex items-center gap-2 font-mono text-xs uppercase" style={{ color: "var(--ink-soft)" }}>
                    RSS feed <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>

              <div className="border-t" style={{ borderColor: "var(--ink)" }}>
                {recentPosts.map((post, index) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group grid gap-4 border-b py-6 sm:grid-cols-[48px_1fr_auto] sm:items-start"
                    style={{ borderColor: "var(--paper-rule)" }}
                  >
                    <span className="font-mono text-xs" style={{ color: "var(--malachite)" }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-editorial text-2xl leading-tight sm:text-3xl">
                        {post.title}
                      </h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: "var(--ink-soft)" }}>
                        {post.description}
                      </p>
                      <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--ink-faint)" }}>
                        {post.date} / {post.readTime}
                      </div>
                    </div>
                    <ArrowRight size={16} className="hidden transition-transform group-hover:translate-x-1 sm:block" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="lab-metadata mb-4" style={{ color: "var(--relay)" }}>
                  Systems / selected case studies
                </div>
                <h2 className="text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
                  Evidence from difficult builds.
                </h2>
              </div>
              <Link href="/projects" className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                All systems <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid gap-px border md:grid-cols-3" style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}>
              {featuredProjects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group flex min-h-[280px] flex-col p-6"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="lab-metadata" style={{ color: "var(--relay)" }}>
                      {project.category}
                    </span>
                    <span className="lab-metadata" style={{ color: "var(--accent)" }}>
                      {project.status}
                    </span>
                  </div>
                  <h3 className="mt-10 text-2xl font-semibold">{project.title}</h3>
                  <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    {project.description}
                  </p>
                  <p
                    className="mt-5 border-l pl-3 text-sm font-medium leading-6"
                    style={{
                      borderColor: "var(--relay)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {PROJECT_OUTCOMES[project.slug]}
                  </p>
                  <div className="mt-auto flex items-end justify-between pt-8">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
                      {project.tags.slice(0, 2).join(" / ")}
                    </span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-px grid gap-px border md:grid-cols-[1.3fr_0.7fr]" style={{ borderColor: "var(--border-subtle)", background: "var(--border-subtle)" }}>
              <div className="p-6 sm:p-8" style={{ background: "var(--bg-base)" }}>
                <div className="lab-metadata mb-4" style={{ color: "var(--accent)" }}>
                  Available for difficult builds
                </div>
                <p className="font-editorial max-w-3xl text-3xl leading-tight sm:text-5xl">
                  Need this kind of thinking inside your team?
                </p>
              </div>
              <Link
                href="/services/private-ai-systems"
                className="group flex items-center justify-between p-6 sm:p-8"
                style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
              >
                <span className="text-lg font-medium">Work with David</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t px-6 py-16" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="mx-auto grid max-w-[1280px] gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="lab-metadata mb-3" style={{ color: "var(--text-tertiary)" }}>
                Shop / editions from the lab
              </div>
              <h2 className="font-editorial text-3xl sm:text-5xl" style={{ color: "var(--oxide)" }}>
                Art first. The object comes second.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                Prints, garments, and editions should begin with a real Field
                Note or generative system, with the physical product chosen to
                serve the work.
              </p>
            </div>
            <a
              href="https://shop.edgelesslab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border px-6 text-sm"
              style={{ borderColor: "var(--border-focus)", color: "var(--text-primary)" }}
            >
              Visit the shop <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
