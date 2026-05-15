"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import Link from "next/link";
import { useState, useEffect } from "react";

const seriesPosts = [
  {
    slug: "12-dollar-ai-operations-team",
    title: "I Run a $12/Week AI Operations Team. Here's the Cost Breakdown.",
    description: "The real numbers behind running 5+ AI agents on a $5 VPS. Token costs, API choices, and the optimization tricks that cut bills by 60%.",
    tags: ["Cost", "Infrastructure"],
  },
  {
    slug: "agents-that-talk-to-each-other",
    title: "How I Run 5 AI Agents That Talk to Each Other",
    description: "Multi-agent coordination patterns — how agents delegate, verify, and self-heal without human intervention.",
    tags: ["Architecture", "Coordination"],
  },
  {
    slug: "how-claude-code-memory-works",
    title: "How Claude Code Memory Actually Works",
    description: "Inside the 3-layer memory system (ChromaDB + PyTorch + Vault) that lets agents learn and improve across sessions.",
    tags: ["Memory", "Claude Code"],
  },
  {
    slug: "the-hook-that-saved-my-codebase",
    title: "The Hook That Saved My Codebase",
    description: "Git hooks as AI harness engineering — pre-commit validation, damage control, and automated code review.",
    tags: ["Engineering", "Harness"],
  },
  {
    slug: "self-healing-ai-infrastructure",
    title: "Half My AI Agents Were Dead. I Didn't Know for a Week.",
    description: "How a $5 VPS cron job brought dead agents back to life and why self-healing is the most underrated pattern in agentic engineering.",
    tags: ["Reliability", "Self-Healing"],
  },
  {
    slug: "agents-that-improve-themselves",
    title: "The Most Useful Thing Your AI Agents Can Do Is Audit Themselves",
    description: "We pointed agents at our own knowledge base and asked what they should be doing that they weren't. Then we built the fixes.",
    tags: ["Self-Improvement", "Audit"],
  },
  {
    slug: "youtube-mining-ai-agents",
    title: "I Pointed 7 AI Agents at My YouTube History. They Found What I Couldn't See.",
    description: "7 agents analyzed 1,062 YouTube videos and found 14 things they should be doing that they weren't.",
    tags: ["Knowledge Mining", "YouTube"],
  },
];

const products = [
  {
    name: "Hermes Deployment Guide",
    price: "$19",
    description: "Install, configure, and run your first Hermes agent. Telegram or Discord, VPS or local.",
    href: "https://edgelessai.gumroad.com/l/hermes-deploy",
    free: false,
  },
  {
    name: "KB Loop Kit",
    price: "$29",
    description: "Knowledge base health check script, scoring rubric, Obsidian integration guide.",
    href: "https://edgelessai.gumroad.com/l/kb-loop-kit",
    free: false,
  },
  {
    name: "Paperclip OS Blueprint",
    price: "$49",
    description: "Complete multi-agent orchestration setup. Roles, workflows, handoff protocols.",
    href: "https://edgelessai.gumroad.com/l/paperclip-os",
    free: false,
  },
  {
    name: "CLAUDE.md Template Pack",
    price: "Free",
    description: "14 battle-tested CLAUDE.md templates for every project type.",
    href: "https://edgelessai.gumroad.com/l/kszapk",
    free: true,
  },
];

