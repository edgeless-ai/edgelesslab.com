"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * Hero shader background — a BOLD lime aurora that is meant to be SEEN.
 *
 * A slow MeshGradient drifting near-black → deep green → electric lime, with
 * the lime free to bloom across the right ~55% of the hero (behind the ASCII
 * panel) while a single left-side scrim keeps the headline column at AA
 * contrast. Deliberately less restrained than a typical SaaS gradient — the
 * generative layer is the point, not a whisper behind it.
 *
 * Perf/motion: one WebGL canvas, low speed; freezes (speed 0) on
 * prefers-reduced-motion or a hidden tab. Client-only (mount via next/dynamic).
 */
export function HeroShaderBg() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () =>
      setAnimate(!mq.matches && document.visibilityState !== "hidden");
    evaluate();
    mq.addEventListener("change", evaluate);
    document.addEventListener("visibilitychange", evaluate);
    return () => {
      mq.removeEventListener("change", evaluate);
      document.removeEventListener("visibilitychange", evaluate);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <MeshGradient
        colors={["#08120A", "#12421A", "#63C023", "#C6F24E", "#0B1E0D"]}
        distortion={0.92}
        swirl={0.42}
        grainMixer={0.28}
        grainOverlay={0.08}
        scale={1.25}
        offsetX={0.12}
        offsetY={-0.04}
        speed={animate ? 0.28 : 0}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Single left→right scrim — protects the headline column only, lets the
          lime bloom breathe across the right of the frame. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.90) 0%, rgba(9,9,11,0.62) 30%, rgba(9,9,11,0.18) 55%, rgba(9,9,11,0) 74%)",
        }}
      />
      {/* Faint bottom fade so the CTA row (bottom-aligned on md+) stays legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(9,9,11,0.45) 0%, rgba(9,9,11,0) 34%)",
        }}
      />
    </div>
  );
}
