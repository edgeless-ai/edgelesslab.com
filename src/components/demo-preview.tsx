"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live preview of a creative demo — a lazy, perf-safe iframe of the actual
 * standalone generative-art HTML.
 *
 * Perf discipline:
 * - At most MAX_LIVE previews run at once (shared module-level slot manager). Extra
 *   in-view cards wait for a slot and take one as others scroll away — so the page
 *   never has 10-15 canvas/WebGL documents animating on the main thread, and we stay
 *   well under the browser's live-WebGL-context cap (~16).
 * - The iframe mounts only while the card is near the viewport (80px margin) and
 *   UNMOUNTS + releases its slot when scrolled away.
 *
 * A11y: `inert` reliably removes the whole nested browsing context (11 of the demos
 * contain their own focusable controls) from focus order AND the a11y tree — which
 * tabIndex/aria-hidden on the iframe element alone does NOT do. pointer-events:none
 * keeps the whole card a single click target that opens the full demo.
 */

const MAX_LIVE = 4;
let liveCount = 0;
const waiters = new Set<() => void>();

function claimSlot(): boolean {
  if (liveCount < MAX_LIVE) {
    liveCount += 1;
    return true;
  }
  return false;
}
function releaseSlot() {
  liveCount = Math.max(0, liveCount - 1);
  const next = waiters.values().next().value as (() => void) | undefined;
  if (next) {
    waiters.delete(next);
    next();
  }
}

export function DemoPreview({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false); // card is near the viewport
  const [live, setLive] = useState(false); // holds a slot + iframe mounted
  const holdsSlot = useRef(false);

  // Track proximity to the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "80px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Claim/release a live slot based on proximity.
  useEffect(() => {
    if (near && !holdsSlot.current) {
      const tryClaim = () => {
        if (claimSlot()) {
          holdsSlot.current = true;
          setLive(true);
        } else {
          waiters.add(tryClaim); // retry when a slot frees
        }
      };
      tryClaim();
      return () => {
        waiters.delete(tryClaim);
        if (holdsSlot.current) {
          holdsSlot.current = false;
          setLive(false);
          releaseSlot();
        }
      };
    }
  }, [near]);

  return (
    <div
      ref={ref}
      className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-md border"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-base)" }}
    >
      {live ? (
        <iframe
          src={`/creative-demos/${slug}/index.html`}
          title={`${title} — live preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          scrolling="no"
          // @ts-expect-error — `inert` is valid HTML, typed in newer React DOM defs.
          inert=""
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, pointerEvents: "none" }}
        />
      ) : (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "var(--bg-surface-hover)" }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
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
