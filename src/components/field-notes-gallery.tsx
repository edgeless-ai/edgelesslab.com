"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { DemoPreview } from "@/components/demo-preview";
import type { FieldNote } from "@/lib/field-note-types";

type Scope = "featured" | "curated" | "all";
type Sort = "signal" | "az" | "category";

export function FieldNotesGallery({ notes }: { notes: FieldNote[] }) {
  const [scope, setScope] = useState<Scope>("featured");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<Sort>("signal");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () =>
      Array.from(new Set(notes.map((note) => note.category))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [notes]
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = notes.filter((note) => {
      if (scope === "featured" && !note.featured) return false;
      if (scope === "curated" && !note.curated) return false;
      if (category !== "All" && note.category !== category) return false;
      if (!normalizedQuery) return true;
      return [
        note.title,
        note.description,
        note.category,
        ...note.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    if (sort === "az") {
      return result.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sort === "category") {
      return result.sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.title.localeCompare(b.title)
      );
    }
    return result;
  }, [category, notes, query, scope, sort]);

  const curatedCount = notes.filter((note) => note.curated).length;
  const featuredCount = notes.filter((note) => note.featured).length;

  return (
    <>
      <section
        aria-label="Field Notes controls"
        className="border-y px-5 py-5 sm:px-6"
        style={{ borderColor: "var(--paper-rule)" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="lab-metadata mb-3" style={{ color: "var(--ink-faint)" }}>
              Collection
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "featured", label: `Featured ${featuredCount}` },
                { value: "curated", label: `Curated ${curatedCount}` },
                { value: "all", label: `Full archive ${notes.length}` },
              ].map((option) => {
                const active = scope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setScope(option.value as Scope)}
                    className="border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors"
                    style={{
                      borderColor: active ? "var(--ink)" : "var(--paper-rule)",
                      background: active ? "var(--ink)" : "transparent",
                      color: active ? "var(--paper)" : "var(--ink-soft)",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">Search Field Notes</span>
              <Search
                aria-hidden="true"
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ink-faint)" }}
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the archive"
                className="h-10 w-full border bg-transparent pl-9 pr-3 font-mono text-xs outline-none"
                style={{
                  borderColor: "var(--paper-rule)",
                  color: "var(--ink)",
                }}
              />
            </label>
            <label>
              <span className="sr-only">Sort Field Notes</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="h-10 border bg-transparent px-3 font-mono text-xs uppercase"
                style={{
                  borderColor: "var(--paper-rule)",
                  color: "var(--ink-soft)",
                }}
              >
                <option value="signal">Curator signal</option>
                <option value="az">A to Z</option>
                <option value="category">By category</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 flex gap-x-5 gap-y-2 overflow-x-auto pb-1">
          {["All", ...categories].map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className="shrink-0 border-b pb-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors"
                style={{
                  borderColor: active ? "var(--malachite)" : "transparent",
                  color: active ? "var(--malachite)" : "var(--ink-faint)",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between px-5 py-5 sm:px-6">
        <p className="lab-metadata" style={{ color: "var(--ink-faint)" }}>
          Showing {filtered.length} artifacts
        </p>
        <p className="hidden font-mono text-[11px] sm:block" style={{ color: "var(--ink-faint)" }}>
          Live previews mount only when visible
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-px border-y sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note, index) => {
            const lead = sort === "signal" && index === 0 && note.featured;
            return (
              <article
                key={note.slug}
                className={lead ? "sm:col-span-2" : ""}
                style={{
                  background: "var(--ink)",
                  borderColor: "var(--ink)",
                }}
              >
                <Link
                  href={`/creative-demos/${note.slug}/`}
                  prefetch={false}
                  className="group block h-full p-4 sm:p-5"
                  style={{
                    background: lead ? "var(--paper-deep)" : "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  <DemoPreview slug={note.slug} title={note.title} />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em]"
                        style={{ color: "var(--malachite)" }}
                      >
                        {note.category}
                        {note.citedPlot ? " / cited computation" : ""}
                      </div>
                      <h2
                        className={`font-editorial leading-[1.02] ${
                          lead ? "text-3xl sm:text-4xl" : "text-2xl"
                        }`}
                      >
                        {note.title}
                      </h2>
                    </div>
                    <ArrowUpRight
                      aria-hidden="true"
                      size={18}
                      className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      style={{ color: "var(--malachite)" }}
                    />
                  </div>

                  <p
                    className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {note.description}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] uppercase tracking-[0.08em]"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {tag}
                      </span>
                    ))}
                    {note.hasControls && (
                      <span
                        className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em]"
                        style={{ color: "var(--malachite)" }}
                      >
                        interactive
                      </span>
                    )}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="border-y px-6 py-20 text-center" style={{ borderColor: "var(--paper-rule)" }}>
          <p className="font-editorial text-2xl">No study matches that route.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("All");
              setScope("all");
            }}
            className="mt-4 font-mono text-xs uppercase underline underline-offset-4"
            style={{ color: "var(--malachite)" }}
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
