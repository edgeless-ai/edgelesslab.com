"use client";

import { useEffect, useRef, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

/**
 * RisoDitherField — "Concept C"
 *
 * A risograph/halftone-print treatment for the hero's right-column panel.
 * One animating WebGL layer (Dithering, halftone dot pattern, low speed)
 * plus purely static CSS "print" texture on top: a warm-ink misregistration
 * offset (the classic riso two-plate wobble), a fine paper-grain overlay,
 * and print registration marks + a plate caption. Nothing on top of the
 * canvas animates — nothing extra is drawn per frame.
 *
 * Brand palette only: near-black, electric lime, deep green + one warm
 * riso ink (flame-orange) used sparingly. No indigo.
 */

const INK_BLACK = "#0a0d08";
const LIME = "#c6f24e";
const DEEP_GREEN = "#0f2417";
const WARM_INK = "#ff5a36"; // riso "flame red/orange" — the one warm accent

// Tiny halftone dot pattern, tinted warm, used as the misregistered "second plate".
// Pure CSS background (no canvas, no JS animation) — classic riso print artifact
// where each ink plate is printed a fraction of a millimeter off-register.
const WARM_PLATE_DOTS =
  "radial-gradient(circle, rgba(255,90,54,0.55) 0.6px, transparent 0.7px)";

// Fine paper-grain noise, static SVG feTurbulence baked into a data-URI.
// Rendered once, never re-generated, no per-frame cost.
const GRAIN_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>`
  );

export function RisoDitherField() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Extra perf courtesy: freeze the shader entirely when the panel scrolls
  // out of view or the tab is backgrounded, on top of the required
  // reduced-motion guard. Native APIs only, no new deps.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    const onVisibility = () => setInView(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const animate = !reducedMotion && inView;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        border: `1px solid rgba(198,242,78,0.22)`,
        background: INK_BLACK,
      }}
      aria-hidden="true"
    >
      {/* Plate 1: the animating halftone dither field — the only moving layer */}
      <Dithering
        colorBack={DEEP_GREEN}
        colorFront={LIME}
        shape="dots"
        type="8x8"
        size={2.4}
        scale={1.15}
        speed={animate ? 0.22 : 0}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* Plate 2 (static): warm-ink halftone plate, offset a few px —
          riso misregistration artifact. Pure CSS, zero animation cost. */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          transform: "translate(3px, -2px)",
          backgroundImage: WARM_PLATE_DOTS,
          backgroundSize: "5px 5px",
          opacity: 0.5,
        }}
      />

      {/* Static paper-grain texture */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("${GRAIN_DATA_URI}")`,
          backgroundSize: "160px 160px",
          opacity: 0.16,
        }}
      />

      {/* Vignette so any overlaid caption/marks stay legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(10,13,8,0.65) 0%, rgba(10,13,8,0) 28%), radial-gradient(120% 90% at 50% 50%, rgba(10,13,8,0) 55%, rgba(10,13,8,0.55) 100%)",
        }}
      />

      {/* Print registration marks — top-left + bottom-right crosshairs */}
      <RegistrationMark className="absolute top-4 left-4" />
      <RegistrationMark className="absolute bottom-4 right-4 rotate-180" />

      {/* Plate caption, riso/print-shop convention */}
      <div
        className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.16em]"
        style={{ color: LIME, opacity: 0.75 }}
      >
        Plate 04 &middot; <span style={{ color: WARM_INK }}>Riso Dither</span>
      </div>
    </div>
  );
}

function RegistrationMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      style={{ opacity: 0.45 }}
    >
      <circle cx="11" cy="11" r="6" stroke={LIME} strokeWidth="1" />
      <path d="M11 0V22M0 11H22" stroke={LIME} strokeWidth="1" />
    </svg>
  );
}
