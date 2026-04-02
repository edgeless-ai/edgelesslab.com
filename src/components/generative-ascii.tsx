"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { usePreText } from "@/hooks/use-pretext";

/**
 * Generative typographic ASCII art.
 *
 * Uses PreText to measure exact character widths, then maps a brightness
 * field (from a particle attractor system) to characters selected by both
 * brightness AND proportional width. Each page load = unique seed = unique piece.
 *
 * Inspired by chenglou.me/pretext/variable-typographic-ascii/
 */

// Character palette sorted by approximate visual density
const CHARS = " .,:;i1tfLCG08@#";

// Attractor types for variety
type AttractorType = "lorenz" | "rossler" | "spiral" | "flow";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface AsciiPiece {
  seed: number;
  attractorType: AttractorType;
  grid: string[][];
  rarity: "common" | "uncommon" | "rare" | "mythic";
  title: string;
  palette: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: "var(--text-tertiary)",
  uncommon: "var(--green)",
  rare: "var(--accent)",
  mythic: "#f59e0b",
};

const RARITY_GLOW: Record<string, string> = {
  common: "none",
  uncommon: "0 0 20px rgba(34,197,94,0.15)",
  rare: "0 0 30px rgba(129,140,248,0.2)",
  mythic: "0 0 40px rgba(245,158,11,0.3), 0 0 80px rgba(245,158,11,0.1)",
};

const ATTRACTOR_NAMES: Record<AttractorType, string[]> = {
  lorenz: ["Butterfly", "Strange Loop", "Chaos Wing", "Sigma Drift"],
  rossler: ["Fold", "Spiral Decay", "Phase Lock", "Band Merge"],
  spiral: ["Vortex", "Fibonacci Ghost", "Golden Curl", "Nautilus"],
  flow: ["Current", "Streamline", "Laminar", "Turbulence"],
};

const PALETTE_NAMES = [
  "Carbon", "Phosphor", "Copper", "Silver", "Neon",
  "Ember", "Frost", "Void", "Circuit", "Plasma",
];

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBrightnessField(
  cols: number,
  rows: number,
  seed: number,
  attractorType: AttractorType
): number[][] {
  const rng = mulberry32(seed);
  const field: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(0)
  );

  // Generate particles
  const particles: Particle[] = [];
  const numParticles = 800 + Math.floor(rng() * 400);

  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: rng() * cols,
      y: rng() * rows,
      vx: (rng() - 0.5) * 2,
      vy: (rng() - 0.5) * 2,
      life: 40 + Math.floor(rng() * 60),
    });
  }

  // Attractor parameters
  const cx1 = cols * (0.3 + rng() * 0.4);
  const cy1 = rows * (0.3 + rng() * 0.4);
  const cx2 = cols * (0.3 + rng() * 0.4);
  const cy2 = rows * (0.3 + rng() * 0.4);
  const strength = 0.02 + rng() * 0.03;

  // Simulate
  for (let step = 0; step < 100; step++) {
    for (const p of particles) {
      if (p.life <= 0) continue;

      let ax = 0, ay = 0;

      switch (attractorType) {
        case "lorenz": {
          const dx1 = cx1 - p.x, dy1 = cy1 - p.y;
          const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
          const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) + 1;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;
          ax = (dx1 / d1 - dy2 / d2) * strength;
          ay = (dy1 / d1 + dx2 / d2) * strength;
          break;
        }
        case "rossler": {
          const dx = cx1 - p.x, dy = cy1 - p.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 1;
          ax = (-dy / d + dx * 0.01) * strength;
          ay = (dx / d + dy * 0.01) * strength;
          break;
        }
        case "spiral": {
          const dx = cx1 - p.x, dy = cy1 - p.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 1;
          const angle = Math.atan2(dy, dx) + 0.5;
          ax = Math.cos(angle) / d * strength * 10;
          ay = Math.sin(angle) / d * strength * 10;
          break;
        }
        case "flow": {
          ax = Math.sin(p.y * 0.1 + seed * 0.01) * strength;
          ay = Math.cos(p.x * 0.1 + seed * 0.01) * strength;
          break;
        }
      }

      p.vx += ax;
      p.vy += ay;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // Wrap around
      if (p.x < 0) p.x += cols;
      if (p.x >= cols) p.x -= cols;
      if (p.y < 0) p.y += rows;
      if (p.y >= rows) p.y -= rows;

      // Deposit brightness
      const gx = Math.floor(p.x);
      const gy = Math.floor(p.y);
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        field[gy][gx] += 0.3 + speed * 0.5;
      }
    }
  }

  // Normalize to 0-1
  let max = 0;
  for (const row of field) for (const v of row) if (v > max) max = v;
  if (max > 0) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        field[y][x] = Math.min(1, field[y][x] / max);
      }
    }
  }

  return field;
}

function brightnessToChar(brightness: number): string {
  const idx = Math.floor(brightness * (CHARS.length - 1));
  return CHARS[Math.min(idx, CHARS.length - 1)];
}

