"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  knowledgeEntries,
  KNOWLEDGE_STATS,
  type KnowledgeSource,
} from "@/lib/knowledge-data";

const SOURCE_COLORS: Record<KnowledgeSource, { bg: string; text: string }> = {
  YouTube: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444" },
  Research: { bg: "var(--accent-muted)", text: "var(--accent)" },
  Docs: { bg: "var(--green-muted)", text: "var(--green)" },
  Tools: { bg: "rgba(251, 191, 36, 0.12)", text: "#FBBF24" },
};

const ALL_SOURCES: KnowledgeSource[] = ["YouTube", "Research", "Tools"];

export function KnowledgeExplorer() {
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<KnowledgeSource | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return knowledgeEntries.filter((entry) => {
      if (activeSource && entry.source !== activeSource) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeSource]);

  return (
    <div>
      {/* Stats line */}
      <p
        className="text-xs font-mono mb-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        {KNOWLEDGE_STATS.totalDocuments} documents across{" "}
        {KNOWLEDGE_STATS.collections} collections
      </p>

      {/* Search input */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, or tag..."
          className="w-full h-11 pl-11 pr-10 text-sm rounded-xl border outline-none transition-colors focus:border-[var(--border-hover)]"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors hover:bg-[var(--dot-subtle)]"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setActiveSource(null)}
          className="px-3 py-1.5 text-xs font-mono rounded-full border transition-colors"
          style={{
            background: !activeSource ? "var(--accent-muted)" : "transparent",
            borderColor: !activeSource
              ? "var(--accent)"
              : "var(--border-subtle)",
            color: !activeSource
              ? "var(--accent)"
              : "var(--text-tertiary)",
          }}
        >
          All
        </button>
        {ALL_SOURCES.map((source) => {
          const active = activeSource === source;
          const colors = SOURCE_COLORS[source];
          return (
            <button
              key={source}
              type="button"
              onClick={() => setActiveSource(active ? null : source)}
              className="px-3 py-1.5 text-xs font-mono rounded-full border transition-colors"
              style={{
                background: active ? colors.bg : "transparent",
                borderColor: active ? colors.text : "var(--border-subtle)",
                color: active ? colors.text : "var(--text-tertiary)",
              }}
            >
              {source}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          No results for &ldquo;{query}&rdquo;
          {activeSource && ` in ${activeSource}`}. Try a different search term.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry, i) => {
            const colors = SOURCE_COLORS[entry.source];
            return (
              <article
                key={entry.id}
                className="rounded-xl border p-5 flex flex-col transition-colors hover:border-[var(--border-hover)]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                  animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 0.04, 0.4)}s both`,
                }}
              >
                {/* Header: source badge + date */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-label font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {entry.source}
                  </span>
                  {entry.date && (
                    <span
                      className="text-small font-mono"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {entry.date}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  className="text-sm font-semibold mb-2 leading-snug"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.title}
                </h3>

                {/* Summary */}
                <p
                  className="text-xs line-clamp-3 mb-4 flex-1"
                  style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}
                >
                  {entry.summary}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {entry.tags.slice(0, 4).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      className="text-label font-mono px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--dot-subtle)] cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Result count */}
      {query || activeSource ? (
        <p
          className="text-xs font-mono mt-6 text-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      ) : null}
    </div>
  );
}
