"use client";

import { useEffect, useState } from "react";
import { GodRays, Dithering } from "@paper-design/shaders-react";

/**
 * Terminal God-Rays — Concept B hero background.
 *
 * Electric-lime rays fan out from the upper-right corner (behind the ASCII
 * panel, away from the headline), washing into near-black. A frozen
 * Bayer-dithered grain layer sits on top for a CRT / terminal-phosphor
 * texture — on-brand with the ASCII heritage without reading as decorative
 * noise. Dramatic and techy, but the beam is kept low-intensity and the
 * left column gets a hard scrim so headline/CTA contrast stays AA.
 *
 * Perf/motion contract (matches lime-aurora-background.tsx):
 * - Exactly ONE animating shader canvas (GodRays). The Dithering layer is
 *   always speed=0 — a static grain texture, never a second moving shader.
 * - GodRays freezes to a static frame (speed=0) on prefers-reduced-motion.
 * - Also freezes when the tab is hidden (visibilitychange) to avoid
 *   burning GPU/battery in background tabs.
 * - Client-only: mount via next/dynamic ssr:false from the hero.
 */
export function TerminalGodRays() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      const reduced = reduceMotionQuery.matches;
      const hidden = document.visibilityState === "hidden";
      setAnimate(!reduced && !hidden);
    };

    evaluate();

    reduceMotionQuery.addEventListener("change", evaluate);
    document.addEventListener("visibilitychange", evaluate);
    return () => {
      reduceMotionQuery.removeEventListener("change", evaluate);
      document.removeEventListener("visibilitychange", evaluate);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Signature shader: lime god-rays fanning from the upper-right corner */}
      <GodRays
        colorBack="#07090A"
        colorBloom="#123018"
        colors={["#C6F24E", "#8FD13F", "#34D399"]}
        density={0.45}
        spotty={0.18}
        intensity={0.6}
        bloom={0.4}
        midSize={0.2}
        midIntensity={0.35}
        scale={1.35}
        rotation={12}
        offsetX={0.34}
        offsetY={-0.3}
        speed={animate ? 0.24 : 0}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Static CRT/phosphor grain — Bayer dither, frozen (speed=0 always) */}
      <Dithering
        colorBack="rgba(7, 9, 10, 0)"
        colorFront="rgba(198, 242, 78, 0.05)"
        shape="simplex"
        type="8x8"
        size={2.5}
        scale={1}
        speed={0}
        style={{
          width: "100%",
          height: "100%",
          mixBlendMode: "overlay",
          opacity: 0.5,
        }}
      />

      {/* Left→right scrim: keeps headline/CTA column at AA contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.94) 0%, rgba(9,9,11,0.78) 34%, rgba(9,9,11,0.32) 60%, rgba(9,9,11,0.06) 80%)",
        }}
      />

      {/* Bottom→top scrim: protects the CTA row (hero content bottom-aligns on md+) */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0) 42%)",
        }}
      />

      {/* Outer vignette: quiets the frame edges, editorial rather than rave-bright */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 72% 32%, transparent 30%, rgba(9,9,11,0.55) 88%)",
        }}
      />
    </div>
  );
}
