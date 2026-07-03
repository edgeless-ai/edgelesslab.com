"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Metaballs } from "@paper-design/shaders-react";

/**
 * CONCEPT D — "Living Cells"
 *
 * Full-bleed hero background: gooey lime/green metaballs merging and
 * dividing against near-black, like an organism or a swarm of agents
 * negotiating state. Reinforces the "living marketplace / immune system"
 * story without tipping into a rave — one shader, one hue family
 * (lime → deep green), low speed, dark editorial scrim over the type.
 *
 * Perf contract:
 * - Exactly one animating WebGL shader (Metaballs), speed capped low.
 * - prefers-reduced-motion -> speed=0, which fully stops the shader's
 *   internal rAF loop (confirmed in @paper-design/shaders: "if set to 0,
 *   rAF will stop entirely so static shaders have no recurring cost").
 * - IntersectionObserver also drives speed to 0 once the hero scrolls
 *   out of view — the shader keeps costing nothing the moment it's not
 *   on screen, not just when the tab is hidden.
 * - Cursor reactivity is a self-terminating ease loop (rAF only runs
 *   while actively easing toward a new pointer target, then cancels
 *   itself) — no perpetual second animation loop competing with the
 *   shader's own.
 * - Disabled entirely on coarse/touch pointers (no listener attached).
 */

const BASE_SPEED = 0.28;
const CURSOR_RANGE = 0.06; // max offsetX/offsetY nudge from pointer, in shader units
const EASE = 0.08;
const EASE_EPSILON = 0.0005;

export function LivingCellsHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [inView, setInView] = useState(true);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const easeRafRef = useRef<number | null>(null);

  // Respect prefers-reduced-motion, live-updating if the user toggles it mid-session
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Pause the shader the moment it scrolls out of view — real cost savings,
  // not just a visual nicety.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const easeToTarget = useCallback(() => {
    setPointer((prev) => {
      const target = pointerTargetRef.current;
      const nx = prev.x + (target.x - prev.x) * EASE;
      const ny = prev.y + (target.y - prev.y) * EASE;
      const settled = Math.abs(target.x - nx) < EASE_EPSILON && Math.abs(target.y - ny) < EASE_EPSILON;
      if (settled) {
        easeRafRef.current = null;
        return target;
      }
      easeRafRef.current = requestAnimationFrame(easeToTarget);
      return { x: nx, y: ny };
    });
  }, []);

  // Cursor-reactive drift — coarse pointers and reduced-motion never attach this
  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointerTargetRef.current = {
        x: Math.max(-1, Math.min(1, nx)) * CURSOR_RANGE,
        y: Math.max(-1, Math.min(1, ny)) * CURSOR_RANGE,
      };
      if (easeRafRef.current == null) {
        easeRafRef.current = requestAnimationFrame(easeToTarget);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (easeRafRef.current != null) cancelAnimationFrame(easeRafRef.current);
    };
  }, [reducedMotion, easeToTarget]);

  const speed = reducedMotion || !inView ? 0 : BASE_SPEED;

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Faint technical grid — same texture language as the rest of the site */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* The living cells — lime/green metaballs merging + dividing, near-black ground */}
      <div className="absolute inset-0">
        <Metaballs
          style={{ width: "100%", height: "100%" }}
          colorBack="#070B06"
          colors={["#C6F24E", "#8FE95A", "#2F6B33", "#123018"]}
          count={8}
          size={0.42}
          scale={1.18}
          fit="cover"
          offsetX={pointer.x}
          offsetY={pointer.y}
          speed={speed}
        />
      </div>

      {/* Editorial scrim: near-opaque behind the headline column, sheer over the shader on the right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(9,9,11,0.97) 0%, rgba(9,9,11,0.90) 28%, rgba(9,9,11,0.62) 52%, rgba(9,9,11,0.30) 74%, rgba(9,9,11,0.16) 100%)",
        }}
      />

      {/* Top/bottom vignette so the shader never fights the nav or CTAs */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 45%, rgba(9,9,11,0.7) 100%)",
        }}
      />

      {/* Static grain — cheap inline SVG turbulence, no JS cost — keeps it editorial, not glossy/rave */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "120px 120px",
        }}
      />
    </div>
  );
}
