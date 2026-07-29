import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Project {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  status: string;
  snippet: string;
}

const OUTCOMES: Record<string, string> = {
  "safety-hooks": "Dangerous operations are stopped before execution.",
  "mcp-servers": "Agents reach knowledge and tools through one protocol layer.",
  "pen-plotter-art": "Generative studies move from browser canvas to plottable SVG.",
  "mastra-orchestrator": "Specialist agents receive work through explicit routing rules.",
  "knowledge-api": "Stored research becomes queryable context instead of a dead archive.",
  "llm-client": "Model providers can fail without taking the calling system down.",
};

export function ProjectsHeader() {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
      <div>
        <div className="lab-metadata mb-5 flex items-center gap-3" style={{ color: "var(--relay)" }}>
          <span className="h-2 w-2" style={{ background: "var(--relay)" }} />
          Systems / case studies
        </div>
        <h1 className="text-[clamp(3.5rem,8vw,7rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
          Systems
        </h1>
      </div>
      <div className="max-w-2xl lg:pb-2">
        <p className="text-xl leading-8" style={{ color: "var(--text-primary)" }}>
          Production tools built to keep working after the first clean demo.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          Each case study starts with the constraint, shows the system that
          answered it, and records what changed once real failures appeared.
        </p>
      </div>
    </div>
  );
}

export function ProjectsGrid({ projects }: { projects: Project[] }) {
  return (
    <div
      className="grid gap-px border md:grid-cols-2"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--border-subtle)",
      }}
    >
      {projects.map((project) => (
        <Link
          key={project.slug}
          href={`/projects/${project.slug}`}
          className="group flex min-h-[330px] flex-col p-6 sm:p-8"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="lab-metadata" style={{ color: "var(--relay)" }}>
              {project.tags[0] || "System"}
            </span>
            <span className="lab-metadata" style={{ color: "var(--accent)" }}>
              {project.status}
            </span>
          </div>

          <h2 className="mt-10 text-3xl font-semibold tracking-[-0.025em]">
            {project.title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {project.description}
          </p>

          <div className="mt-7 border-l pl-4" style={{ borderColor: "var(--relay)" }}>
            <div className="lab-metadata mb-2" style={{ color: "var(--text-tertiary)" }}>
              Outcome
            </div>
            <p className="text-sm leading-6">
              {OUTCOMES[project.slug] || "The working implementation and its operating constraints are documented in the case study."}
            </p>
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 pt-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
              {project.tags.slice(0, 3).join(" / ")}
            </span>
            <ArrowRight
              size={16}
              className="shrink-0 transition-transform group-hover:translate-x-1"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
