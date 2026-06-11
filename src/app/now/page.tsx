import { Metadata } from "next";
import Link from "next/link";
import { projects, experiments } from "@/lib/data";
import { posts } from "@/lib/blog";
import { ArrowRight, ExternalLink, GitCommit, Rocket, Zap, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Now — Edgeless Lab",
  description: "Live status of what we're building, shipping, and operating.",
};

const UPTIME_START = new Date("2024-01-01T00:00:00Z");

function uptime() {
  const now = new Date();
  const diff = now.getTime() - UPTIME_START.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `${days}d ${hours}h`;
}

const liveSignals = [
  { label: "Production deploys", value: "127", tone: "ok" },
  { label: "ChromaDB collections", value: "22+", tone: "ok" },
  { label: "Active agents", value: "6", tone: "ok" },
  { label: "Last blog post", value: "2d ago", tone: "warn" },
  { label: "Lighthouse (home)", value: "P76 A96 B96 S100", tone: "ok" },
  { label: "Cache policy", value: "missing", tone: "warn" },
];

const activeProjects = projects
  .filter((p) => p.status === "shipped" || p.status === "active")
  .slice(0, 8);

const activeExperiments = experiments
  .filter((e) => e.status === "live" || e.status === "active")
  .slice(0, 6);

const recentBuilds = [
  { time: "04:12 UTC", event: "edgelesslab.com rebuilt", status: "success" },
  { time: "03:55 UTC", event: "pen-plotter assets exported", status: "success" },
  { time: "02:30 UTC", event: "knowledge pipeline synced", status: "success" },
  { time: "01:10 UTC", event: "ChromaDB backup completed", status: "success" },
];

export default function NowPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <main id="main-content" className="flex-1">
        <section className="px-6 py-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                LIVE
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                uptime {uptime()}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-3">Now</h1>
            <p className="max-w-2xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Building the interface layer for autonomous work — ship-first, knowledge-second.
              This page reflects production state, not aspirations.
            </p>
          </div>
        </section>

        <section className="px-6 py-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-tertiary)" }}>
              Live signals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSignals.map((s) => (
                <div key={s.label} className="rounded-lg border px-4 py-3" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                  <div className="text-xs font-mono mb-1" style={{ color: "var(--text-tertiary)" }}>{s.label}</div>
                  <div className="text-xl font-semibold font-mono" style={{ color: s.tone === "warn" ? "var(--yellow)" : "var(--text-primary)" }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-tertiary)" }}>
                Active projects
              </h2>
              <div className="space-y-3">
                {activeProjects.map((p) => (
                  <Link key={p.slug} href={`/projects/${p.slug}`} className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors hover:border-white/20" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-xs mt-1 truncate" style={{ color: "var(--text-tertiary)" }}>{p.description}</div>
                    </div>
                    <ExternalLink size={14} className="shrink-0 mt-1" style={{ color: "var(--text-tertiary)" }} />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-tertiary)" }}>
                Experiments in progress
              </h2>
              <div className="space-y-3">
                {activeExperiments.map((e) => (
                  <Link key={e.slug} href={e.href ?? `/lab/${e.slug}`} className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors hover:border-white/20" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{e.category}</div>
                    </div>
                    <ExternalLink size={14} className="shrink-0 mt-1" style={{ color: "var(--text-tertiary)" }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-tertiary)" }}>
              Recent builds
            </h2>
            <div className="space-y-2">
              {recentBuilds.map((b) => (
                <div key={b.time + b.event} className="flex items-center gap-3 rounded-lg border px-4 py-2.5" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                  <span className="h-2 w-2 rounded-full" style={{
                    background: b.status === "success" ? "var(--green)" : "var(--red)",
                    boxShadow: b.status === "success" ? "0 0 8px var(--green)" : "0 0 8px var(--red)",
                  }} />
                  <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{b.time}</span>
                  <Terminal size={14} style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-sm">{b.event}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-tertiary)" }}>
              Recent activity
            </h2>
            <div className="space-y-3">
              {posts.slice(0, 6).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors hover:border-white/20" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{post.title}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {post.date ? new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      {post.tags?.length ? ` · ${post.tags[0]}` : ""}
                    </div>
                  </div>
                  <ArrowRight size={14} className="shrink-0 mt-1" style={{ color: "var(--text-tertiary)" }} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="max-w-[1280px] mx-auto">
            <div className="rounded-xl border p-6" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Rocket size={16} />
                <h2 className="text-sm font-mono uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>
                  Up next
                </h2>
              </div>
              <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <li className="flex items-center gap-2"><Zap size={14} style={{ color: "var(--accent)" }} /> Finish Lighthouse batch audit for growth pages</li>
                <li className="flex items-center gap-2"><Zap size={14} style={{ color: "var(--accent)" }} /> Publish cache-control headers preset (Next standalone)</li>
                <li className="flex items-center gap-2"><Zap size={14} style={{ color: "var(--accent)" }} /> Ship codex-build kit + docs site</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
