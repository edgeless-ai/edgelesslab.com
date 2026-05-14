"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { posts } from "@/lib/blog";

/* ── Hero ────────────────────────────────────────────────── */

export { HeroSectionEnhanced as HeroSection } from "@/components/hero-enhanced";

/* ── Recent Activity (Simon Willison-style chronological stream) ─── */

function formatRelative(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function RecentActivity() {
  const recent = [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {recent.map((post, i) => {
        const isLaunch = Boolean(post.isLaunch);
        return (
          <li
            key={post.slug}
            style={{
              borderColor: "var(--border-subtle)",
              animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
            }}
            className="border-b first:border-t"
          >
            <Link
              href={`/blog/${post.slug}`}
              className="group grid grid-cols-[auto_auto_1fr_auto] items-center gap-4 py-4 px-1 transition-colors"
            >
              <span
                className="text-[11px] font-mono tabular-nums shrink-0 w-[68px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {post.date.slice(5)}
              </span>
              <span
                className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded shrink-0"
                style={{
                  background: isLaunch ? "var(--accent-muted)" : "var(--bg-surface)",
                  color: isLaunch ? "var(--accent)" : "var(--text-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {isLaunch ? "launch" : "post"}
              </span>
              <span
                className="text-[14px] font-medium truncate transition-colors group-hover:text-white"
                style={{ color: "var(--text-primary)" }}
              >
                {post.title}
              </span>
              <span
                className="text-[11px] font-mono shrink-0 hidden sm:inline"
                style={{ color: "var(--text-tertiary)" }}
              >
                {formatRelative(post.date)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
