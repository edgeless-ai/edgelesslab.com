# Tessellated Breath — Recursive Kinetic Typography

A self-contained p5.js demo that turns typed words into living, breathing geometric mosaics.

## What It Does

Each character you type is converted to a vector skeleton via `p5.prototype.textToPoints()`. The glyph’s bounding box is then recursively subdivided into irregular tiles (binary split with noise-driven offsets) up to a depth of 6. Tiles are clipped to the letter outline so they only appear inside the glyph, preserving legibility while giving the letter a ceramic-tile texture.

Tiles “breathe” via a global sine field mapped to per-tile phase offsets, and their vertices receive a 2–3% simplex-noise displacement for an organic, handmade feel.

## Technique Notes

- **textToPoints() skeleton extraction** — The default p5.js font is used so the demo works without external font assets. Points are centered around the glyph centroid so the tile grid and clipping mask align perfectly.
- **Recursive binary subdivision** — Each split axis is chosen by aspect ratio with a 30% noise-driven flip. Split midpoints are offset by 2D simplex noise to avoid mechanical regularity.
- **Depth-based palette assignment** — The 6-color palette (`#7B2D8E`, `#FF00FF`, `#FFD700`, `#FF6B6B`, `#FFFFFF`, `#0A0A0A`) is shuffled per letter. Tile colors are picked by `depth % palette.length`, so deeper subdivisions cycle through the palette in a structured way.
- **Breathing scale** — `scale = 1.0 + sin(time * 2 + tile.phase) * 0.05`. Each tile has a unique phase derived from positional noise, so the motion is wave-like rather than uniform.
- **Organic displacement** — `noise(x * 0.02, y * 0.02, time)` offsets each tile by ±3 px, giving the mosaic a slight waver.
- **Canvas clipping** — `drawingContext.beginPath()` / `clip()` restricts tile drawing to the letter outline. `save()` / `restore()` isolates the clip per letter.
- **Smooth hover depth** — `lerp(currentDepth, targetDepth, 0.12)` so tiles don’t pop when the mouse enters a letter; they simply reveal pre-computed deeper tiles.
- **Reseed animation** — Clicking a letter reshuffles its palette and sets a `reseed` counter that briefly scales tiles to zero, producing a dissolve/rebuild flash.

## Palette

| Role | Hex |
|------|-----|
| Background | `#0A0A0A` |
| Purple accent | `#7B2D8E` |
| Magenta | `#FF00FF` |
| Gold | `#FFD700` |
| Coral | `#FF6B6B` |
| White | `#FFFFFF` |

## Interaction

- **Type** — appends uppercase characters to the word.
- **Backspace** — removes the last character.
- **Hover** — increases the local recursion depth (more tiles appear).
- **Click a letter** — reshuffles its palette and triggers a brief shrink/regrow animation.

## Simplifications from Prompt

- Uppercase-to-lowercase morph was omitted to guarantee 60fps stability.
- High-resolution PNG export was omitted to keep the demo single-file and self-contained.
- Drag-to-scrub time was omitted in favor of a constant, gentle breathing rhythm.
- Adjacency-constrained palette assignment was simplified to depth-based cycling, which is faster and still visually coherent.

## Attribution

- **Concept:** Prompt 4 from the 8-hour creative pipeline — *Manoloide* (recursive geometric subdivision + HSB color-as-structure) + *Animography* (modular glyph-as-animation-unit).
- **Palette:** Zajno — `#0A0A0A`, `#7B2D8E`, `#FF00FF`, `#FFD700`, `#FF6B6B`, `#FFFFFF`.
- **Built with:** p5.js 1.9.0 (CDN).
