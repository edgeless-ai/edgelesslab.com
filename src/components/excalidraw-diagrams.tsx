"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type Diagram = { slug: string; title: string };

const DIAGRAMS: Diagram[] = [
  { slug: "system-architecture", title: "System Architecture" },
  { slug: "deployment-architecture-2026-03-10", title: "Deployment Architecture" },
  { slug: "security-model-2026-03-10", title: "Security Model" },
  { slug: "memory-architecture-2026-03-10", title: "Memory Architecture" },
  { slug: "memory-intelligence-system-2026-03-10", title: "Memory Intelligence System" },
  { slug: "knowledge-graph-2026-03-10", title: "Knowledge Graph" },
  { slug: "vault-structure-overview-2026-03-10", title: "Vault Structure Overview" },
  { slug: "vault-content-distribution-2026-03-10", title: "Vault Content Distribution" },
  { slug: "tag-taxonomy-2026-03-10", title: "Tag Taxonomy" },
  { slug: "reading-history-2026-03-10", title: "Reading History" },
  { slug: "inbox-processing-flow-2026-03-10", title: "Inbox Processing Flow" },
  { slug: "data-ingestion-pipeline-2026-03-10", title: "Data Ingestion Pipeline" },
  { slug: "n8n-workflow-architecture-2026-03-10", title: "n8n Workflow Architecture" },
  { slug: "rss-pipeline-detail-2026-03-10", title: "RSS Pipeline Detail" },
  { slug: "youtube-intelligence-pipeline-2026-03-10", title: "YouTube Intelligence Pipeline" },
  { slug: "email-system-flow-2026-03-10", title: "Email System Flow" },
  { slug: "email-script-ecosystem-2026-03-10", title: "Email Script Ecosystem" },
  { slug: "daily-workflow-2026-03-10", title: "Daily Workflow" },
  { slug: "cron-wrapper-architecture-2026-03-10", title: "Cron Wrapper Architecture" },
  { slug: "hooks-and-skills-overview-2026-03-10", title: "Hooks and Skills Overview" },
  { slug: "hooks-deep-dive-2026-03-10", title: "Hooks Deep Dive" },
  { slug: "hooks-skills-architecture-2026-03-10", title: "Hooks + Skills Architecture" },
  { slug: "skill-categories-2026-03-10", title: "Skill Categories" },
  { slug: "mcp-server-topology-2026-03-10", title: "MCP Server Topology" },
  { slug: "llm-client-architecture-2026-03-10", title: "LLM Client Architecture" },
  { slug: "session-lifecycle-2026-03-10", title: "Session Lifecycle" },
  { slug: "excalidraw-generator-meta-2026-03-10", title: "Excalidraw Generator Meta" },
  { slug: "epic-roadmap-2026-03-10", title: "Epic Roadmap" },
  { slug: "project-portfolio-2026-03-10", title: "Project Portfolio" },
  { slug: "system-health-dashboard-2026-03-10", title: "System Health Dashboard" },
  { slug: "failure-modes-recovery-2026-03-10", title: "Failure Modes & Recovery" },
  { slug: "obsidian-plugin-ecosystem-2026-03-10", title: "Obsidian Plugin Ecosystem" },
  { slug: "obsidian-cli-commands-2026-03-10", title: "Obsidian CLI Commands" },
  { slug: "google-workspace-integration-2026-03-10", title: "Google Workspace Integration" },
  { slug: "python-environment-2026-03-10", title: "Python Environment" },
  { slug: "key-development-patterns-2026-03-10", title: "Key Development Patterns" },
  { slug: "langfuse-observability-2026-03-10", title: "Langfuse Observability" },
  { slug: "hummingbot-sentiment-integration-2026-03-10", title: "Hummingbot Sentiment Integration" },
  { slug: "pamela-proxy-wallet-architecture", title: "Pamela Proxy Wallet Architecture" },
  { slug: "pen-plotter-art-system-2026-03-10", title: "Pen Plotter Art System" },
  { slug: "hub-spoke-memory", title: "Hub Spoke Memory" },
  { slug: "mind-map", title: "Mind Map" },
  { slug: "flow-horizontal", title: "Flow (Horizontal)" },
  { slug: "flow-vertical", title: "Flow (Vertical)" },
  { slug: "microservices", title: "Microservices" },
  { slug: "event-driven", title: "Event Driven" },
  { slug: "error-handling", title: "Error Handling" },
  { slug: "order-state-machine", title: "Order State Machine" },
  { slug: "login-flow", title: "Login Flow" },
  { slug: "registration-swimlane", title: "Registration Swimlane" },
  { slug: "onboarding-journey", title: "Onboarding Journey" },
  { slug: "tech-stack", title: "Tech Stack" },
  { slug: "schema", title: "Schema" },
  { slug: "deployment", title: "Deployment" },
  { slug: "quick-start", title: "Quick Start" },
  { slug: "dashboard-wireframe", title: "Dashboard Wireframe" },
  { slug: "mobile-wireframe", title: "Mobile Wireframe" },
  { slug: "settings-wireframe", title: "Settings Wireframe" },
  { slug: "wireframe-annotation", title: "Wireframe Annotation" },
  { slug: "presentation", title: "Presentation" },
  { slug: "presentation-content-slide", title: "Presentation Content Slide" },
];

export function ExcalidrawDiagrams() {
  const [active, setActive] = useState<Diagram | null>(null);

  return (
    <>
      <div
        className="mb-10 rounded-xl border p-4 sm:p-6"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="flex items-baseline justify-between mb-4">
          <h2
            className="text-xs font-mono uppercase tracking-[0.12em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Diagram Catalog
          </h2>
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {DIAGRAMS.length} diagrams
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DIAGRAMS.map((d) => (
            <button
              key={d.slug}
              type="button"
              onClick={() => setActive(d)}
              className="group text-left rounded-lg border overflow-hidden transition-colors"
              style={{
                background: "#ffffff",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="relative w-full aspect-[4/3] bg-white">
                <Image
                  src={`/lab/excalidraw-diagrams/${d.slug}.svg`}
                  alt={d.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-contain p-2"
                  unoptimized
                />
              </div>
              <div
                className="px-3 py-2 text-[11px] font-mono truncate border-t"
                style={{
                  color: "var(--text-secondary)",
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {d.title}
              </div>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 rounded-md p-2 transition-colors hover:bg-white/10"
            style={{ color: "#ffffff" }}
          >
            <X size={20} />
          </button>
          <div
            className="relative max-w-[92vw] max-h-[88vh] w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-3 text-sm font-mono text-white/80">
              {active.title}
            </div>
            <div className="relative flex-1 rounded-lg bg-white overflow-hidden">
              <Image
                src={`/lab/excalidraw-diagrams/${active.slug}.svg`}
                alt={active.title}
                fill
                sizes="92vw"
                className="object-contain p-6"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