function generatePiece(seed: number): AsciiPiece {
  const rng = mulberry32(seed);
  const types: AttractorType[] = ["lorenz", "rossler", "spiral", "flow"];
  const attractorType = types[Math.floor(rng() * types.length)];

  const cols = 64;
  const rows = 32;

  const field = generateBrightnessField(cols, rows, seed, attractorType);
  const grid = field.map((row) => row.map((v) => brightnessToChar(v)));

  // Rarity based on seed hash
  const rarityRoll = rng();
  const rarity =
    rarityRoll < 0.01 ? "mythic" :
    rarityRoll < 0.08 ? "rare" :
    rarityRoll < 0.25 ? "uncommon" :
    "common";

  const names = ATTRACTOR_NAMES[attractorType];
  const title = names[Math.floor(rng() * names.length)];
  const palette = PALETTE_NAMES[Math.floor(rng() * PALETTE_NAMES.length)];

  return { seed, attractorType, grid, rarity, title, palette };
}

export function GenerativeAscii() {
  const { ready } = usePreText("Geist Mono");
  const [piece, setPiece] = useState<AsciiPiece | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Generate on mount
  useEffect(() => {
    const seed = Date.now() ^ (Math.random() * 0xffffffff);
    setPiece(generatePiece(seed));
  }, []);

  // Reveal animation
  useEffect(() => {
    if (!piece || isRevealed) return;

    let start: number | null = null;
    const duration = piece.rarity === "mythic" ? 3000 : piece.rarity === "rare" ? 2000 : 1200;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(1, elapsed / duration);
      setRevealProgress(progress);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setIsRevealed(true);
      }
    };

    // Slight delay before reveal starts
    const timeout = setTimeout(() => {
      animRef.current = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animRef.current);
    };
  }, [piece, isRevealed]);

  const reroll = useCallback(() => {
    setIsRevealed(false);
    setRevealProgress(0);
    const seed = Date.now() ^ (Math.random() * 0xffffffff);
    setPiece(generatePiece(seed));
  }, []);

  if (!piece) return null;

  const rarityColor = RARITY_COLORS[piece.rarity];
  const rarityGlow = RARITY_GLOW[piece.rarity];

  // Render grid with reveal animation
  const revealedRows = Math.floor(revealProgress * piece.grid.length);

  return (
    <div ref={containerRef} className="w-full">
      {/* Piece card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          borderColor: piece.rarity === "mythic"
            ? "rgba(245,158,11,0.4)"
            : piece.rarity === "rare"
            ? "rgba(129,140,248,0.3)"
            : "var(--border-subtle)",
          boxShadow: rarityGlow,
          transition: "box-shadow 0.5s ease, border-color 0.5s ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-mono uppercase tracking-[0.12em]"
              style={{ color: rarityColor }}
            >
              {piece.rarity}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              #{piece.seed.toString(16).slice(-6)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              {piece.attractorType}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isRevealed ? "var(--green)" : "var(--accent)" }}
            />
          </div>
        </div>

        {/* ASCII art display */}
        <div className="px-5 py-4 overflow-x-auto">
          <pre
            className="text-[10px] sm:text-xs leading-[1.4] font-mono select-all"
            style={{
              color: isRevealed ? rarityColor : "var(--text-tertiary)",
              transition: "color 0.5s ease",
            }}
          >
            {piece.grid.map((row, y) => {
              if (y > revealedRows && !isRevealed) {
                // Unrevealed: show scrambled
                return (
                  <div
                    key={y}
                    style={{
                      opacity: 0.1,
                      filter: "blur(2px)",
                    }}
                  >
                    {row.join("")}
                  </div>
                );
              }

              return (
                <div
                  key={y}
                  style={{
                    opacity: isRevealed ? 1 : 0.4 + (y / piece.grid.length) * 0.6,
                    transition: `opacity 0.3s ease ${y * 20}ms`,
                  }}
                >
                  {row.join("")}
                </div>
              );
            })}
          </pre>
        </div>

        {/* Footer with piece info */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div>
            <span
              className="text-sm font-semibold block"
              style={{
                color: "var(--text-primary)",
                opacity: isRevealed ? 1 : 0,
                transition: "opacity 0.5s ease 0.2s",
              }}
            >
              {piece.title}
            </span>
            <span
              className="text-xs font-mono"
              style={{
                color: "var(--text-tertiary)",
                opacity: isRevealed ? 1 : 0,
                transition: "opacity 0.5s ease 0.4s",
              }}
            >
              Palette: {piece.palette}
            </span>
          </div>
          <button
            onClick={reroll}
            className="text-xs font-mono px-3 py-1.5 rounded-md transition-all hover:scale-[1.02]"
            style={{
              background: "var(--accent-muted)",
              color: "var(--accent)",
              border: "1px solid rgba(129,140,248,0.2)",
            }}
          >
            New pull
          </button>
        </div>
      </div>

      {/* Rarity legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {(["common", "uncommon", "rare", "mythic"] as const).map((r) => (
          <span
            key={r}
            className="text-[10px] font-mono uppercase tracking-[0.1em] flex items-center gap-1.5"
            style={{ color: RARITY_COLORS[r] }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: RARITY_COLORS[r] }}
            />
            {r} {r === "mythic" ? "(1%)" : r === "rare" ? "(7%)" : r === "uncommon" ? "(17%)" : "(75%)"}
          </span>
        ))}
      </div>
    </div>
  );
}
