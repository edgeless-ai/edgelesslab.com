"use client";

import { useRef, useEffect, useCallback } from "react";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

/**
 * Fully procedural hero background — unique every visit.
 *
 * 600 particles flow through one of 4 attractor algorithms (Lorenz, Rossler,
 * Spiral, Flow) with randomized parameters. Rendered as connected trail lines
 * with soft glow, producing organic flowing structures. Zero network cost.
 */

type AttractorType = "lorenz" | "rossler" | "spiral" | "flow";

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hueOffset: number;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ATTRACTOR_TYPES: AttractorType[] = ["lorenz", "rossler", "spiral", "flow"];

// Color palettes — [hue, saturation]. Locked to the lime/Exchange family so every
// visit reads on-brand: electric lime → chartreuse → emerald, with one teal for range.
const PALETTES: [number, number][] = [
  [78, 95],   // electric lime
  [90, 88],   // green
  [66, 96],   // chartreuse
  [110, 78],  // emerald
  [84, 92],   // lime-green
  [150, 68],  // teal-green (range)
];

interface SimState {
  particles: Particle[];
  type: AttractorType;
  seed: number;
  rng: () => number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  cx3: number;
  cy3: number;
  strength: number;
  baseHue: number;
  baseSat: number;
  hueRange: number;
  trailFade: number;
  time: number;
}

function createParticles(
  count: number,
  width: number,
  height: number,
  rng: () => number
): Particle[] {
  return Array.from({ length: count }, () => {
    const x = rng() * width;
    const y = rng() * height;
    return {
      x,
      y,
      prevX: x,
      prevY: y,
      vx: (rng() - 0.5) * 2,
      vy: (rng() - 0.5) * 2,
      life: Math.floor(rng() * 250) + 80,
      maxLife: 330,
      hueOffset: (rng() - 0.5) * 40,
    };
  });
}

function stepParticle(
  p: Particle,
  state: SimState,
  width: number,
  height: number
) {
  p.prevX = p.x;
  p.prevY = p.y;

  let ax = 0,
    ay = 0;
  const { type, cx1, cy1, cx2, cy2, cx3, cy3, strength, time } = state;

  switch (type) {
    case "lorenz": {
      const dx1 = cx1 - p.x, dy1 = cy1 - p.y;
      const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
      const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) + 1;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;
      // Third attractor adds asymmetry
      const dx3 = cx3 - p.x, dy3 = cy3 - p.y;
      const d3 = Math.sqrt(dx3 * dx3 + dy3 * dy3) + 1;
      ax = (dx1 / d1 - dy2 / d2 + dx3 / d3 * 0.3) * strength;
      ay = (dy1 / d1 + dx2 / d2 - dy3 / d3 * 0.3) * strength;
      break;
    }
    case "rossler": {
      const dx = cx1 - p.x, dy = cy1 - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1;
      const drift = Math.sin(time * 0.002) * 0.005;
      ax = (-dy / d + dx * (0.008 + drift)) * strength;
      ay = (dx / d + dy * (0.008 + drift)) * strength;
      // Perturb with second center
      const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;
      ax += (dy2 / d2) * strength * 0.2;
      ay -= (dx2 / d2) * strength * 0.2;
      break;
    }
    case "spiral": {
      const dx = cx1 - p.x, dy = cy1 - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1;
      const angle = Math.atan2(dy, dx) + 0.3 + Math.sin(time * 0.001) * 0.2;
      ax = (Math.cos(angle) / d) * strength * 8;
      ay = (Math.sin(angle) / d) * strength * 8;
      // Second spiral center creates interference
      const dx2 = cx2 - p.x, dy2 = cy2 - p.y;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 1;
      const angle2 = Math.atan2(dy2, dx2) - 0.5;
      ax += (Math.cos(angle2) / d2) * strength * 3;
      ay += (Math.sin(angle2) / d2) * strength * 3;
      break;
    }
    case "flow": {
      // Perlin-like flow field with time evolution
      const scale = 0.002 + Math.sin(time * 0.0005) * 0.0005;
      const n1 = Math.sin(p.x * scale + time * 0.001) * Math.cos(p.y * scale * 0.7);
      const n2 = Math.cos(p.x * scale * 0.8 - time * 0.0008) * Math.sin(p.y * scale);
      ax = n1 * strength * 1.5;
      ay = n2 * strength * 1.5;
      // Gentle pull toward center to prevent drift
      ax += (width * 0.5 - p.x) * 0.00001;
      ay += (height * 0.5 - p.y) * 0.00001;
      break;
    }
  }

  p.vx += ax;
  p.vy += ay;
  p.vx *= 0.982;
  p.vy *= 0.982;
  p.x += p.vx;
  p.y += p.vy;
  p.life--;

  // Respawn
  if (p.life <= 0) {
    p.x = state.rng() * width;
    p.y = state.rng() * height;
    p.prevX = p.x;
    p.prevY = p.y;
    p.vx = (state.rng() - 0.5) * 2;
    p.vy = (state.rng() - 0.5) * 2;
    p.life = Math.floor(state.rng() * 250) + 80;
    p.hueOffset = (state.rng() - 0.5) * 40;
  }

  // Soft boundary — bounce with damping instead of hard wrap
  const margin = 20;
  if (p.x < -margin) { p.x = -margin; p.vx *= -0.5; }
  if (p.x > width + margin) { p.x = width + margin; p.vx *= -0.5; }
  if (p.y < -margin) { p.y = -margin; p.vy *= -0.5; }
  if (p.y > height + margin) { p.y = height + margin; p.vy *= -0.5; }
}

