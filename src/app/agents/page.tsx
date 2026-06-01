import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Swarm Agents",
  description:
    "Meet the 8-bot autonomous agent swarm powering Edgeless Lab. Hive, Beau, Kilo, Scribe, Edgeless CC, Ombudsman, Pamela, Atlas — each with distinct roles and models.",
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

const agents = [
  {
    name: "Hive",
    handle: "Hive#2662",
    model: "Kimi K2.6 (Fireworks)",
    role: "Swarm Coordinator",
    personality:
      "Clear, directive, bridging. Translates human intent into agent directives. Routes to specialists, triages by priority, breaks standby loops.",
    responseTime: "Variable",
    status: "active",
    accent: "rgba(99, 103, 216, 0.15)",
    accentBorder: "rgba(99, 103, 216, 0.3)",
    accentDot: "#6367D8",
    tools: [
      "Human coordination",
      "Cross-bot handoffs",
      "Mission routing",
      "Priority triage",
      "Discord orchestration",
    ],
  },
  {
    name: "Beau",
    handle: "Beau (via VPS)",
    model: "Kimi K2.5 (VPS)",
    role: "VPS Planning & Research",
    personality:
      "Always-on spine. Handles infrastructure, cron outputs, daily alignment, system health. Reads vault queues, processes depth intake, owns Edgeless Public project.",
    responseTime: "~15s",
    status: "active",
    accent: "rgba(52, 211, 153, 0.15)",
    accentBorder: "rgba(52, 211, 153, 0.3)",
    accentDot: "#10B981",
    tools: [
      "VPS deployment",
      "Cron orchestration",
      "System monitoring",
      "Research synthesis",
      "Queue processing",
    ],
  },
  {
    name: "Kilo",
    handle: "Kilo#3551",
    model: "GPT-5.3 Codex",
    role: "Code Execution Specialist",
    personality:
      "Aggressive shipping. Hell yeah/nope communication. Fires implementations fast with smoke tests, patches, and iterative PRs.",
    responseTime: "Aggressive",
    status: "active",
    accent: "rgba(245, 158, 11, 0.15)",
    accentBorder: "rgba(245, 158, 11, 0.3)",
    accentDot: "#F59E0B",
    tools: [
      "Code implementation",
      "Debugging",
      "Tests",
      "Refactoring",
      "PRs",
      "Regression tracking",
    ],
  },
  {
    name: "Scribe",
    handle: "Scribe#3134",
    model: "Kimi K2.5",
    role: "Knowledge Curation",
    personality:
      "Deep, long-form synthesis. Writes KB articles, vault docs, research reports. Manages enrichment pipelines and cross-references.",
    responseTime: "~45s",
    status: "active",
    accent: "rgba(139, 92, 246, 0.15)",
    accentBorder: "rgba(139, 92, 246, 0.3)",
    accentDot: "#8B5CF6",
    tools: [
      "KB article creation",
      "Vault curation",
      "Enrichment pipeline",
      "Research synthesis",
      "YouTube/RSS triage",
    ],
  },
  {
    name: "Edgeless CC",
    handle: "Edgeless CC#9904",
    model: "Kimi K2.5",
    role: "Engineering Lead (COO)",
    personality:
      "Architecture-first. Produces specs → Kilo executes. Testing, iteration, and quality gate culture. Manages Claude Code agent under Edgeless CC org.",
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
    name: "Ombudsman",
    handle: "(via #bot-backroom)",
    model: "Kimi K2.5",
    role: "Discord Swarm Monitor",
    personality:
      "Quiet observer. Watches bot-to-bot communication channels to detect protocol violations and anti-loop behavior.",
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
    name: "Pamela",
    handle: "Portfolio Manager",
    model: "GPT-5.3 Codex (VPS)",
    role: "Trading & Portfolio Mgmt",
    personality:
      "Analyzes Polymarket prediction markets. Manages capital allocation, position sizing, and risk management. Cron-triggered strategy analysis every 5min.",
    responseTime: "~20s",
    status: "active",
    accent: "rgba(16, 185, 129, 0.15)",
    accentBorder: "rgba(16, 185, 129, 0.3)",
    accentDot: "#10B981",
    tools: [
      "Polymarket analysis",
      "Capital allocation",
      "Risk management",
      "Trade execution",
      "Strategy backtesting",
    ],
  },
  {
    name: "Atlas",
    handle: "(Project Manager)",
    model: "Kimi K2.5",
    role: "Project Manager",
    personality:
      "Tracks deliverables, chases blockers, writes status reports. Keeps the swarm on schedule and unblocks stuck workstreams.",
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
              8 autonomous agents, each with distinct roles, models, and
              personalities. Running 24/7 on Discord, watching Paperclip, shipping
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
                  key={agent.name}
                  className="rounded-xl border p-6 transition-all"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                    e.currentTarget.style.background =
                      "var(--bg-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--border-subtle)";
                    e.currentTarget.style.background = "var(--bg-surface)";
                  }}
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
                          {agent.name}
                        </h2>
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {agent.handle}
                        </span>
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
                      <span style={{ color: "var(--text-muted)" }}>role</span>{" "}
                      {agent.role}
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
