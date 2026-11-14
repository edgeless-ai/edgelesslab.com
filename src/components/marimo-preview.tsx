"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lazy preview of a published marimo WASM notebook. Use the catalog's admitted
 * URL, not a reconstructed legacy-host URL: newer notebooks live on this site.
 * Pyodide can take ~10-15s to boot before painting over the placeholder.
 */
export function MarimoPreview({ url, title }: { url: string; title: string }) {
  const publishedUrl = new URL(url);
  // Keep primary-domain notebooks same-origin in local static-export checks too.
  const src = publishedUrl.origin === "https://edgelesslab.com"
    ? `${publishedUrl.pathname}${publishedUrl.search}${publishedUrl.hash}`
    : url;
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
          src={src}
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
