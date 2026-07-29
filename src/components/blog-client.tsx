"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { BlogPost } from "@/lib/blog";

// Deduplicate tag counts (some posts share same tag variants)
function normalizeTag(tag: string) {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

export function BlogSearch({
  allPosts,
}: {
  allPosts: BlogPost[];
  tagCounts: { tag: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uniquePosts = Array.from(
    new Map(allPosts.map((post) => [post.slug, post])).values()
  );
  const uniqueTagCounts = Array.from(
    uniquePosts
      .flatMap((post) => post.tags)
      .reduce((counts, tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
  ).map(([tag, count]) => ({ tag, count }));

  // Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setQuery("");
      setActiveTag(null);
      inputRef.current?.blur();
    }
  }, []);

  const filtered = uniquePosts.filter((post) => {
    const matchesQuery =
      query.length === 0 ||
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.description.toLowerCase().includes(query.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    const matchesTag =
      activeTag === null ||
      post.tags.some((t) => normalizeTag(t) === activeTag);

    return matchesQuery && matchesTag;
  });

  return (
    <>
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-[920px] mx-auto">
          <div className="flex items-center gap-2.5 mb-6">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span
              className="text-[11px] font-mono uppercase tracking-[0.14em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Blog / reports from the lab
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-4 mb-4">
            <h1
              className="text-5xl sm:text-6xl font-bold tracking-tight leading-[0.92]"
              style={{ color: "var(--text-primary)" }}
            >
              Blog
            </h1>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              Reports, tutorials, and postmortems
            </span>
          </div>

          <p
            className="text-base mb-8 max-w-xl"
            style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          >
            What changed after the first version met reality. Agent systems,
            recovery work, creative tools, pen plotter runs, and the methods
            worth carrying into the next build.
          </p>

          {/* Search bar */}
          <div className="relative mb-8">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search posts, topics, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full pl-10 pr-20 h-11 text-sm rounded-lg border bg-transparent transition-colors focus:outline-none placeholder:text-[var(--text-tertiary)]"
              style={{
                borderColor:
                  query ? "var(--accent)" : "var(--border-subtle)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
              aria-label="Search blog posts"
            />
            {query && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd
                  className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded border"
                  style={{
                    color: "var(--text-tertiary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  Esc
                </kbd>
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded hover:bg-[var(--bg-surface)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={13} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-10">
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border transition-colors hover:text-white"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--border-subtle)",
              }}
            >
              RSS feed
            </a>
            {query && (
              <span
                className="text-xs font-mono"
                style={{ color: "var(--accent)" }}
              >
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}{" "}
                for &quot;{query}&quot;
              </span>
            )}
          </div>

          {/* Tag counts - clickable for filtering */}
          <div className="mb-12 pb-8 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <h2
              className="text-[10px] font-mono uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Topics
            </h2>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {uniqueTagCounts
                .sort((a, b) => b.count - a.count)
                .slice(0, 14)
                .map(({ tag, count }) => {
                  const normalized = normalizeTag(tag);
                  const isActive = activeTag === normalized;
                  return (
                    <button
                      key={tag}
                      onClick={() =>
                        setActiveTag(isActive ? null : normalized)
                      }
                      className="text-[13px] font-mono cursor-pointer bg-transparent border-none p-0 transition-opacity"
                      style={{
                        color: isActive
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                        opacity:
                          isActive || !activeTag ? 1 : 0.5,
                      }}
                      aria-pressed={isActive}
                    >
                      {tag}{" "}
                      <span style={{ color: isActive ? "var(--accent)" : "var(--accent)" }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="mt-3 text-[11px] font-mono underline cursor-pointer bg-transparent border-none p-0"
                style={{ color: "var(--text-tertiary)" }}
              >
                Clear tag filter
              </button>
            )}
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div
              className="text-center py-20"
              style={{ color: "var(--text-tertiary)" }}
            >
              <p className="text-sm font-mono mb-2">No posts found</p>
              <p className="text-xs">
                Try a different search term or clear filters
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <div
      style={{
        animation: "fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group grid gap-4 border-b px-3 py-6 -mx-3 transition-colors hover:bg-[var(--bg-surface)] sm:grid-cols-[1fr_auto]"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="min-w-0">
          <h2 className="text-xl font-medium leading-tight sm:text-2xl">
            {post.title}
          </h2>
          <p
            className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {post.description}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <div className="hidden gap-1.5 md:flex">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-mono rounded"
                style={{
                  background: "var(--accent-muted)",
                  color: "var(--accent)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <time
            className="whitespace-nowrap font-mono text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </Link>
    </div>
  );
}
