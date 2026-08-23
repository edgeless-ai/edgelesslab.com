"use client";

import { useEffect, useMemo, useState } from "react";

interface SoulSummary {
  slug: string;
  name: string;
  category: string;
  quality_score: number;
  times_used: number;
}

interface SoulsResponse {
  souls: SoulSummary[];
  count: number;
  available?: boolean;
  message?: string;
}

interface CategoryStat {
  name: string;
  count: number;
  avgQuality: number;
  totalQuality: number;
}

async function fetchSouls(category: string, query: string): Promise<SoulsResponse> {
  const url = new URL("/api/souls", window.location.origin);
  if (category && category !== "all") url.searchParams.set("category", category);
  if (query) url.searchParams.set("limit", "200");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`souls endpoint failed (${res.status})`);
  return (await res.json()) as SoulsResponse;
}

export function SoulFactoryBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState<SoulSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    fetchSouls(category, query)
      .then((r) => {
        if (!cancelled) setData(r.souls);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, query, reloadKey]);

  const refetch = () => setReloadKey((k) => k + 1);

  const sourceLabel = "real Soul Factory /v1/souls";

  const filtered = useMemo(
    () =>
      (data ?? []).filter((soul) => {
        const matchesQuery =
          !query ||
          [soul.slug, soul.name, soul.category].some((field) =>
            field.toLowerCase().includes(query.toLowerCase())
          );
        const matchesCategory = category === "all" || soul.category === category;
        return matchesQuery && matchesCategory;
      }),
    [data, query, category]
  );

  const stats: CategoryStat[] = useMemo(() => {
    const byCategory = (data ?? []).reduce((acc, soul) => {
      const key = soul.category || "Uncategorized";
      const current = acc.get(key) ?? { count: 0, avgQuality: 0, totalQuality: 0 };
      current.count += 1;
      current.totalQuality += Number(soul.quality_score || 0);
      current.avgQuality = Number((current.totalQuality / current.count).toFixed(2));
      return acc.set(key, current);
    }, new Map<string, { count: number; avgQuality: number; totalQuality: number }>());
    return [...byCategory].map(([name, value]) => ({ name, ...value }));
  }, [data]);

  const categories = useMemo(
    () => [
      ...new Set(
        (data ?? [])
          .map((soul) => soul.category)
          .filter((c): c is string => Boolean(c))
      ),
    ],
    [data]
  );

  const avgQuality =
    data?.length
      ? Number(
          (
            data.reduce((sum, soul) => sum + Number(soul.quality_score || 0), 0) /
            data.length
          ).toFixed(2)
        )
      : "—";

  return (
    <div className="space-y-6">
      <header className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Source</p>
          <p className="text-sm font-medium">{sourceLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total souls</p>
          <p className="text-sm font-medium">{data?.length ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Avg quality score</p>
          <p className="text-sm font-medium">{avgQuality}</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <aside className="space-y-4 md:col-span-2">
          <div className="space-y-2">
            <input
              className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search souls by name or slug"
            />
            <select
              className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filtered.length} matching souls</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium hover:bg-muted/40"
                onClick={refetch}
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Categories</p>
            <div className="space-y-1">
              {stats.map((stat) => (
                <div
                  key={stat.name}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"
                >
                  <span className="font-medium">{stat.name}</span>
                  <span className="text-muted-foreground">
                    {stat.count} · quality {stat.avgQuality}
                  </span>
                </div>
              ))}
              {!stats.length ? (
                <p className="text-xs text-muted-foreground">No categories yet</p>
              ) : null}
            </div>
          </div>
        </aside>

        <section className="space-y-3 md:col-span-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading Soul Factory...</p>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load souls from the Soul Factory. Verify the upstream service at
              /v1/souls.
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((soul) => (
                <div
                  key={soul.slug}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{soul.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {soul.slug} · {soul.category}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>quality {soul.quality_score}</p>
                    <p>used {soul.times_used}×</p>
                  </div>
                </div>
              ))}
              {!filtered.length ? (
                <p className="text-sm text-muted-foreground">No souls match this filter.</p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
