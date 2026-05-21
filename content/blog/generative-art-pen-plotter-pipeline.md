---
slug: "generative-art-pen-plotter-pipeline"
title: "From Algorithm to Ink: How We Turn Generative Code into Physical Art"
description: "65 algorithms, a texture pipeline, and a pen plotter. The toolchain that turns SVG code into framed prints on the wall."
date: "2026-05-13"
tags:
  - "Generative Art"
  - "Pen Plotting"
  - "Creative Coding"
  - "Design System"
readTime: "8 min"
editorial: true
---
# From Algorithm to Ink: How We Turn Generative Code into Physical Art

There's a pen plotter on my desk that draws with real ink on real paper. It takes SVG files as input and moves a pen across the page with mechanical precision, tracing every line that exists in the vector data. No rasterization, no dithering, no approximation. If a line exists in the file, the pen draws it. If it doesn't, the pen skips it.

This constraint changes how you think about generative art. Every algorithm I write has to produce output that survives the transition from screen to paper. Transparency effects don't exist. Gradients don't exist. Anti-aliasing doesn't exist. What exists is ink: either the pen touched the paper or it didn't. The medium is binary, and the art has to work within that binary.

I've been building a toolkit for this over the past year. It now contains 65 algorithms, a texture processing pipeline, path optimization tools, and a preset system for saving and sharing parameters. The whole stack runs locally, generates SVGs, and produces output that can go straight to the plotter.

---

## The Algorithm Library

The algorithms fall into categories based on what kind of visual structure they produce.

**Flow fields** are the workhorse. You define a vector field -- a function that assigns a direction to every point on the canvas -- and then release particles into it. The particles follow the field, leaving trails. The trails are the art. Different field functions produce radically different results: Perlin noise fields give organic, smoke-like patterns. Sinusoidal fields produce geometric waves. Curl noise fields create turbulence that looks like fluid dynamics because it essentially is fluid dynamics.

**Reaction-diffusion** simulates two chemicals spreading across a surface, one activating and one inhibiting. The interaction between them produces patterns that look biological -- spots, stripes, fingerprints, coral structures. The simulation runs on a grid and the output is contour lines extracted from the concentration field. These print beautifully because the contour lines are naturally smooth and continuous.

**L-systems** are grammar-based generators. You define a starting string and a set of rewrite rules. Apply the rules recursively and interpret the result as drawing instructions: "F" means draw forward, "+" means turn right, "[" means save position, "]" means restore position. With the right rules, you get trees, ferns, snowflakes, space-filling curves. The branching structures are inherently plotter-friendly because they're composed of discrete line segments.

**Cellular automata** run simple rules on grids. Conway's Game of Life is the famous one, but there are 256 elementary cellular automata, many of which produce intricate patterns. The output is blocky by nature, but when you render each cell state as a small geometric element instead of a filled square, the results are surprisingly detailed.

**Physics simulations** -- particle systems, spring meshes, gravitational attractors, vortex streets. These run a time-stepped simulation and record the particle trajectories. The trajectories become the drawing. Chaotic systems produce the most interesting output because small parameter changes lead to dramatically different structures. You can run the same algorithm a hundred times and get a hundred unique prints.

---

## The Texture Pipeline

Raw algorithmic output is clean. Too clean. It looks computational in a way that reads as sterile when printed. The lines are mathematically perfect, the spacing is uniform, and the overall impression is "a computer made this" rather than "someone made this with intention."

The texture pipeline fixes this. It's a Python script that takes an HTML file (the raw algorithm output rendered in a browser) and applies one of six processing modes:

**Dither black-and-white** converts the image to pure black and white using Floyd-Steinberg error diffusion. This produces the classic halftone newspaper look. Great for high-contrast pieces.

**Dither accent** does the same thing but preserves a single accent color from the design system -- indigo, violet, or cyan. The result is a mostly black-and-white image with one color punching through.

**Dither full** preserves the full color palette but dithers everything, giving the piece a retro pixel-art quality.

**Riso** simulates risograph printing -- limited color separation with slight misregistration between layers. It adds an analog warmth that makes digital output feel like it went through a physical printing process.

**Scanline** overlays horizontal scan lines across the image, like a CRT monitor. This is our most-used mode for the Edgeless design system because it matches the aesthetic: dark backgrounds, monospaced type, and the faint impression of looking at a terminal.

**Thermal** simulates thermal printer output -- high contrast, slight noise, the distinctive look of receipt paper. Good for text-heavy pieces.

The pipeline processes at 1200x1200 resolution by default, which gives enough detail for prints up to about 12 inches square. For larger prints, we render at 2400x2400 and the processing time roughly quadruples.

