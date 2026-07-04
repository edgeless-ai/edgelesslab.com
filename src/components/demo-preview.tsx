"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of a creative demo — a lazy iframe of the actual standalone
 * generative-art HTML.
 *
 * Perf: the iframe mounts only while the card is near the viewport
 * (IntersectionObserver, 150px margin) and UNMOUNTS when scrolled away — so
 * only the handful of on-screen demos ever run their canvas/WebGL loops (of 38
 * demos only ~7 use WebGL, scattered, so this stays well under the browser's
 * live-context cap in practice).
 *
 * A11y: `inert` reliably removes the whole nested browsing context (11 demos
 * contain their own focusable controls) from focus order + the a11y tree, which
 * tabIndex/aria-hidden on the iframe alone do NOT. pointer-events:none keeps the
 * whole card a single click target that opens the full demo.
 */
export function DemoPreview({ slug, title }: { slug: string; title: string }) {
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
          src={`/creative-demos/${slug}/index.html`}
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
      {/* Loading/placeholder shimmer sits UNDER the iframe (which paints over it once ready). */}
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
