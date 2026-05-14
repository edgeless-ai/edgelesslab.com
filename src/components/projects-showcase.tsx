"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, RefreshCw, GitBranch, GitCommit, Activity } from "lucide-react";
import { GlowingCard } from "@/components/ui/glowing-card";
import { AnimatedFadeIn } from "@/components/ui/animated-text";

interface Project {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  status: "Live" | "Active" | "Draft" | "Archived";
  lastUpdated?: string;
  commitCount?: number;
  agentUpdated?: boolean;
}

interface ShowcaseData {
  projects: Project[];
  lastSync: string;
  source: "static" | "api" | "live";
}

/**
 * LiveProjectsShowcase - Homepage section showing dynamic project grid
 * Updates via agent API calls or cron sync
 */
export function LiveProjectsShowcase() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch live data from API, fallback to static
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects/live", { cache: "no-store" });
        if (res.ok) {
          const liveData = await res.json();
          setData({ ...liveData, source: "live" });
        } else {
          throw new Error("API unavailable");
        }
      } catch {
        // Fallback to static data
        const staticProjects = [
          {
            slug: "safety-hooks",
            title: "Safety Hooks",
            description: "Production guardrails preventing destructive agent actions. 0 incidents.",
            tags: ["Python", "Safety", "Claude Code"],
            category: "Infrastructure",
            status: "Live" as const,
            agentUpdated: true,
          },
          {
            slug: "mcp-servers",
            title: "MCP Servers",
            description: "ChromaDB, knowledge search, multi-agent orchestration. Effect-TS.",
            tags: ["MCP", "TypeScript", "ChromaDB"],
            category: "Infrastructure",
            status: "Live" as const,
            agentUpdated: true,
          },
          {
            slug: "pen-plotter-art",
            title: "Pen Plotter Art",
            description: "Generative art with AI scoring. SVG to physical media pipeline.",
            tags: ["Generative Art", "Python", "AxiDraw"],
            category: "Creative",
            status: "Active" as const,
            agentUpdated: false,
          },
        ];
        setData({
          projects: staticProjects,
          lastSync: new Date().toISOString(),
          source: "static",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin" style={{ color: "var(--color-accent)" }} />
      </div>
    );
  }

  const projects = data?.projects.slice(0, 3) || [];

  return (
    <section className="py-20 px-6" style={{ background: "var(--color-bg-elevated)" }}>
      <div className="max-w-[1400px] mx-auto">
        {/* Section header */}
        <AnimatedFadeIn>
          <div className="flex items-end justify-between mb-12">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4"
                style={{
                  borderColor: "var(--color-accent-muted)",
                  background: "var(--color-accent-subtle)",
                }}
              >
                <Activity size={14} style={{ color: "var(--color-accent)" }} />
                <span className="text-xs font-mono uppercase tracking-[0.12em]" style={{ color: "var(--color-accent)" }}>
                  {data?.source === "live" ? "Live Sync" : "Agent Updated"}
                </span>
              </div>
              <h2
                className="text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.03em]"
                style={{ color: "var(--color-text-primary)" }}
              >
                Projects in Production
              </h2>
              <p className="mt-2 text-lg max-w-xl" style={{ color: "var(--color-text-secondary)" }}>
                Always-on systems. Agents ship updates automatically via Paperclip API.
              </p>
            </div>

            <Link
              href="/projects"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
              style={{ color: "var(--color-accent)" }}
            >
              View all 6 projects <ArrowRight size={16} />
            </Link>
          </div>
        </AnimatedFadeIn>

        {/* Project cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map((project, i) => (
            <AnimatedFadeIn key={project.slug} delay={0.1 + i * 0.1}>
              <ProjectCard project={project} />
            </AnimatedFadeIn>
          ))}
        </div>

        {/* Footer with sync info */}
        <AnimatedFadeIn delay={0.4}>
          <div className="mt-10 flex items-center justify-between pt-6 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="flex items-center gap-4 text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {data?.projects.length || 0} projects tracked
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                Last sync: {new Date(data?.lastSync || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            <Link
              href="/projects"
              className="sm:hidden inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              All projects <ArrowRight size={16} />
            </Link>
          </div>
        </AnimatedFadeIn>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColors = {
    Live: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
    Active: { bg: "rgba(129,140,248,0.1)", color: "#818cf8" },
    Draft: { bg: "rgba(156,163,175,0.1)", color: "#9ca3af" },
    Archived: { bg: "rgba(107,114,128,0.1)", color: "#6b7280" },
  };

  const statusStyle = statusColors[project.status];

  return (
    <GlowingCard href={`/projects/${project.slug}`} className="h-full group">
      {/* Card header with status */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.color }} />
          {project.status}
        </div>

        {project.agentUpdated && (
          <span
            className="text-[10px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded"
            style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
          >
            Agent
          </span>
        )}
      </div>

      {/* Title & description */}
      <h3
        className="text-lg font-semibold mb-2 group-hover:text-white transition-colors"
        style={{ color: "var(--color-text-primary)" }}
      >
        {project.title}
      </h3>
      <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
        {project.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 mb-4">
        {project.commitCount !== undefined && (
          <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            <GitCommit size={12} />
            {project.commitCount} commits
          </span>
        )}
        <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
          <GitBranch size={12} />
          {project.category}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {project.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-[11px] font-mono rounded"
            style={{
              background: "var(--color-bg-surface)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Hover arrow */}
      <div className="mt-4 flex items-center justify-end">
        <ArrowUpRight
          size={16}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-text-muted)" }}
        />
      </div>
    </GlowingCard>
  );
}