---

## From Screen to Paper: Path Optimization

The gap between "looks good on screen" and "draws well on a plotter" is wider than you'd expect.

A plotter moves a physical pen. The pen has inertia. It needs to accelerate and decelerate. Every time the pen lifts off the paper to move to a new starting point, that's dead time -- the carriage is moving but nothing is being drawn. A complex SVG might have thousands of disconnected line segments, and if the plotter draws them in file order, it spends more time traveling between segments than actually drawing.

Path optimization rearranges the drawing order to minimize travel distance. The algorithm is a variant of the traveling salesman problem: given all the line segments, find an order that minimizes the total pen-up distance. We use a greedy nearest-neighbor approach -- not optimal, but fast and good enough. On a typical drawing, optimization reduces total plot time by 30-50%.

Other optimizations: **merging** connects line segments whose endpoints are within a tolerance distance (usually 0.5mm). **Simplification** removes points that are nearly collinear, reducing file size without visible quality loss. **Relooping** changes where closed paths start and end to minimize pen-up moves between consecutive closed shapes.

A 65-algorithm library sounds like a lot, but each algorithm has dozens of parameters. A single flow field algorithm with adjustable noise scale, particle count, step size, line length, and field function can produce thousands of visually distinct outputs. The algorithm is the skeleton. The parameters are the personality.

---

## The Design System Connection

Everything we produce feeds back into the Edgeless design system. The system has a specific aesthetic: void black (#0a0a0a), indigo (#6366f1), violet (#8b5cf6), cyan (#06b6d4), JetBrains Mono for type. All outputs -- whether they're pen plots, screen renders, or textured variants -- use this palette.

This constraint is productive rather than limiting. When every piece uses the same color vocabulary, the output feels cohesive even when the algorithms are wildly different. A reaction-diffusion print next to a flow field print next to an L-system tree all look like they belong together because the palette ties them into a single body of work.

The recent PMI (Proprietary Metacognitive Index) visualization project is a good example. We needed to represent a six-tier conceptual hierarchy. Instead of designing one visualization, we generated ten variants using different approaches: a holographic projection, a topographic contour map, an engineering blueprint, a shattered/exploded view, an isometric ziggurat. Each used the same data (six tiers, same labels) but a completely different visual metaphor. The design system palette made all ten variants feel like siblings despite having almost nothing else in common structurally.

---

## Why Physical Matters

I could just render PNGs and call it done. The plotter adds hours of production time, introduces failure modes (ink blobs, paper jams, pen skips), and limits the output to whatever the pen can physically produce.

But there's something that happens when an algorithm becomes a physical object that doesn't happen when it stays on screen. A framed pen plot on a wall is a conversation piece in a way that a digital image never is. People ask how it was made. They look at the individual lines. They notice that the ink has slight variations in thickness where the pen moved faster or slower. They see the tiny imperfections where the pen changed direction.

The imperfections are the point. They're evidence that this thing exists in the physical world, subject to the same physics as everything else. A digital render is perfect and forgettable. A pen plot is imperfect and present.

The plotter also forces design discipline. When you know the output has to survive physical reproduction, you can't rely on tricks that only work on screens. No glow effects. No transparency blending. No sub-pixel rendering. The art has to work with line and void alone. That constraint produces stronger compositions than unlimited digital freedom ever does.

---

## The Stack

For anyone who wants to build something similar:

**Generation**: p5.js for browser-based algorithms, Python for computational heavy-lifts (reaction-diffusion, complex simulations). Everything outputs SVG.

**Processing**: Custom Python texture pipeline for post-processing. Playwright for headless browser rendering of HTML-based algorithms.

**Optimization**: vpype-style path optimization built into the toolkit. Merge, sort, reloop, simplify.

**Plotting**: AxiDraw pen plotter. Inkscape for final SVG cleanup when needed. Sakura Pigma Micron pens (0.25mm for detail, 0.5mm for structure).

**Presets**: JSON-based preset system with LocalStorage persistence. Save parameters, share configurations, randomize within bounds.

The whole pipeline is open-loop: generate, process, optimize, plot. No AI in the loop (ironic, given what we do). The algorithms are deterministic given their parameters. The randomness comes from parameter selection, not from model inference. This is intentional -- generative art should be reproducible. If you like a piece, you should be able to print it again.

---

**Related posts:**
- [The Most Useful Thing Your AI Agents Can Do Is Audit Themselves](/blog/agents-that-improve-themselves)
- [I Pointed 7 AI Agents at My YouTube History](/blog/youtube-mining-ai-agents)

---

*Edgeless Lab builds infrastructure for autonomous AI systems. And occasionally, art.*
