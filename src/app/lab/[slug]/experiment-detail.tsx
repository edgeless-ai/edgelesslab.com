import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/footer";
import type { experiments } from "@/lib/data";

type Experiment = (typeof experiments)[number];

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  const hasLive = "href" in experiment && typeof experiment.href === "string";
  const hasRelatedProject =
    "relatedProject" in experiment &&
    experiment.relatedProject != null &&
    typeof experiment.relatedProject === "object";
  const hasStack = "stack" in experiment && Array.isArray(experiment.stack);
  const hasHighlights =
    "highlights" in experiment && Array.isArray(experiment.highlights);
  const hasLongDescription =
    "longDescription" in experiment && Array.isArray(experiment.longDescription);

  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: experiment.title,
          description: experiment.description,
          creator: {
            "@type": "Organization",
            name: "Edgeless Labs",
            url: "https://edgelesslab.com",
          },
          genre: experiment.category,
          url: `https://edgelesslab.com/lab/${experiment.slug}`,
        }}
      />
      <Nav />

      <main id="main-content">
        <section className="px-6 pt-32 pb-16">
          <div className="max-w-[1280px] mx-auto">
            <a
              href="/lab"
              className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white"
              style={{
                color: "var(--text-tertiary)",
                animation: "fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <ArrowLeft size={14} /> All experiments
            </a>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16">
              {/* Main content */}
              <div>
                {/* Category + status */}
                <div
                  className="flex items-center gap-3 mb-6"
                  style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
                >
                  <span
                    className="text-xs font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    {experiment.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--green)" }}
                    />
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {experiment.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h1
                  className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6"
                  style={{
                    color: "var(--text-primary)",
                    animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both",
                  }}
                >
                  {experiment.title}
                </h1>

                {/* Lead description */}
                <p
                  className="text-lg font-light mb-10"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both",
                  }}
                >
                  {experiment.description}
                </p>

                {/* Long description paragraphs */}
                {hasLongDescription && (
                  <div
                    className="space-y-4 mb-12"
                    style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
                  >
                    {(experiment.longDescription as string[]).map((para, i) => (
                      <p
                        key={i}
                        className="text-[15px] leading-[1.8]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {/* Highlights */}
                {hasHighlights && (
                  <div
                    className="rounded-xl border p-6 mb-10"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                      animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both",
                    }}
                  >
                    <h2
                      className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Highlights
                    </h2>
                    <ul className="space-y-3">
                      {(experiment.highlights as string[]).map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-[13px]"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <span
                            className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: "var(--accent)" }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Live link button */}
                {hasLive && (
                  <div
                    style={{ animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}
                  >
                    <a
                      href={(experiment as { href: string }).href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                        border: "1px solid rgba(129,140,248,0.2)",
                      }}
                    >
                      Try it live <ArrowUpRight size={14} />
                    </a>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div
                className="space-y-6"
                style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both" }}
              >
                {/* Stack */}
                {hasStack && (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <h2
                      className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Stack
                    </h2>
                    <ul className="space-y-2.5">
                      {(experiment.stack as string[]).map((item) => (
                        <li
                          key={item}
                          className="text-[13px] font-mono"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related project cross-link */}
                {hasRelatedProject && (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <h2
                      className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Related Project
                    </h2>
                    <Link
                      href={
                        (
                          experiment as {
                            relatedProject: { title: string; href: string };
                          }
                        ).relatedProject.href
                      }
                      className="text-[13px] hover:text-white transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {
                        (
                          experiment as {
                            relatedProject: { title: string; href: string };
                          }
                        ).relatedProject.title
                      }
                    </Link>
                  </div>
                )}

                {/* External link card for experiments with href */}
                {hasLive && (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <h2
                      className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Links
                    </h2>
                    <a
                      href={(experiment as { href: string }).href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] hover:text-white transition-colors inline-flex items-center gap-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Live demo <ArrowUpRight size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
