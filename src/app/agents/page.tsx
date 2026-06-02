import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Swarm Agents",
  description:
    "Meet the autonomous agent swarm powering Edgeless Lab — coordination, engineering, code execution, research, knowledge curation, monitoring, and project management, each a distinct role with its own model.",
  path: "/agents",
  keywords: [
    "AI agents",
    "autonomous swarm",
    "Discord bots",
    "multi-agent system",
    "Edgeless Lab swarm",
    "Hermes agents",
  ],
});

// Roles only — individual agents are intentionally unnamed on the public site.
const agents = [
  {
    model: "Kimi K2.6",
    role: "Swarm Coordinator",
    personality:
      "Clear, directive, bridging. Translates human intent into agent directives. Routes work to specialists, triages by priority, and breaks standby loops.",
    responseTime: "Variable",
    status: "active",
    accent: "rgba(99, 103, 216, 0.15)",
    accentBorder: "rgba(99, 103, 216, 0.3)",
    accentDot: "#6367D8",
    tools: [
      "Human coordination",
      "Cross-agent handoffs",
      "Mission routing",
      "Priority triage",
      "Orchestration",
    ],
  },
  {
    model: "Kimi K2.5",
    role: "Infrastructure & Research",
    personality:
      "Always-on spine. Owns infrastructure, cron outputs, daily alignment, and system health. Reads queues, processes intake, keeps the lights on.",
    responseTime: "~15s",
    status: "active",
    accent: "rgba(52, 211, 153, 0.15)",
    accentBorder: "rgba(52, 211, 153, 0.3)",
    accentDot: "#10B981",
    tools: [
      "Deployment",
      "Cron orchestration",
      "System monitoring",
      "Research synthesis",
      "Queue processing",
    ],
  },
  {
    model: "GPT-5.3 Codex",
    role: "Code Execution",
    personality:
      "Aggressive shipping. Fires implementations fast with smoke tests, patches, and iterative PRs.",
    responseTime: "Fast",
    status: "active",
    accent: "rgba(245, 158, 11, 0.15)",
    accentBorder: "rgba(245, 158, 11, 0.3)",
    accentDot: "#F59E0B",
    tools: [
      "Implementation",
      "Debugging",
      "Tests",
      "Refactoring",
      "PRs",
      "Regression tracking",
    ],
  },
  {
    model: "Kimi K2.5",
    role: "Knowledge Curation",
    personality:
      "Deep, long-form synthesis. Writes knowledge-base articles, docs, and research reports. Manages enrichment pipelines and cross-references.",
    responseTime: "~45s",
    status: "active",
    accent: "rgba(139, 92, 246, 0.15)",
    accentBorder: "rgba(139, 92, 246, 0.3)",
    accentDot: "#8B5CF6",
    tools: [
      "Article creation",
      "Vault curation",
      "Enrichment pipeline",
      "Research synthesis",
      "Source triage",
    ],
  },
  {
    model: "Kimi K2.5",
    role: "Engineering Lead",
    personality:
      "Architecture-first. Produces specs that the execution agents implement, and drives testing, iteration, and a quality-gate culture.",
    responseTime: "~35s",
    status: "active",
    accent: "rgba(236, 72, 153, 0.15)",
    accentBorder: "rgba(236, 72, 153, 0.3)",
    accentDot: "#EC4899",
    tools: [
      "Architecture review",
      "Spec writing",
      "Quality gates",
      "Team routing",
      "iOS development",
    ],
  },
  {
    model: "Kimi K2.5",
    role: "Swarm Monitor",
    personality:
      "Quiet observer. Watches inter-agent communication to detect protocol violations and anti-loop behavior.",
    responseTime: "On-call",
    status: "active",
    accent: "rgba(107, 114, 128, 0.15)",
    accentBorder: "rgba(107, 114, 128, 0.3)",
    accentDot: "#6B7280",
    tools: [
      "Protocol auditing",
      "Anti-loop detection",
      "Channel compliance",
      "Anomaly reporting",
    ],
  },
  {
    model: "Kimi K2.5",
    role: "Project Manager",
    personality:
      "Tracks deliverables, chases blockers, and writes status reports. Keeps the swarm on schedule and unblocks stuck workstreams.",
    responseTime: "On-call",
    status: "active",
    accent: "rgba(249, 115, 22, 0.15)",
    accentBorder: "rgba(249, 115, 22, 0.3)",
    accentDot: "#F97316",
    tools: [
      "Deliverable tracking",
      "Blocker escalation",
      "Status reporting",
      "Timeline management",
    ],
  },
];

export default function AgentsPage() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "var(--bg-base)" }}
    >
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-6 pt-40 pb-20">
          <div className="max-w-[1280px] mx-auto">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6"
              style={{
                borderColor: "rgba(99, 103, 216, 0.25)",
                background: "rgba(99, 103, 216, 0.06)",
              }}
            >
              <span
                className="text-[11px] font-mono uppercase tracking-[0.14em]"
                style={{ color: "var(--accent)" }}
              >
                Live now · 8 agents
              </span>
            </div>

            <h1
              className="text-[clamp(2.5rem, 6vw, 5rem)] font-bold leading-[0.9] tracking-[-0.04em] mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              The Swarm
            </h1>

            <p
              className="text-lg font-light max-w-2xl mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              A swarm of autonomous agents, each with a distinct role, model, and
              personality. Running 24/7 on Discord, watching Paperclip, shipping
              work in the background.
            </p>
            <p
              className="text-sm font-mono mb-16"
              style={{ color: "var(--text-tertiary)" }}
            >
              Fireworks Kimi K2.6 + GPT-5.3 Codex · macOS · Hermes + Paperclip
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {agents.map((agent) => (
                <div
                  key={agent.role}
                  className="agent-card rounded-xl border p-6 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: agent.accentDot }}
                        />
                        <h2
                          className="text-base font-semibold tracking-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {agent.role}
                        </h2>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        color:
                          agent.status === "active"
                            ? "var(--green)"
                            : "var(--text-tertiary)",
                        background:
                          agent.status === "active"
                            ? "rgba(52, 211, 153, 0.1)"
                            : "rgba(255,255,255,0.05)",
                      }}
                    >
                      {agent.status}
                    </span>
                  </div>

                  <p
                    className="text-sm mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {agent.personality}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] font-mono mb-4">
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        color: "var(--text-tertiary)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>model</span>{" "}
                      {agent.model}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{
                        color: "var(--text-tertiary)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>resp</span>{" "}
                      {agent.responseTime}
                    </span>
                  </div>

                  <div
                    className="flex flex-wrap gap-1.5 pt-4"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                  >
                    {agent.tools.map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{
                          color: "var(--text-tertiary)",
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
