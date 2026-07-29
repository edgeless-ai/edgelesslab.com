"use client";

import { useState } from "react";

const POSTERS = [
  "/total-serialism/field-notes/assets/specimens/flow-fields.png",
  "/total-serialism/field-notes/assets/specimens/wave-interference.png",
  "/total-serialism/field-notes/assets/specimens/organic-growth.png",
  "/total-serialism/field-notes/assets/specimens/geometric-primitives.png",
  "/total-serialism/field-notes/assets/specimens/noise-terrain.png",
  "/total-serialism/field-notes/assets/specimens/voronoi.png",
];

function posterForSlug(slug: string) {
  if (slug === "flow-field-particle-ecosystem") return POSTERS[0];
  if (slug === "harmonograph-lissajous") return POSTERS[1];

  let hash = 0;
  for (const character of slug) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return POSTERS[hash % POSTERS.length];
}

export function DemoPreview({ slug, title }: { slug: string; title: string }) {
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tartan = slug === "tartan-weave-synth";

  function deactivate() {
    setActive(false);
    setLoaded(false);
  }

  return (
    <div
      className="group/preview relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-md border"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-base)",
      }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={deactivate}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={deactivate}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{
          backgroundImage: tartan
            ? [
                "repeating-linear-gradient(90deg, transparent 0 9%, rgba(198,242,78,.82) 9% 11%, transparent 11% 26%, rgba(122,162,255,.7) 26% 30%, transparent 30% 50%)",
                "repeating-linear-gradient(0deg, #121820 0 8%, #24382e 8% 19%, #0c0d10 19% 34%, #3f1e24 34% 39%, #121820 39% 50%)",
              ].join(",")
            : `linear-gradient(rgba(9,9,11,.04), rgba(9,9,11,.28)), url("${posterForSlug(slug)}")`,
          opacity: loaded ? 0 : 1,
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {active && (
        <iframe
          src={`/creative-demos/${slug}/index.html`}
          title={`${title}, live preview`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          scrolling="no"
          onLoad={() => window.setTimeout(() => setLoaded(true), 650)}
          // @ts-expect-error `inert` is a valid HTML attribute.
          inert=""
          className="absolute inset-0 h-full w-full"
          style={{ border: 0, pointerEvents: "none", zIndex: 1 }}
        />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-3 p-2 opacity-100 transition-opacity duration-200 group-hover/preview:opacity-0"
        style={{
          background: "linear-gradient(to top, rgba(9,9,11,0.82), transparent)",
        }}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-white/60">
          Poster / hover for live preview
        </span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
        >
          Open
        </span>
      </div>
    </div>
  );
}
