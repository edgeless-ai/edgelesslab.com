"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref and a boolean indicating whether the element is in the viewport.
 * Once triggered, stays true (no exit animation).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => setInView(true);

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(reveal);
      return () => cancelAnimationFrame(frame);
    }

    // threshold 0 + bottom rootMargin: fire as soon as ANY pixel enters.
    // A fractional threshold (e.g. 0.12) can never be satisfied by a section
    // taller than ~8x the viewport, leaving it stuck at opacity:0 forever —
    // that was the homepage mid-page dead-zone (Featured/Stack/Products).
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(el);

    // Safety net: never leave content permanently hidden if the observer
    // fails to fire. Below-fold content fading in after a beat is
    // imperceptible; permanently invisible products are not.
    const fallback = window.setTimeout(reveal, 2000);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold]);

  return [ref, inView];
}
