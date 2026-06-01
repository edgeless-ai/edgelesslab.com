"use client";

import { useState } from "react";
import { PLOTTER } from "@/lib/plotter-stats";

/**
 * Embedded gallery for the pen-plotter-pipeline lab experiment.
 *
 * Shows 9 hero pieces (one per factory) from the pen-plotter autoresearch
 * catalog. Click any tile to open a lightbox with the full image.
 *
 * The lab page would otherwise be a wall of text describing visual art.
 * This fixes the credibility miss the audit caught.
 */

type Plate = {
  id: string;
  factory: string;
  composite: number;
};

const PLATES: Plate[] = [
  { id: "moire-best", factory: "moire", composite: 89.1 },
  { id: "opart-best", factory: "opart", composite: 87.7 },
  { id: "lewitt-best", factory: "lewitt", composite: 84.2 },
  { id: "heerich-best", factory: "heerich", composite: 71.4 },
  { id: "topo-best", factory: "topo", composite: 79.5 },
  { id: "squiggle-best", factory: "squiggle", composite: 83.6 },
  { id: "hatching-best", factory: "hatching", composite: 84.2 },
  { id: "ridgeline-best", factory: "ridgeline", composite: 76.1 },
  { id: "science-best", factory: "science", composite: 80.2 },
];

export function PenPlotterGallery() {
  const [active, setActive] = useState<Plate | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PLATES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p)}
            className="group relative block overflow-hidden rounded-md transition-transform hover:-translate-y-0.5"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
            aria-label={`${p.factory} hero piece, composite ${p.composite}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/lab/pen-plotter-pipeline/${p.id}.png`}
              alt={`${p.factory} best piece`}
              loading="lazy"
              decoding="async"
              className="block w-full h-auto"
              style={{ aspectRatio: "297 / 420", objectFit: "cover", background: "white" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider flex justify-between items-baseline opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "linear-gradient(to top, rgba(12,10,8,0.85), transparent)",
                color: "rgba(243,237,221,0.95)",
              }}
            >
              <span>{p.factory}</span>
              <span style={{ color: "var(--accent)" }}>{p.composite.toFixed(1)}</span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-[12px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        9 of {PLOTTER.pieces} specimens · top piece per factory ·{" "}
        <a
          href="/pen-plotter/"
          className="underline hover:no-underline"
          style={{ color: "var(--accent)" }}
        >
          view the full field journal →
        </a>
      </p>

      {/* Lightbox */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ background: "rgba(12,10,8,0.92)", backdropFilter: "blur(14px)" }}
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${active.factory} piece, composite ${active.composite}`}
        >
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/lab/pen-plotter-pipeline/${active.id}.png`}
              alt={`${active.factory} best piece`}
              className="block max-h-[85vh] mx-auto"
              style={{ background: "white" }}
            />
            <div
              className="mt-4 flex justify-between items-baseline text-[11px] font-mono uppercase tracking-wider"
              style={{ color: "rgba(243,237,221,0.7)" }}
            >
              <span>
                <strong style={{ color: "rgba(243,237,221,1)" }}>{active.factory}</strong>{" "}
                · best piece
              </span>
              <span>
                composite{" "}
                <strong style={{ color: "var(--accent)" }}>{active.composite.toFixed(1)}</strong>
              </span>
            </div>
            <button
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-lg font-mono"
              style={{
                background: "rgba(243,237,221,0.1)",
                color: "rgba(243,237,221,0.95)",
                border: "1px solid rgba(243,237,221,0.25)",
              }}
              aria-label="Close lightbox"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
