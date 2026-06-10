# Scroll-Driven Particle Swarm

A self-contained, interactive HTML demo that fuses **Tensor Field mutual-gravitation physics** with **Pudding-style scrollytelling** into a single scroll-driven narrative experience.

## What It Is

Each particle in the swarm represents a synthetic rapper from a dataset of 120 entries. Particles are positioned by data: x-axis maps to unique-word count, y-axis maps to album count. Four genre categories (East Coast, West Coast, South, Midwest) are color-coded with a neon festival palette.

The page body is 800vh tall, creating a long scroll runway. As you scroll through six narrative waypoints, the particle swarm undergoes **charge inversion events** — particles in the featured genre flip to repulsion and explode outward, then slowly re-cluster. This is the visual transition between story beats.

## Technique Notes

### Mutual Gravitation (Tensor Field)
- Exact O(n²) inverse-distance force loop (14,400 iterations/frame at 120 particles)
- Friction coefficient 0.92 prevents runaway spirals
- Low-opacity canvas overlay (alpha ~30) produces 8–12 frame motion-blur trails
- Boundary wrapping keeps particles in play

### Scrollytelling (Pudding Vocabulary)
- Scroll progress `t = scrollY / maxScroll` normalized to 0–1
- Six sticky text blocks pin at `top: 40vh` with CSS transitions
- Waypoint triggers at t ≈ 0.00, 0.15, 0.35, 0.55, 0.75, 0.95
- Genre-specific charge inversion fires once per waypoint

### The 3% Weirdness
1. **Narrative Ghosts (1.5%)**: ~4 particles are not part of the dataset. They drift at the edges in a Lissajous pattern, invisible until `t > 0.90`, then fade in cyan and reveal the hidden sentence "EVERYONE ELSE IS HERE".
2. **Particle Murmuration (1.0%)**: During a charge inversion, one particle in the category (1%) does not invert — it enters a Fibonacci spiral orbit (golden angle 137.5°) for 180 frames, rendered as a white geometric anomaly.
3. **Scroll Echo (0.5%)**: Reverse scrolling records a ghost spline path (`#666666` at 6% opacity) that fades over 5 seconds, mapping the user’s narrative path through data space.

### Interactions
- **Scroll down/up**: Progress narrative and trigger charge inversions
- **Mouse move**: Cursor acts as external repulsor within 150px
- **Mouse click**: Plucks nearby particles with random impulse
- **Idle**: Residual mutual gravitation keeps the swarm in slow hypnotic motion

### Simplifications
- The sticky text block positioning is approximate by waypoint; exact scroll-range CSS gating is approximated with a simple threshold check (`diff < 0.06`) rather than per-block height math.
- Dataset is fully synthetic (randomized names and values), not a real vocabulary corpus.
- No external D3.js is loaded; the scatter-plot grounding is implemented directly in p5.js using `map()`.

## Files

- `index.html` — Single self-contained file. All CSS, JS, and data are inline. Double-click to run in a browser.

## Dependencies

- [p5.js](https://p5js.org/) 1.9.0 (loaded from CDN)
- No build step. No external assets. No images.

## How to Run

1. Open `index.html` in any modern web browser.
2. Scroll down to progress the narrative.
3. Move the mouse to perturb the swarm.
4. Click to pluck particles.

## Palette

| Role | Hex |
|------|-----|
| Background (void) | `#0A0A0A` |
| Particle default | `#FFFFFF` (60% alpha, additive) |
| Genre A (East Coast) | `#FF00FF` |
| Genre B (West Coast) | `#00AAFF` |
| Genre C (South) | `#FFDD00` |
| Genre D (Midwest) | `#00FF41` |
| Leader lines | `#444444` |
| Scroll echo | `#666666` |
| Ghost whisper | `#00FFFF` |

## Attribution

- Prompt design: Phase 2 SYNTHESIZE agent (2026-06-09)
- Conceptual fusion: **Tensor Field** (mutual gravitation / probabilistic charge inversion) × **Pudding Vocabulary** (D3.js scatter plot / scrollytelling scroll timeline)
- Built by Phase 3 PRODUCE agent
- Demo saved to: `~/claude-projects/creative-demos/scroll-particle-swarm/`
