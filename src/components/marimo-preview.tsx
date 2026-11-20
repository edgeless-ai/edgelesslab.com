"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { admitMarimoPreviews, PREVIEW_SETTLE_MS } from "@/lib/marimo-preview-admission";

const AdmittedPreviews = createContext<ReadonlySet<string>>(new Set());

/** One admission owner for the whole gallery, not one independent budget per card. */
export function MarimoPreviewGallery({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [admitted, setAdmitted] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-marimo-preview]") ?? []);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const select = () => admitMarimoPreviews(elements.map((el) => ({
      id: el.dataset.marimoPreview!, ...el.getBoundingClientRect().toJSON(),
    })), window.innerWidth, window.innerHeight);
    const update = () => {
      clearTimeout(timer);
      const next = new Set(select());
      // Release departures immediately; allow scrolling to settle before booting
      // a replacement row's Pyodide runtimes. No offscreen preload admission.
      setAdmitted((previous) => new Set([...previous].filter((id) => next.has(id))));
      timer = setTimeout(() => setAdmitted(new Set(select())), PREVIEW_SETTLE_MS);
    };
    const observer = new IntersectionObserver(update, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    elements.forEach((el) => observer.observe(el));
    // Fully visible rows can exchange center priority without crossing an
    // observer threshold. Re-rank on scroll too, but only boot after settling.
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <AdmittedPreviews.Provider value={admitted}>
    <div ref={root} className="contents">{children}</div>
  </AdmittedPreviews.Provider>;
}

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
  const inView = useContext(AdmittedPreviews).has(url);

  return (
    <div
      data-marimo-preview={url}
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
