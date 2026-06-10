# Noise-Shared Cursor Swarm Brush

A standalone HTML/Canvas 2D demo combining three creative coding aesthetics:

- **Zajno** — cursor-velocity displacement + lerp-tracked swarm
- **Manoloide** — recursive geometric subdivision + HSB color-as-structure
- **Raven Kwok** — global noise field + particle lifecycle + swarm turbulence

## Technique

### Recursive Geometric Subdivision
The background is built via a recursive quad-tree-like subdivision. A tile splits when its size exceeds a minimum threshold and a 2D simplex noise sample at its center crosses a threshold. Split direction (horizontal vs vertical) is also noise-driven, producing an organic, off-center tessellation rather than a rigid grid.

### Shared Noise Field
A single lightweight inline simplex noise function drives both:
1. **Tile vertex displacement** — each corner of every tile is displaced by the noise field, creating a breathing, warped mosaic.
2. **Swarm turbulence** — cursor-following particles receive velocity impulses from the same field, so the swarm and the tiles warp in the same organic direction.

### Cursor Swarm
The cursor is replaced by 64 particles that lerp-track the mouse position at a factor of ~0.12 (Zajno-style). Each particle also has independent noise-driven turbulence. When the cursor moves fast (velocity > 12 px/frame), particles are randomly shed. These shed particles fall toward the nearest tile and "stain" it.

### Staining & Transient Lock
When a shed particle lands on a tile, the tile's color is locked to a hue-shifted palette slot for 5 seconds. During this time the tile emits a glow. After the timer expires, the tile reverts to its algorithmic adjacency-harmony color. This creates transient, glowing stains that fade back into the geometric harmony.

### Color Assignment
Tile colors are chosen from the 8-color palette using adjacency constraints: each tile picks a candidate set based on its spatial neighbors, then selects one via a noise sample. This ensures the mosaic feels harmonious rather than random.

### Interactions
- **Mouse move**: Herds the swarm. The swarm leaves a faint cohesion web of lines between nearby particles.
- **Fast movement**: Sheds particles that stain tiles.
- **Scroll**: Shifts the global noise seed, causing the entire tessellation to breathe and reconfigure.
- **Double-click**: Exports the current canvas as a PNG.
- **Idle (>3s)**: The swarm drifts autonomously via the noise field, creating a screensaver-like ambient motion.

## Palette

| Role | Hex |
|------|-----|
| Deep void | `#0A0A0A` |
| Navy depth | `#0A192F` |
| Royal purple | `#7B2D8E` |
| Magenta | `#FF00FF` |
| Gold | `#FFD700` |
| Cyan | `#00FFFF` |
| Coral | `#FF6B6B` |
| White | `#FFFFFF` |

## Attribution

- Concept and palette derived from **Prompt 3** of the creative pipeline.
- Inspired by the work of:
  - [Zajno](https://zajno.com/) — cursor displacement and lerp-tracking
  - [Manoloide](https://www.manoloide.com/) — recursive subdivision and HSB color structure
  - [Raven Kwok](https://ravenkwok.com/) — noise-driven swarm and particle lifecycle

## Usage

Open `index.html` directly in any modern browser. No build step, no external dependencies.
