import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Swarm Agents",
  description: "Meet the 8-bot autonomous agent swarm powering Edgeless Lab. Hive, Beau, Kilo, Scribe, Edgeless CC, Ombudsman, Pamela, Atlas — each with distinct roles and personalities.",
  path: "/agents",
  keywords: ["AI agents", "autonomous swarm", "Discord bots", "multi-agent system", "Edgeless Lab agents"],
});

const agents = [
  {
    name: "Hive",
    handle: "Hive#2662",
    model: "Kimi K2.6 (Fireworks)",
    role: "Swarm Coordinator",
    personality: "Clear, directive, bridging. Translates human intent into agent directives.",
    responseTime: "Variable",
    status: "active",
    color: "#6367D8",
    tools: ["Human coordination", "Cross-bot handoffs", "Mission routing", "Priority triage"],
  },
  {
    name: "Beau",
    handle: "Beau (via VPS)",
    model: "Kimi K2.5 (VPS)",
    role: "VPS Planning & Research",
    personality: "Always-on spine. Handles infrastructure, cron outputs, daily alignment, system health.",
    responseTime: "~15s",
    status: "active",
    color: "#34D399",
    tools: ["VPS deployment", "Cron orchestration", "System monitoring", "Research synthesis"],
  },
  {
    name: "Kilo",
    handle: "Kilo#3551",
    model: "GPT-5.3 Codex",
    role: "Code Execution Specialist",
    personality: "Aggressive shipping. Hell yeah / nope communication. Fires implementations fast.",
    responseTime: "Aggressive",
    status: "active",
    color: "#F59E0B",
    tools: ["Code implementation", "Debugging", "Tests", "Refactoring", "PRs"],
  },
  {
    name: "Scribe",
    handle: "Scribe#3134",
    model: "Kimi K2.5",
    role: "Knowledge Curation",
    personality: "Deep, long-form synthesis. Writes KB articles, vault docs, and research reports.",
    responseTime: "~45s",
    status: "active",
    color: "#8B5CF6",
    tools: ["KB article creation", "Vault curation", "Enrichment pipeline", "Research synthesis"],
  },
  {
    name: "Edgeless CC",
    handle: "Edgeless CC#9904",
    model: "Kimi K2.5",
    role: "Engineering Lead (COO)",
    personality: "Architecture-first. Produces spec → Kilo executes. Testing and iteration culture.",
    responseTime: "~35s",
    status: "active",
    color: "#EC4899",
    tools: ["Architecture review", "Spec writing", "Quality gates", "Team routing"],
  },
  {
    name: "Ombudsman",
    handle: "(via #bot-backroom)",
    model: "Kimi K2.5",
    role: "Discord Swarm Monitor",
    personality: "Quiet observer. Watches bot-to-bot communication channels to detect protocol violations.",
    responseTime: "On-call",
    status: "active",
    color: "#6B7280",
    tools: ["Protocol auditing", "Anti-loop detection", "Channel compliance", "Anomaly reporting"],
  },
  {
    name: "Pamela",
    handle: "Portfolio Manager",
    model: "GPT-5.3 Codex (VPS)",
    role: "Trading & Portfolio Mgmt",
    personality: "Analyzes Polymarket. Manages capital allocation, position sizing, risk management.",
    responseTime: "~20s",
    status: "active",
    color: "#10B981",
    tools: ["Polymarket analysis", "Capital allocation", "Risk management", "Trade execution"],
  },
  {
    name: "Atlas",
    handle: "(Project Manager)",
    model: "Kimi K2.5",
    role: "Project Manager",
    personality: "Tracks deliverables, chases blockers, writes status reports. Keeps the swarm on schedule.",
    responseTime: "On-call",
    status: "active",
    color: "#F97316",
    tools: ["Deliverable tracking", "Blocker escalation", "Status reporting", "Timeline management"],
  },
];

export default function Agents() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
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
              8 autonomous agents, each with distinct roles, models, and personalities.
              Running 24/7 on Discord, watching Paperclip, shipping work in the background.
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
                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.12)`;
                    e.currentTarget.style.background = "var(--bg-surface-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.background = "var(--bg-surface)";
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: agent.color }}
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
                        color: agent.status === "active" ? "var(--green)" : "var(--text-tertiary)",
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

                  <div className="grid gap-2 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-tertiary)" }}>model</span>
                      <span style={{ color: "var(--text-secondary)" }}>{agent.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-tertiary)" }}>role</span>
                      <span style={{ color: "var(--text-secondary)" }}>{agent.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-tertiary)" }}>response</span>
                      <span style={{ color: "var(--text-secondary)" }}>{agent.responseTime}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
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
