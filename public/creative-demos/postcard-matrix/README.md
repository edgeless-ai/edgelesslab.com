# Postcard Matrix — A Hand-Drawn Tixy.land

A 16×16 procedural dot-matrix engine inspired by the iconic [Tixy.land](https://tixy.land) by [Martin Kleppe](https://twitter.com/aemkei). Each cell is rendered as a wobbly, hand-drawn mark whose size and colour are driven by a live-evaluated JavaScript formula. The entire canvas is wrapped in a warm, tactile "Dear Data" postcard aesthetic.

## What it does

- Displays a 480×480 canvas textured like water-stained paper
- Evaluates a user-supplied formula `(t, i, x, y)` every frame
- Positive results draw ochre dots; negative results draw pink dots
- Magnitude controls the radius of each mark
- A **Send Postcard** button (or Spacebar) triggers a 5-second left-to-right reveal of the frozen grid

## Technique notes

- **Paper texture**: Procedurally generated off-screen `p5.Graphics` buffer with thousands of faint grey dots and low-opacity watercolor washes (ochre + cobalt)
- **Hand-drawn marks**: Each dot is drawn with `curveVertex()` through 10 jittered radial points, giving an organic, slightly irregular line quality — no `ellipse()` or `circle()` is used for the grid marks
- **Live formula compilation**: The user's input string is wrapped in `with(Math) {}` and compiled via `new Function()` for every keystroke; syntax errors fail silently
- **Postcard reveal**: The grid is snapshotted into a 2D array when triggered, then cells are revealed one-by-one over 5 seconds before returning to live mode

## Attribution

- Inspired by **Tixy.land** by Martin Kleppe — the classic 16×16 formula-driven dot matrix
- Visual style influenced by **Dear Data** (Giorgia Lupi & Stefanie Posavec) — hand-drawn data postcards, warm palettes, and human encoding of quantitative information
- The wobbly mark technique is a common generative-art pattern for simulating hand-drawn circles with Catmull-Rom splines

## How to run

1. Open `index.html` in any modern web browser
2. No build step or local server is required — p5.js is loaded from CDN
3. Alternatively, serve the folder with `python3 -m http.server` and visit `http://localhost:8000`

## Controls

- **Type in the formula box** to change the live pattern
- **Click "Send Postcard"** or press **Space** to trigger the 5-second reveal animation

## Screenshot

A screenshot of the running demo is saved at `/Users/djm/postcard-matrix_screenshot.png`.
