"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Lime Aurora — the hero's single signature background shader.
 *
 * A slow, editorial MeshGradient drifting from near-black through deep
 * green into a single electric-lime bloom. Sits behind the hero copy as
 * an absolutely-positioned layer; a two-part scrim (left-to-right +
 * bottom-to-top) keeps the headline/CTA column at AA contrast while the
 * lime bloom is left free to breathe on the right, behind the ASCII panel.
 *
 * Perf/motion contract:
 * - Exactly one shader canvas, low speed (0.22).
 * - Freezes to a static frame (speed=0) on prefers-reduced-motion.
 * - Also freezes when the tab is hidden (visibilitychange) to avoid
 *   burning GPU/battery on background tabs.
 * - This component is client-only; mount it via next/dynamic ssr:false
 *   from the hero, same as the component it replaces.
 */
export function LimeAuroraBackground() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

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
      <MeshGradient
        colors={["#07090A", "#0E2A16", "#1C4A29", "#C6F24E"]}
        distortion={0.75}
        swirl={0.18}
        grainMixer={0.25}
        grainOverlay={0.05}
        scale={1.15}
        offsetX={0.08}
        offsetY={-0.05}
        speed={animate ? 0.22 : 0}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Left→right scrim: keeps headline/CTA column at AA contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.72) 32%, rgba(9,9,11,0.28) 58%, rgba(9,9,11,0.05) 78%)",
        }}
      />

      {/* Bottom→top scrim: protects the CTA row (hero content bottom-aligns on md+) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(9,9,11,0.55) 0%, rgba(9,9,11,0) 42%)",
        }}
      />

      {/* Outer vignette: quiets the frame edges, editorial rather than rave-bright */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 65% 45%, transparent 35%, rgba(9,9,11,0.5) 85%)",
        }}
      />
    </div>
  );
}