export function GenerativeHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<SimState | null>(null);
  const deferred = useDeferredMount(1500); // Defer 1.5s to let LCP settle first

  const init = useCallback((canvas: HTMLCanvasElement) => {
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    const rng = mulberry32(seed);
    const type = ATTRACTOR_TYPES[Math.floor(rng() * ATTRACTOR_TYPES.length)];
    const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
    const w = canvas.width;
    const h = canvas.height;

    // Adaptive particle count: fewer on mobile / low-DPR devices
    const dpr = window.devicePixelRatio || 1;
    const isMobile = w < 768;
    const particleCount = isMobile ? 150 : dpr > 1.5 ? 300 : 400;

    stateRef.current = {
      particles: createParticles(particleCount, w, h, rng),
      type,
      seed,
      rng,
      cx1: w * (0.2 + rng() * 0.6),
      cy1: h * (0.2 + rng() * 0.6),
      cx2: w * (0.2 + rng() * 0.6),
      cy2: h * (0.2 + rng() * 0.6),
      cx3: w * (0.2 + rng() * 0.6),
      cy3: h * (0.2 + rng() * 0.6),
      strength: 0.012 + rng() * 0.025,
      baseHue: palette[0] + (rng() - 0.5) * 30,
      baseSat: palette[1],
      hueRange: 20 + rng() * 40,
      trailFade: 0.015 + rng() * 0.012,
      time: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !deferred) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      init(canvas);
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    resize();

    let lastFrameTime = 0;
    const targetFrameInterval = 1000 / 30; // 30fps cap for hero background

    const draw = (timestamp: number) => {
      const state = stateRef.current;
      if (!state) return;

      // Frame skipping for slow devices
      if (!prefersReducedMotion && timestamp - lastFrameTime < targetFrameInterval) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp;

      state.time++;

      // Trail fade — lower = longer trails
      ctx.fillStyle = `rgba(0, 0, 0, ${state.trailFade})`;
      ctx.fillRect(0, 0, cssW, cssH);

      const scaleX = cssW / canvas.width;
      const scaleY = cssH / canvas.height;

      // Draw particles as lines from prev to current position
      for (const p of state.particles) {
        stepParticle(p, state, canvas.width, canvas.height);

        const lifeRatio = p.life / p.maxLife;
        // Fade in and out
        const fade = lifeRatio > 0.9
          ? (1 - lifeRatio) * 10
          : lifeRatio < 0.2
          ? lifeRatio * 5
          : 1;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const alpha = fade * Math.min(0.8, 0.2 + speed * 0.15);
        const lineWidth = 0.5 + speed * 0.4;
        const hue = state.baseHue + p.hueOffset + Math.sin(state.time * 0.003 + p.hueOffset) * state.hueRange * 0.3;

        const x1 = p.prevX * scaleX;
        const y1 = p.prevY * scaleY;
        const x2 = p.x * scaleX;
        const y2 = p.y * scaleY;

        // Skip if wrapped (would draw lines across screen)
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        if (dx > cssW * 0.3 || dy > cssH * 0.3) continue;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${hue}, ${state.baseSat}%, 62%, ${Math.min(1, alpha * 1.5)})`;
        ctx.lineWidth = lineWidth + 0.4;
        ctx.lineCap = "round";
        // Neon bloom: give the lime trails a soft glow so they read as a living
        // luminous structure, not thin scattered strokes.
        ctx.shadowBlur = 7 + speed * 1.5;
        ctx.shadowColor = `hsla(${hue}, ${state.baseSat}%, 60%, 0.9)`;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Glow — more particles bloom, brighter, for a vivid living structure
        if (speed > 1.2) {
          ctx.beginPath();
          ctx.arc(x2, y2, lineWidth + 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${state.baseSat}%, 72%, ${alpha * 0.5})`;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [init, deferred]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Particle canvas — full procedural, unique every visit — deferred until after LCP */}
      {deferred && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.9, mixBlendMode: "screen" }}
        />
      )}
      {/* Vignette — lighter, and biased left so the headline column stays readable
          while the generative structure blooms on the right. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 62% 42%, transparent 0%, rgba(9,9,11,0.42) 100%)",
        }}
      />
      {/* Left scrim: protects the headline/CTA column at AA contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(9,9,11,0.80) 0%, rgba(9,9,11,0.45) 32%, rgba(9,9,11,0) 60%)",
        }}
      />
    </div>
  );
}
