# Sashiko Weather — Binary Embroidery Flow Field

A generative flow-field simulation that reimagines the centuries-old Japanese textile-repair craft **sashiko** as a coordinate system for fluid dynamics. A 16×16 grid of binary "stitch lines" creates a vector field through which 1,200 particles drift like wind, leaving ghostly white streamlines across an indigo background.

## What it does

- Simulates a "weather" system as a travelling sine wave that continuously flips horizontal and vertical stitch lines between two states
- Renders dashed white lines at grid boundaries (`0`) or cell centres (`1`), mimicking the running-stitch rhythm of traditional sashiko
- Advects 1,200 particles through the stitch field; each particle samples the nearest horizontal and vertical line to determine its velocity
- Mouse interaction shifts the wave phase (X) and modulates particle speed (Y)
- Long-exposure trails are created by drawing a semi-transparent indigo fade rectangle every frame

## Technique notes

- **Binary stitch grid**: 16 horizontal and 16 vertical lines are positioned by per-row/per-column binary digits. The result is a sparse, shifting lattice that functions as a flow-field lattice
- **Weather simulation**: A sine wave `sin(base + i*0.3 + phase)` drives the binary state; horizontal and vertical grids are offset by `π` so they are never identical, producing richer intersections
- **Particle advection**: Each particle finds the nearest stitch line in each axis. Influence falls off linearly with distance (corridor radius = 30 % of cell size). The binary digit determines velocity sign: `0` → right/down, `1` → left/up. At intersections, the two components sum, producing diagonals and rotational eddies
- **Trail fade**: Each frame draws the indigo background at ~8 % opacity over the entire canvas, causing previous particle positions to decay exponentially and creating long, smooth streamlines
- **Dashed strokes**: Uses `drawingContext.setLineDash([12, 8])` to emulate the traditional running-stitch spacing of sashiko

## Attribution

- Inspired by **Sashiko** (刺し子) — the traditional Japanese running-stitch technique used for decorative reinforcement and textile repair
- Flow-field visualisation style draws from **wind-map** and **LIC (Line Integral Convolution)** aesthetics, where particles leave persistent trails to reveal an invisible vector field
- The sine-wave binary weather model is a creative simplification of atmospheric oscillation patterns

## How to run

1. Open `index.html` in any modern web browser
2. No build step is required — p5.js is loaded from CDN
3. Alternatively, serve the folder with `python3 -m http.server` and visit `http://localhost:8000`

## Controls

- **Move mouse horizontally** (X) to shift the phase of the weather wave and push the stitch pattern across the grid
- **Move mouse vertically** (Y) to speed up or slow down the particles (0.2× to 3.0× base speed)

## Screenshot

A screenshot of the running demo is saved at `/Users/djm/sashiko-weather_screenshot.png`.
