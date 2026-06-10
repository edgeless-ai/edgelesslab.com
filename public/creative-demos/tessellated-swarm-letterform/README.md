# Tessellated Swarm Letterform

A p5.js demo combining recursive geometric subdivision (Manoloide-style) with goal-seeking particle swarms (Raven Kwok-style) inside a single letterform mask.

## Technique Notes

### Core Systems
1. **Letterform Mask** — The letter "A" is drawn to an offscreen `p5.Graphics` buffer in white-on-black. The pixel array is read once with `loadPixels()` so that every subdivision step can perform a fast point-in-letter test by sampling the red channel.

2. **Recursive Subdivision** — The tight bounding box of the letter is recursively split using `subdivideRect()`. Splitting stops when:
   - recursion depth reaches `MAX_DEPTH` (4)
   - a 2D Perlin noise threshold says "halt" (noise-driven stop condition)
   - the tile becomes smaller than 30×30 pixels
   Split direction is determined by aspect ratio mixed with noise, producing irregular, organic tiles.

3. **Tile Color Assignment** — Each tile receives a color from the palette (magenta, cyan, gold, coral, white) using a noise-based hash. A simplified adjacency rule prevents a tile from sharing the same index as its immediate predecessor, creating a mosaic-like color distribution.

4. **Particle Swarm** — Every active tile hosts ~14 particles. Each particle:
   - Spawns at a random position inside its tile
   - Picks a target on the tile's perimeter (top, right, bottom, or left edge)
   - Applies a steering force (`seek`) toward that target
   - Is perturbed by a global 2D Perlin noise field ("curl-like" drift)
   - Gently re-picks its target every 60 frames so the swarm never stagnates
   - Soft-clamps to tile bounds so particles remain inside their "building"

5. **Re-subdivision & Migration** — When the user scrolls, the global noise seed (`globalNoiseZ`) shifts and the tile tree is rebuilt. Existing particles are remapped to new tiles: if a particle falls inside a new tile it is adopted; otherwise it seeks the nearest new tile and temporarily fades (`life = 0.6`). New particles are spawned to fill any shortfall. This prevents visual popping and creates the "evicting and rehousing" metaphor described in the prompt.

6. **Local Turbulence** — Hovering the mouse over a tile raises the noise amplitude for that tile's swarm from 0.8 to 2.8, injecting visible local turbulence.

7. **PNG Export** — Clicking anywhere on the canvas calls `saveCanvas()`, exporting the current frame as a PNG.

### Palette
| Role | Hex |
|------|-----|
| Background | `#0A0A0A` |
| Primary swarm | `#FF00FF` |
| Secondary swarm | `#00FFFF` |
| Tertiary swarm | `#FFD700` |
| Warm accent | `#FF6B6B` |
| Typography / UI | `#FFFFFF` |

### Performance
- Canvas runs at full window size.
- Particle count is balanced against tile count (max depth = 4) to stay near 60fps on modern hardware.
- The mask pixel array is reused; no per-frame `get()` calls.

### Simplifications
- Uses a single letterform ("A") rather than a full word.
- Recursion depth is capped at 4.
- ~14 particles per tile.
- Color adjacency is a lightweight predecessor check rather than full spatial neighbor graph.
- Subdivision is axis-aligned rectangular; triangular/hybrid subdivision was simplified to binary splits for stability.

## Attribution
- **Concept**: Inspired by Prompt 1 — a synthesis of Manoloide (recursive geometric subdivision + HSB color-as-structure), Raven Kwok (goal-seeking particle swarm + noise-driven turbulence), and Animography (modular glyph-as-animation-unit).
- **Engine**: [p5.js](https://p5js.org/) v1.9.0
- **Font**: Open Sans 800 via [open-sans-all](https://www.npmjs.com/package/open-sans-all) CDN.

## File
- `index.html` — Single self-contained file. Open directly in any modern browser.
