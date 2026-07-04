"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of a marimo WASM notebook — same lazy-iframe pattern as
 * DemoPreview (creative demos), pointed at the WASM-exported app under
 * /marimo/<slug>/index.html.
 *
 * marimo's Pyodide runtime takes ~10-15s to boot inside the iframe, so the
 * pulse placeholder behind it is expected to show for longer than the p5.js
 * creative previews before the notebook paints over it.
 */
// The 12 WASM notebooks (each bundles a 27MB Pyodide runtime → 322MB total) are
// hosted on Cloudflare Pages, off the main GitHub repo. Swap this base for a custom
// subdomain (e.g. marimo.edgelesslab.com) once DNS is set.
const MARIMO_BASE = "https://edgeless-marimo.pages.dev";

export function MarimoPreview({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "150px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group/preview relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-md border"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-base)" }}
    >
      {inView && (
        <iframe
          src={`${MARIMO_BASE}/${slug}/`}
          title={`${title} — live preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          scrolling="no"
          // @ts-expect-error — `inert` is a valid HTML attribute.
          inert=""
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, pointerEvents: "none" }}
        />
      )}
      {/* Loading/placeholder shimmer sits UNDER the iframe (which paints over it once Pyodide boots). */}
      <div
        className="absolute inset-0 -z-10 animate-pulse"
        style={{ background: "var(--bg-surface-hover)" }}
      />
      {/* 'Open' hint on hover — signals the preview is live + clickable. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "linear-gradient(to top, rgba(9,9,11,0.72), transparent)" }}
      >
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
        >
          Open ↗
        </span>
      </div>
    </div>
  );
}
