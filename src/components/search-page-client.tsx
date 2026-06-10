"use client";

import { Search, FileText, Folder, BookOpen, Package, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

interface PagefindResultData {
  url: string;
  title: string;
  meta: Record<string, string>;
  excerpt: string;
  anchors: string[];
  raw_content?: string;
  word_count: number;
}

interface PagefindResult {
  id: string;
  score: number;
  data: () => Promise<PagefindResultData>;
}

interface PagefindSearchResponse {
  results?: PagefindResult[];
}

interface PagefindApi {
  search: (query: string) => Promise<PagefindSearchResponse>;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  category: "Post" | "Project" | "Knowledge" | "Product" | "Page";
  tags?: string[];
  date?: string;
}

const categoryIcons: Record<SearchResult["category"], ReactNode> = {
  Post: <FileText size={14} />,
  Project: <Folder size={14} />,
  Knowledge: <BookOpen size={14} />,
  Product: <Package size={14} />,
  Page: <Search size={14} />,
};

const categoryColors: Record<SearchResult["category"], string> = {
  Post: "var(--accent)",
  Project: "var(--green)",
  Knowledge: "var(--accent)",
  Product: "var(--green)",
  Page: "var(--text-tertiary)",
};

const categoryLabels: Record<SearchResult["category"], string> = {
  Post: "Blog Post",
  Project: "Project",
  Knowledge: "Knowledge",
  Product: "Product",
  Page: "Page",
};

function categorizePath(url: string): SearchResult["category"] {
  if (url.startsWith("/blog/")) return "Post";
  if (url.startsWith("/projects/")) return "Project";
  if (url.startsWith("/knowledge")) return "Knowledge";
  if (url.startsWith("/products")) return "Product";
  return "Page";
}

let pagefindLoading: Promise<PagefindApi | null> | null = null;

function getPagefind(): PagefindApi | undefined {
  return (window as Window & typeof globalThis & { pagefind?: PagefindApi }).pagefind;
}

function loadPagefind(): Promise<PagefindApi | null> {
  const existing = getPagefind();
  if (existing) return Promise.resolve(existing);
  if (pagefindLoading) return pagefindLoading;

  pagefindLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind.js";
    script.async = true;
    script.onload = () => {
      requestAnimationFrame(() => {
        resolve(getPagefind() ?? null);
      });
    };
    script.onerror = () => {
      console.warn("Failed to load Pagefind search index");
      reject(new Error("Pagefind load failed"));
    };
    document.head.appendChild(script);
  });

  return pagefindLoading;
}

export function SearchPageClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [groupedResults, setGroupedResults] = useState<{ category: SearchResult["category"]; results: SearchResult[] }[]>([]);
  const [totalIndexed, setTotalIndexed] = useState<number | null>(null);
  const [pagefindReady, setPagefindReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Pagefind on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const pf = await loadPagefind();
        if (cancelled) return;
        if (pf) {
          setPagefindReady(true);
          try {
            const search = await pf.search("");
            setTotalIndexed(search?.results?.length ?? null);
          } catch {}
        }
      } catch {
        if (!cancelled) setPagefindReady(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search with Pagefind (debounced)
  useEffect(() => {
    if (!pagefindReady || query.length < 2) {
      setResults([]);
      setGroupedResults([]);
      setIsLoading(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const pf = getPagefind();
        if (!pf) {
          setIsLoading(false);
          return;
        }

        const searchResult = await pf.search(query);
        if (!searchResult?.results) {
          setResults([]);
          setGroupedResults([]);
          setIsLoading(false);
          return;
        }

        const loaded: SearchResult[] = [];
        for (const r of searchResult.results) {
          try {
            const data = await r.data();
            const category = categorizePath(data.url);
            loaded.push({
              id: r.id,
              title: data.title,
              description: data.excerpt.replace(/<[^>]*>/g, "").slice(0, 160),
              href: data.url,
              category,
            });
          } catch {}
        }

        const categoryOrder: SearchResult["category"][] = [
          "Post", "Project", "Product", "Knowledge", "Page",
        ];
        const grouped: { category: SearchResult["category"]; results: SearchResult[] }[] = [];
        for (const cat of categoryOrder) {
          const catResults = loaded.filter((r) => r.category === cat);
          if (catResults.length > 0) {
            grouped.push({ category: cat, results: catResults });
          }
        }

        setResults(loaded);
        setGroupedResults(grouped);
      } catch (err) {
        console.warn("Pagefind search error:", err);
        setResults([]);
        setGroupedResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, pagefindReady]);

  const navigate = useCallback(
    (item: SearchResult) => {
      if (item.href.startsWith("http")) {
        window.open(item.href, "_blank", "noopener noreferrer");
      } else {
        router.push(item.href);
      }
    },
    [router]
  );

  return (
    <div className="max-w-[720px] mx-auto px-6 pt-32 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Search
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Full-text search across all site content.
        </p>
      </div>

      {/* Search input */}
      <div
        className="flex items-center gap-3 px-4 h-12 rounded-xl border mb-8"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <Search size={16} style={{ color: "var(--text-tertiary)" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search posts, projects, knowledge, products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-geist-sans, sans-serif)",
          }}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search site content"
        />
        {!pagefindReady && (
          <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            Loading index...
          </span>
        )}
      </div>

      {/* Results */}
      {query.length >= 2 && (
        <div>
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
                Searching...
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
                No results for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedResults.map((group) => (
                <div key={group.category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color: categoryColors[group.category] }}>
                      {categoryIcons[group.category]}
                    </span>
                    <span
                      className="text-[11px] font-mono uppercase tracking-wider"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {categoryLabels[group.category]} ({group.results.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => navigate(result)}
                        className="w-full text-left px-4 py-3 rounded-xl flex items-start gap-3 transition-colors border-none cursor-pointer group"
                        style={{
                          background: "transparent",
                          color: "var(--text-primary)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span
                          className="shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded"
                          style={{
                            color: categoryColors[result.category],
                            background: "var(--accent-muted)",
                          }}
                        >
                          {categoryIcons[result.category]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium truncate group-hover:underline">
                            {result.title}
                          </div>
                          <div
                            className="text-[12px] mt-0.5 line-clamp-2"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {result.description}
                          </div>
                        </div>
                        <ArrowRight
                          size={13}
                          className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--accent)" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state / hint */}
      {query.length < 2 && pagefindReady && (
        <div className="py-12 text-center">
          <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
            {totalIndexed ? (
              <>Type at least 2 characters to search across {totalIndexed} indexed pages.</>
            ) : (
              <>Type at least 2 characters to search across the entire site.</>
            )}
          </p>
        </div>
      )}

      {/* Footer stats */}
      {results.length > 0 && (
        <div
          className="mt-8 pt-4 border-t flex items-center justify-between text-[11px] font-mono"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}
        >
          <span>
            {totalIndexed ?? "?"} pages indexed &middot; {results.length} results
          </span>
        </div>
      )}
    </div>
  );
}
