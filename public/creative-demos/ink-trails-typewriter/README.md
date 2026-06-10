# Ink-Trails Typewriter

A generative fluid-simulation + kinetic-typography demo built in a single HTML file with p5.js.

## What it does

Drag the mouse across a dark canvas to inject luminous particles. The particles are carried by a divergence-free curl-noise velocity field and magnetically attracted to the nearest point of a hidden glyph path spelling **INK**. As they settle into the letter shapes they glow with additive blending; as they decay they dissolve into swirling smoke.

## Technique Notes

- **Curl-noise velocity field** — A 2D Perlin-noise scalar potential is differentiated via finite differences and rotated 90° to produce a divergence-free flow. This simulates vorticity without a full Navier–Stokes solver.
- **Magnetic glyph attraction** — Each particle queries a spatial grid for its nearest glyph point and receives a gentle spring-like force. Far particles are pulled harder; close particles settle softly.
- **Additive blending** — `blendMode(ADD)` causes overlapping particles to bloom, creating neon letterforms.
- **Trail persistence** — A semi-transparent background rect (`alpha 10`) is drawn each frame, leaving ghost trails that fade into the void.
- **Color cycling** — Spawn color switches between cyan, magenta, and yellow based on instantaneous mouse drag speed.
- **Particle budget** — Hard-capped at 2000 particles to maintain a 60fps target.

## Color Palette

| Role | Hex |
|------|-----|
| Background | `#0A0A0A` |
| Primary (cyan) | `#00FFFF` |
| Secondary (magenta) | `#FF00FF` |
| Tertiary (yellow) | `#FFFF00` |
| UI text | `#FFFFFF` |

## Controls

- **Mouse drag** — Inject particles and scrub the glyph.
- **Touch drag** — Identical behavior on mobile (default touch scrolling is prevented).

## Architecture

- Single `index.html` — no build step, no external assets except the p5.js CDN.
- `Particle` class — position, velocity, life, color, and render logic.
- `Glyph` class — procedural point-cloud generation for the letters I, N, K (≥200 points per letter).
- `SpatialGrid` class — 2D hash grid for fast nearest-neighbor queries.
- `curlNoise()` — simple Perlin-based divergence-free field.

## Browser Requirements

Any modern browser with HTML5 Canvas 2D support.

## Attribution

- p5.js by the Processing Foundation (CDN: https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js)
- Built as part of the Nous Research creative pipeline.
- Curl-noise formulation inspired by standard fluid-simulation literature (e.g., Bridson et al., *Fluid Simulation for Computer Graphics*).
