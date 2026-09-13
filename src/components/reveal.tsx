"use client";

import { createElement, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Stagger offset in seconds when several reveals sit in a row. */
  delay?: number;
  /** Rise distance in px before settling. */
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
};

/**
 * Scroll-into-view reveal: blur + rise, once.
 *
 * Robustness: the resting/default state is VISIBLE, so content is never lost if
 * JS is disabled, the observer never fires, or hydration is delayed. On mount
 * (pre-paint, via useLayoutEffect) it arms the hidden state, then reveals when
 * the element scrolls into view, with a failsafe timeout as a backstop.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  // "shown" by default -> safe fallback everywhere.
  const [state, setState] = useState<"shown" | "pending">("shown");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // stay shown, no animation

    setState("pending"); // arm hidden state before paint
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setState("shown");
      observer.disconnect();
      clearTimeout(timer);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(el);
    // Backstop: never leave content hidden longer than this.
    const timer = setTimeout(reveal, 1400);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `reveal${className ? ` ${className}` : ""}`,
      "data-reveal": state,
      style: {
        ["--reveal-y" as string]: `${y}px`,
        ["--reveal-delay" as string]: `${delay}s`,
      },
    },
    children
  );
}
