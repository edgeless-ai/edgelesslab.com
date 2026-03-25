import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/footer";
import type { projects } from "@/lib/data";

type Project = (typeof projects)[number];

export function ProjectDetail({ project }: { project: Project }) {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": project.title,
        "description": project.longDescription,
        "applicationCategory": "DeveloperApplication",
        "author": { "@type": "Organization", "name": "Edgeless Labs", "url": "https://edgelesslab.com" },
        "url": `https://edgelesslab.com/projects/${project.slug}`,
      }} />
      <Nav />

      <main id="main-content">
        <section className="px-6 pt-32 pb-16">
          <div className="max-w-[1280px] mx-auto">
            <a
              href="/projects"
              className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white"
              style={{
                color: "var(--text-tertiary)",
                animation: "fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
              }}
            >
              <ArrowLeft size={14} /> All projects
            </a>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16">
              {/* Main content */}
              <div>
                <div
                  className="flex items-center gap-3 mb-6"
                  style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
                >
                  <span
                    className="text-xs font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    {project.category}
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
                      {project.status}
                    </span>
                  </div>
                </div>

                <h1
                  className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6"
                  style={{
                    color: "var(--text-primary)",
                    animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both",
                  }}
                >
                  {project.title}
                </h1>

                <p
                  className="text-lg font-light max-w-xl mb-10"
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both",
                  }}
                >
                  {project.longDescription}
                </p>

                {/* Code window */}
                <div
                  className="rounded-xl border overflow-hidden mb-10"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-4 py-3 border-b"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                    <span
                      className="ml-2 text-xs font-mono"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {project.slug}
                    </span>
                  </div>
                  <pre
                    className="px-4 py-4 text-[12px] leading-[1.8] font-mono whitespace-pre overflow-x-auto"
                    style={{ color: "var(--green)" }}
                  >
                    {project.snippet}
                  </pre>
                </div>

                <div
                  className="flex flex-wrap gap-2"
                  style={{ animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.25s both" }}
                >
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 text-xs font-mono rounded-md"
                      style={{
                        background: "var(--accent-muted)",
                        color: "var(--accent)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div
                className="space-y-6"
                style={{ animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.3s both" }}
              >
                {/* Stack */}
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
                    {project.stack.map((item) => (
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

                {/* Links */}
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
                    href="https://github.com/edgeless-ai"
                    className="text-[13px] hover:text-white transition-colors inline-flex items-center gap-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    GitHub <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