function CostCalculator() {
  const [agents, setAgents] = useState(5);
  const [tasks, setTasks] = useState(50);
  const [tokens, setTokens] = useState(50000);
  const [tier, setTier] = useState(3.0);
  const [monthly, setMonthly] = useState("$945");
  const [totalTokens, setTotalTokens] = useState("375M");
  const [optimized, setOptimized] = useState("$378");
  const [savings, setSavings] = useState("60%");

  useEffect(() => {
    const totalMonthlyTokens = agents * tasks * tokens * 30;
    const millions = totalMonthlyTokens / 1e6;
    const cost = millions * tier;
    const optCost = cost * 0.4;

    setMonthly("$" + Math.round(cost).toLocaleString());
    const tDisplay = totalMonthlyTokens >= 1e9
      ? (totalMonthlyTokens / 1e9).toFixed(1) + "B"
      : Math.round(totalMonthlyTokens / 1e6).toLocaleString() + "M";
    setTotalTokens(tDisplay);
    setOptimized("$" + Math.round(optCost).toLocaleString());
    setSavings(Math.round((1 - 0.4) * 100) + "%");
  }, [agents, tasks, tokens, tier]);

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--bg-base)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "monospace",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontFamily: "monospace",
    color: "var(--text-tertiary)",
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
          Cost Calculator
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          What Would Your Agentic OS Cost?
        </h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>AI Agents</label>
          <input type="number" value={agents} min={1} max={100}
            onChange={(e) => setAgents(Number(e.target.value))}
            style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tasks per Agent / Day</label>
          <input type="number" value={tasks} min={1} max={10000}
            onChange={(e) => setTasks(Number(e.target.value))}
            style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tokens per Task</label>
          <input type="number" value={tokens} min={1000} max={1000000} step={1000}
            onChange={(e) => setTokens(Number(e.target.value))}
            style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Model Tier</label>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value))}
            style={fieldStyle}>
            <option value={0.14}>DeepSeek V4 Flash ($0.14/1M)</option>
            <option value={0.50}>Gemini 3 Flash ($0.50/1M)</option>
            <option value={3.00}>Claude Sonnet 4.6 ($3.00/1M)</option>
            <option value={5.00}>Claude Opus 4.7 ($5.00/1M)</option>
          </select>
        </div>
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-tertiary)", marginBottom: 4 }}>ESTIMATED MONTHLY COST</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)", fontFamily: "monospace" }}>{monthly}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-tertiary)", marginBottom: 4 }}>MONTHLY TOKENS</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", fontFamily: "monospace" }}>{totalTokens}</div>
          </div>
        </div>
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            With Agentic OS optimizations (caching + routing + compression):{" "}
            <strong style={{ color: "var(--green)" }}>~{optimized}/month</strong>{" "}
            — <span style={{ color: "var(--accent)" }}>{savings} savings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgenticOSPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Agentic OS — Run AI Agents That Pay for Themselves",
        "description": "Build, run, and scale autonomous AI agents for ~$12/week. Open-source infrastructure, production-tested patterns.",
        "url": "https://edgelesslab.com/agentic-os",
        "publisher": {
          "@type": "Organization",
          "name": "Edgeless Lab",
          "url": "https://edgelesslab.com",
        },
        "mainEntity": {
          "@type": "SoftwareApplication",
          "name": "Agentic OS",
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "Linux, macOS",
          "offers": [
            { "@type": "Offer", "price": "19", "priceCurrency": "USD", "name": "Hermes Deployment Guide" },
            { "@type": "Offer", "price": "29", "priceCurrency": "USD", "name": "KB Loop Kit" },
            { "@type": "Offer", "price": "0", "priceCurrency": "USD", "name": "CLAUDE.md Template Pack" },
          ],
        },
      }}/>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Agentic OS Blog Series",
        "itemListElement": seriesPosts.map((p, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "url": "https://edgelesslab.com/blog/" + p.slug,
          "name": p.title,
        })),
      }}/>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[720px] mx-auto text-center">
          <div
            className="inline-flex items-center gap-2.5 mb-6 px-3 py-1.5 rounded-full border"
            style={{
              borderColor: "rgba(129, 140, 248, 0.25)",
              background: "var(--accent-muted)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--accent)" }}
            >
              {seriesPosts.length} articles · production-tested
            </span>
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.92] mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Run AI agents that{" "}
            <span style={{ color: "var(--green)" }}>pay for themselves</span>
          </h1>

          <p
            className="text-lg font-light max-w-[560px] mx-auto mb-10"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Open-source infrastructure for autonomous AI agents.
            5+ agents on a $5 VPS, running 24/7, for ~$12/week.
            Built from production, not theory.
          </p>

          {/* Cost calculator */}
          <div
            className="mb-16 p-6 rounded-xl border"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
          >
            <CostCalculator />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "25+", label: "AI Agents Active" },
              { value: "168", label: "Skills Defined" },
              { value: "$12/wk", label: "Average Cost" },
              { value: "60%", label: "Cost Savings" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-3xl sm:text-4xl font-bold font-mono mb-2"
                  style={{ color: "var(--accent)" }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs font-mono uppercase tracking-[0.1em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog series */}
      <section className="px-6 py-20">
        <div className="max-w-[720px] mx-auto">
          <div
            className="text-[11px] font-mono uppercase tracking-[0.14em] mb-3"
            style={{ color: "var(--accent)" }}
          >
            Blog Series
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Read the full story
          </h2>

          <div className="space-y-0">
            {seriesPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={"/blog/" + post.slug}
                className="block py-6 border-b transition-colors group"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="text-xs font-mono pt-1 shrink-0 w-6"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-lg font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {post.title}
                    </div>
                    <p
                      className="text-sm mb-2"
                      style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                    >
                      {post.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] rounded-md"
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
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <div className="max-w-[1080px] mx-auto">
          <div
            className="text-[11px] font-mono uppercase tracking-[0.14em] mb-3"
            style={{ color: "var(--accent)" }}
          >
            Get Started
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Tools and guides
          </h2>
          <p
            className="text-base max-w-[560px] mb-10"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Production-tested infrastructure. Start free, upgrade when ready.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {products.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 rounded-xl border transition-all hover:border-[var(--accent)] hover:translate-y-[-1px]"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--bg-base)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </h3>
                  <span
                    className="text-sm font-mono shrink-0"
                    style={{ color: p.free ? "var(--green)" : "var(--text-secondary)" }}
                  >
                    {p.price}
                  </span>
                </div>
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}
                >
                  {p.description}
                </p>
                <span
                  className="text-[11px] font-mono uppercase tracking-[0.1em]"
                  style={{ color: "var(--accent)" }}
                >
                  {p.free ? "Free download" : "Get on Gumroad"} →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-[720px] mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Start building your Agentic OS
          </h2>
          <p
            className="text-base mb-8"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
          >
            Everything you need is open-source and production-tested.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/blog/12-dollar-ai-operations-team"
              className="inline-flex h-12 px-6 text-xs font-mono uppercase tracking-[0.1em] rounded-lg border transition-all"
              style={{
                color: "var(--accent)",
                borderColor: "rgba(129, 140, 248, 0.3)",
                background: "rgba(129, 140, 248, 0.08)",
              }}
            >
              Start Reading
            </Link>
            <Link
              href="/products"
              className="inline-flex h-12 px-6 text-xs font-mono uppercase tracking-[0.1em] rounded-lg border transition-all"
              style={{
                color: "var(--green)",
                borderColor: "rgba(52, 211, 153, 0.3)",
                background: "rgba(52, 211, 153, 0.06)",
              }}
            >
              Browse Products
            </Link>
            <a
              href="https://github.com/thedavidmurray/edgeless-stack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 px-6 text-xs font-mono uppercase tracking-[0.1em] rounded-lg border transition-all"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
