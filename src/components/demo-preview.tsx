"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of a creative demo — a lazy, perf-safe iframe of the actual
 * standalone generative-art HTML.
 *
 * Perf discipline: the iframe mounts only while the card is near the viewport
 * (IntersectionObserver, 300px rootMargin) and UNMOUNTS when scrolled away, so
 * only the handful of visible demos are ever running their canvas/WebGL loops.
 * pointer-events:none so the whole card stays one click target (opens the demo).
 */
export function DemoPreview({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-md border"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-base)" }}
    >
      {inView ? (
        <iframe
          src={`/creative-demos/${slug}/index.html`}
          title={`${title} — live preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          scrolling="no"
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, pointerEvents: "none" }}
        />
      ) : (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "var(--bg-surface-hover)" }}
        />
      )}
      {/* "Open" hint on hover — signals the preview is live + clickable. */}
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
