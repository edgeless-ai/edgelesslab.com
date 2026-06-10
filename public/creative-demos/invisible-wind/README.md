# Invisible Wind

A standalone p5.js demo combining kinetic typography, Perlin-noise flow-field advection, and visibility-as-motion. Letters are invisible at rest and only appear when disturbed by a hidden wind field generated from the statistical rarity of typed characters.

## Files

- `index.html` — Self-contained single-file demo (p5.js CDN + inline JS + CSS).

## How to Run

Open `index.html` in any modern browser. No build step or server is required.

## How to Use

- **Type letters** — They spawn at the center and are immediately launched into the flow field. Common letters (e, t, a) create smooth laminar flow; rare letters (q, z, x) spawn vortices.
- **Enter / Space** — Triggers a magenta "rogue" letter. One random existing non-rogue letter is selected, recolored magenta, and begins spiraling outward from the canvas center. It leaves permanent 2px dots that poison the flow field and repel other letters.
- **Backspace** — Reverses the local wind field for 2 seconds (120 frames) within a 150px radius of the mouse cursor. Letters in the zone are blown backward, creating chaotic collisions.
- **Mouse click** — Initializes the Web Audio API (browsers require user gesture before audio).

## Technique Notes

### Flow Field Construction
- Grid resolution: **80 × 60** cells across the full canvas.
- Base angle from p5.js `noise(x * 0.1, y * 0.1, frameCount * 0.002)`.
- Every frame, the nearest letter to each cell is found. Its rarity score distorts the field:
  - Rare letters (`rarity < 0.2`) add vortices: `angle += sin(dist / 50) * 2`.
  - Common letters (`rarity > 0.7`) smooth the field.
  - Rogue dots also inject vortices, creating a feedback loop.

### Visibility-As-Motion
- `opacity = speed * 12`, clamped to 0–255.
- If `opacity < 5`, the letter is skipped entirely (performance).
- Letters at rest vanish completely into the `#000011` background.

### Color Mapping by Speed
| Speed Range | Color |
|-------------|-------|
| < 0.5       | `#001F3F` (near-invisible dark blue) |
| 0.5 – 2.0   | `#00FFFF` (cyan) |
| 2.0 – 4.0   | `#008080` (teal) |
| 4.0+        | `#FFFFFF` (white) |
| Rogue       | `#FF00FF` (magenta) |

### Rogue Letter System
- Selected randomly on `Enter` or `Space`.
- Ignores the flow field; spirals outward via `x = cx + cos(θ) * r` with `r += 1.5px/frame`.
- Draws permanent dots onto an off-screen `p5.Graphics` buffer that never fades.
- Other letters experience repulsion force within 10px of any rogue dot.

### Trail Persistence
- A selective fade is applied every 10 frames: a full-canvas rectangle `fill(0, 0, 17, 8)`.
- This preserves motion trails while keeping the rogue dot buffer permanently intact.

### Audio (Web Audio API)
- Each letter spawn triggers a short `triangle` oscillator burst (0.08s).
- Frequency mapped to character code: `220 + (charCode % 12) * 40`.
- Rogue birth triggers a longer `sawtooth` drone at 110Hz (0.5s).
- Audio context is initialized lazily on the first user input (mouse click or key press) to comply with browser autoplay policies.

### Backspace Anomaly
- Global `reverseWind` counter set to 120 frames.
- Letters within 150px of the mouse receive `fieldVector.mult(-1.5)`.
- Visual indicator: a faint magenta ring around the cursor.

## Palette (Earth Nullschool Dark Cinematic)
- Background: `#000011`
- Cyan: `#00FFFF`
- Teal: `#008080`
- White: `#FFFFFF`
- Magenta accent: `#FF00FF`
- Ghost lines: `#333333`

## Dependencies
- p5.js 1.9.0 (loaded from CDN)
- No external assets or build tools.
