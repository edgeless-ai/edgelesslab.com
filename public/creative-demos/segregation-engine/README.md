# Segregation Engine — Self-Organizing Typography

An interactive simulation of Thomas Schelling's landmark segregation model, rendered as a grid of typographic glyphs. Two letter classes (serif vs. sans-serif) self-organise based on a local-neighbourhood satisfaction threshold. The result is a living, breathing piece of generative typography that reshuffles itself into emergent clusters.

## What it does

- Displays a 24×16 grid of randomly placed serif and sans-serif capital letters on a procedural paper texture
- Each "agent" (glyph) examines its 8-cell Moore neighbourhood every frame
- If the ratio of same-class neighbours is below the user-defined threshold, the glyph is dissatisfied and swaps places with a random empty cell
- Swaps are animated with a smooth 15 % lerp glide rather than instantaneous jumps
- Clicking anywhere on the canvas reshuffles the grid

## Technique notes

- **Schelling model**: Classic agent-based segregation where local bias produces global segregation patterns; empty cells (33 % of the grid) act as vacancy buffers, allowing the system to settle
- **Synchronous update**: All dissatisfied agents relocate simultaneously by swapping with empty slots, preventing chains of displacement in a single frame
- **Procedural paper texture**: An off-screen `p5.Graphics` buffer with 4000 faint grey circles of varying opacity, giving the canvas a printed, tactile feel without external images
- **Typography as identity**: Serif glyphs are rendered in warm yellow (`#F4D03F`) with the browser's `serif` font; sans-serif glyphs are rendered in cool blue (`#5DADE2`) with `sans-serif`
- **Animated transitions**: Each glyph stores a visual position `(x, y)` and a target position `(tx, ty)`; every frame it glides 15 % of the remaining distance toward its target, creating a spring-like motion

## Attribution

- Based on **Thomas Schelling's segregation model** (1971) — the foundational agent-based simulation showing how mild individual preferences can generate strong collective segregation
- The typographic-glyph twist is a creative variation on the traditional red/blue or coin agents
- p5.js is used for the canvas, animation loop, and DOM wrapper

## How to run

1. Open `index.html` in any modern web browser
2. No build step is required — p5.js is loaded from CDN
3. Alternatively, serve the folder with `python3 -m http.server` and visit `http://localhost:8000`

## Controls

- **Drag the "satisfaction threshold" slider** (top-left) to change the bias from 0 % to 100 %
- **Click anywhere on the canvas** to reshuffle the grid with a new random seed

## Screenshot

A screenshot of the running demo is saved at `/Users/djm/segregation-engine_screenshot.png`.
