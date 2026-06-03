"use client";

import { Search, FileText, Folder, BookOpen, Package, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onOpenCommandPalette } from "@/lib/command-palette-events";

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
  Post: <FileText size={13} />,
  Project: <Folder size={13} />,
  Knowledge: <BookOpen size={13} />,
  Product: <Package size={13} />,
  Page: <Search size={13} />,
};

const categoryColors: Record<SearchResult["category"], string> = {
  Post: "var(--accent)",
  Project: "var(--green)",
  Knowledge: "var(--accent)",
  Product: "var(--green)",
  Page: "var(--text-tertiary)",
};

// Map URL paths to categories
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
      // Give Pagefind a tick to initialize its internal state
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

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalIndexed, setTotalIndexed] = useState<number | null>(null);
  const [pagefindReady, setPagefindReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Pagefind when palette opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function init() {
      const pf = await loadPagefind();
      if (cancelled) return;
      if (pf) {
        setPagefindReady(true);
        // Get total indexed count
        try {
          const search = await pf.search("");
          setTotalIndexed(search?.results?.length ?? null);
        } catch {}
      }
    }
    init();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Search with Pagefind (debounced)
  useEffect(() => {
    if (!pagefindReady || query.length < 2) {
      const frame = requestAnimationFrame(() => setResults([]));
      return () => cancelAnimationFrame(frame);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const pf = getPagefind();
        if (!pf) return;

        const searchResult = await pf.search(query);
        if (!searchResult?.results) {
          setResults([]);
          return;
        }

        // Load full data for each result
        const loaded: SearchResult[] = [];
        for (const r of searchResult.results.slice(0, 16)) {
          try {
            const data = await r.data();
            const category = categorizePath(data.url);
            loaded.push({
              id: r.id,
              title: data.title,
              description: data.excerpt.replace(/<[^>]*>/g, "").slice(0, 120),
              href: data.url,
              category,
            });
          } catch {}
        }

        // Group by category
        const categoryOrder: SearchResult["category"][] = [
          "Post", "Project", "Product", "Knowledge", "Page",
        ];
        const grouped: { category: SearchResult["category"]; results: SearchResult[] }[] = [];
        for (const cat of categoryOrder) {
          const catResults = loaded.filter((r) => r.category === cat);
          if (catResults.length > 0) {
            grouped.push({ category: cat, results: catResults.slice(0, 4) });
          }
        }

        const finalResults = grouped.flatMap((g) => g.results).slice(0, 16);
        setResults(finalResults);
        setSelectedIndex(0);
      } catch (err) {
        console.warn("Pagefind search error:", err);
        setResults([]);
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, pagefindReady]);

  // Keyboard shortcut: Cmd+K / Ctrl+K, plus custom event from nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    const unsub = onOpenCommandPalette(() => setIsOpen((open) => !open));
    return () => {
      window.removeEventListener("keydown", handler);
      unsub();
    };
  }, []);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  const navigate = useCallback(
    (item: SearchResult) => {
      setIsOpen(false);
      if (item.href.startsWith("http")) {
        window.open(item.href, "_blank", "noopener noreferrer");
      } else {
        router.push(item.href);
      }
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            navigate(results[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [results, selectedIndex, navigate]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current || !results.length) return;
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results.length]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0, 0, 0, 0.7)" }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[580px] rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-5 h-14 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Search size={16} style={{ color: "var(--text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search posts, projects, knowledge, products..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist-sans, sans-serif)",
            }}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search site content"
          />
          <kbd
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: "var(--text-tertiary)", background: "var(--bg-surface)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Loading / Ready hint */}
        {!pagefindReady && query.length < 2 && (
          <div className="px-5 py-3">
            <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              Loading full-text search index&hellip;
            </p>
          </div>
        )}

        {/* Results */}
        {query.length >= 2 && (
          <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
            {!pagefindReady ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Loading search index&hellip;
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-mono" style={{ color: "var(--text-tertiary)" }}>
                  No results for &quot;{query}&quot;
                </p>
              </div>
            ) : (
              <div>
                {results.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={result.id}
                      data-index={index}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className="w-full text-left px-5 py-2.5 flex items-start gap-3 transition-colors border-none cursor-pointer"
                      style={{
                        background: isSelected ? "var(--bg-surface-hover)" : "transparent",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span
                        className="shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded"
                        style={{
                          color: categoryColors[result.category],
                          background: "var(--accent-muted)",
                        }}
                      >
                        {categoryIcons[result.category]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium truncate">{result.title}</div>
                        <div
                          className="text-[11px] mt-0.5 line-clamp-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {result.description}
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-mono mt-0.5"
                        style={{ color: categoryColors[result.category] }}
                      >
                        {result.category}
                      </span>
                      {isSelected && (
                        <ArrowRight
                          size={13}
                          className="shrink-0 mt-0.5"
                          style={{ color: "var(--accent)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Hint footer */}
        {query.length < 2 && pagefindReady && (
          <div className="px-5 py-3">
            <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {totalIndexed ? (
                <>
                  Full-text search across all {totalIndexed} pages &middot; type at least 2
                  characters
                </>
              ) : (
                <>
                  Full-text search across the entire site &middot; type at least 2 characters
                </>
              )}
            </p>
          </div>
        )}

        {/* Footer stats */}
        {results.length > 0 && (
          <div
            className="px-5 py-2.5 border-t flex items-center justify-between text-[10px] font-mono"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}
          >
            <span>
              {totalIndexed ?? "?"} pages indexed &middot; {results.length} results
            </span>
            <span>
              <kbd className="px-1">&uarr;</kbd> <kbd className="px-1">&darr;</kbd> navigate
              &middot; <kbd className="px-1">&crarr;</kbd> open
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
