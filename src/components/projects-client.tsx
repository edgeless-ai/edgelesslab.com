import { ArrowUpRight } from "lucide-react";
import { GlowingCard } from "@/components/ui/glowing-card";

interface Project {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  status: string;
  snippet: string;
}

export function ProjectsHeader() {
  return (
    <>
      <div
        className="inline-flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border"
        style={{
          borderColor: "rgba(52, 211, 153, 0.25)",
          background: "rgba(52, 211, 153, 0.06)",
          animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
            style={{ background: "var(--green)" }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: "var(--green)" }}
          />
        </span>
        <span
          className="text-[11px] font-mono uppercase tracking-[0.14em]"
          style={{ color: "var(--green)" }}
        >
          Running now
        </span>
      </div>

      <h1
        className="text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.92] tracking-[-0.035em]"
        style={{
          color: "var(--text-primary)",
          animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.08s both",
        }}
      >
        Projects
      </h1>

      <p
        className="mt-5 text-lg max-w-xl font-light"
        style={{
          color: "var(--text-secondary)",
          lineHeight: 1.55,
          animation: "fadeInUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.18s both",
        }}
      >
        Four always-on services on one Hetzner box. Hooks guard, Hermes assists, pm2 managed, zero restarts.
      </p>
    </>
  );
}

export function ProjectsGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project, i) => (
        <div
          key={project.slug}
          style={{
            animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s both`,
          }}
        >
          <GlowingCard href={`/projects/${project.slug}`} className="h-full">
            <div
              className="w-full rounded-lg mb-6 overflow-hidden"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="flex items-center gap-1.5 px-3 py-2.5 border-b"
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
                className="px-3 py-3 text-xs leading-[1.7] font-mono whitespace-pre overflow-hidden min-h-[80px]"
                style={{ color: "var(--green)" }}
              >
                {project.snippet}
              </pre>
            </div>

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {project.title}
                  </h2>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                    style={{
                      background: "var(--green-muted)",
                      color: "var(--green)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--green)" }}
                    />
                    {project.status}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                >
                  {project.description}
                </p>
              </div>
              <ArrowUpRight
                size={16}
                className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-mono rounded-md"
                  style={{
                    background: "var(--accent-muted)",
                    color: "var(--accent)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </GlowingCard>
        </div>
      ))}
    </div>
  );
}
