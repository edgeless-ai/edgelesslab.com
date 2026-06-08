"use client";

import { useEffect, useMemo, useState } from "react";

export type ShipLogEntry = {
  id: string;
  title: string;
  description: string;
  status: "shipped" | "in_progress" | "blocked";
  occurredAt: string;
  tags: string[];
};

const STATUS_META: Record<ShipLogEntry["status"], { label: string; className: string }> = {
  shipped: {
    label: "shipped",
    className:
      "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]",
  },
  in_progress: {
    label: "in progress",
    className:
      "border-[var(--border-subtle)] text-[var(--text-primary)] bg-[var(--bg-surface)]",
  },
  blocked: {
    label: "blocked",
    className:
      "border-red-500/60 text-red-200 bg-red-500/10",
  },
};

function formatRelative(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - then) / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ShipLogPanel({ entries }: { entries: ShipLogEntry[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 6);
  }, [entries]);

  return (
    <section
      className="px-6 py-20 border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[920px] mx-auto">
        <div className="flex items-baseline justify-between mb-6">
          <h2
            className="text-sm font-mono uppercase tracking-[0.15em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Living ship log
          </h2>
          <span
            className="text-[11px] font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {formatRelative(now.toISOString())}
          </span>
        </div>

        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {items.map((entry, index) => {
            const meta = STATUS_META[entry.status];
            return (
              <li
                key={entry.id}
                className="border-b first:border-t"
                style={{
                  borderColor: "var(--border-subtle)",
                  animation:
                    "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0s both",
                }}
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 py-4 px-1">
                  <span
                    className="text-[11px] font-mono tabular-nums shrink-0 w-[72px] pt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {formatRelative(entry.occurredAt)}
                  </span>
                  <div className="space-y-1">
                    <span
                      className="text-[13px] font-medium block"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.title}
                    </span>
                    <span
                      className="text-[12px] block"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {entry.description}
                    </span>
                    {entry.tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1 pt-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded"
                            style={{
                              background: "var(--bg-surface)",
                              color: "var(--text-tertiary)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded border shrink-0 ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
