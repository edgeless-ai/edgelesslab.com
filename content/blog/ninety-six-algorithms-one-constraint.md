---
slug: ninety-six-algorithms-one-constraint
title: '98 Algorithms, One Constraint: A Pen on Paper'
description: A taxonomy of every generative art algorithm that survives the pen plotter
  constraint. Flow fields to fractals, reaction-diffusion to recursive trees. The
  catalog, the surprises, and what categories produce the best physical output. Updated
  to reflect 98 generators as of June 2026.
date: '2026-04-15'
tags:
- Generative Art
- Creative Coding
- Pen Plotters
- Algorithms
readTime: 8 min
productSlug: gen-art-starter
editorial: true
ctaHook: The 10 best generators from this catalog, ready to run with parameter guides.
---

# 98 Algorithms, One Constraint: A Pen on Paper

Total Serialism started as a homework assignment: implement every algorithmic art family I could find, each as a self-contained interactive sketch with real-time parameter controls and SVG export. The constraint was physical output. Every algorithm had to produce something a pen plotter could draw on paper.

Ninety-eight algorithms later, the project became a taxonomy. Patterns emerged across categories that no single algorithm would have revealed. Some entire families of generative art are excellent on screen and useless for plotters. Others that look mundane in a browser produce physical output that rewards close inspection for minutes.

## The Taxonomy

The algorithms cluster into sixteen categories. Some are standard (flow fields, fractals, cellular automata). Others emerged from the constraint itself (pen-plotter-specific optimizations that became their own generative category).

**Flow fields** (7 algorithms): The workhorse family. Perlin noise fields, curl noise, field collision detection. These produce the most reliably good physical output because particle traces are naturally continuous single-stroke paths. The pen moves in long, flowing arcs rather than hopping between disconnected marks.

**Fractals** (3 algorithms): Mandelbrot, Julia sets, and recursive subdivision. The escape-time fractals (Mandelbrot, Julia) require creative reinterpretation for plotters because the original algorithm produces per-pixel color, not paths. The solution is contour extraction: draw the boundary at specific escape-time thresholds as continuous paths.

**Cellular automata** (4 algorithms): Elementary CA, Game of Life, and two layered variants. The visual output depends entirely on the rendering strategy. Drawing each living cell as a filled rectangle is boring. Drawing the boundaries between states as contour lines produces intricate networks.

**Reaction-diffusion** (3 algorithms): Gray-Scott system in three variants (standard, enhanced, layered). Produces organic, coral-like patterns. The challenge is extracting plottable contours from the concentration field. I use marching squares on the activator concentration.

**Curves** (6 algorithms): Harmonographs, Hilbert curves, Lissajous figures, rose curves, and space-filling curves. These are naturally stroke-based and translate almost directly to plotter output. Space-filling curves are particularly interesting: they are single continuous paths that visit every point in a region.

**Natural systems** (8 algorithms): Differential growth, DLA (diffusion-limited aggregation), phyllotaxis, physarum simulation, coral growth, crystal growth, space colonization, and lightning. The biological simulations produce the most visually surprising output. DLA in particular creates intricate branching structures that are mesmerizing when plotted with fine ink.

**Physics simulations** (5 algorithms): Boids flocking, cloth simulation, magnetic fields, particle systems, wave interference. The physics-based algorithms produce output that feels dynamic even on static paper. Wave interference patterns plotted with a 0.1mm pen create moire effects visible only at reading distance.

**Geometric** (16 algorithms): The largest family. Moire patterns, Penrose tilings, spirals, string art, topographic contours, maze generation, Islamic patterns, and more. These tend to be the most reliable for plotters because geometric precision translates well to physical pen strokes.

**Trees and L-systems** (3 algorithms): Recursive trees and L-system grammars. L-systems are natural single-stroke generators because the turtle graphics interpretation produces continuous paths by definition.

**Packing** (2 algorithms): Circle packing and arrow packing. These produce dense, mosaic-like compositions. The circles themselves are trivial to plot; the visual interest comes from the negative space and the size distribution.

**Voronoi** (2 algorithms): Voronoi stippling and TSP art. Stippling converts images into dot patterns using weighted Voronoi relaxation. TSP art connects those dots with a single continuous path, producing a one-stroke portrait.

**Symmetry** (5 algorithms): Truchet tiles, aperiodic tilings, kumiko patterns, quilting patterns, zellige. These tile-based algorithms produce visual richness from simple rules. Truchet tiles in particular create flowing curves from a binary choice at each grid cell.

**Chemical** (6 algorithms): Belousov-Zhabotinsky reaction, chromatography, convection cells, crystallization, Liesegang rings, mixing patterns. These simulate chemical and physical processes that produce spatial patterns. The results are often unpredictable in a way that pure math is not.

**Advanced** (6 algorithms): Chladni patterns, Lorenz attractors, parametric surfaces, strange attractors, vortex streets, sound waveforms. These are the showpieces. A Lorenz attractor plotted as a single continuous path, switching pens for Z-depth coloring, is consistently the piece that gets the strongest reaction from people seeing plotter art for the first time.

**Image processing** (8 algorithms): ASCII art, contour extraction, dithering, flow hatching, halftone, image-to-ASCII, and squigglecam. These convert photographic input into plottable marks. Halftone and flow hatching produce the most faithful reproductions. Squigglecam, which draws portraits as a single continuous squiggle, is the most entertaining.

## What Works and What Does Not

Three categories consistently produce the best physical output: flow fields, natural systems, and geometric patterns. The common thread is that these families naturally produce continuous, well-distributed strokes.

Three categories consistently disappoint on paper: fractals (escape-time), cellular automata (grid-based), and raw physics simulations. These produce output that is visually interesting on screen but loses resolution or legibility when plotted. The issue is always the same: the algorithm's visual character depends on pixel-level precision that a pen cannot reproduce.

## The Shared Toolkit

All 98 algorithms share a common infrastructure: a parameter control panel, preset management (save, load, share via URL), and a unified export pipeline (SVG, PNG, GIF). The SVG export includes a path optimizer that cleans and sorts strokes for efficient plotting.

The path optimizer is the most important shared component. It reorders paths to minimize pen-up travel distance, removes duplicate strokes, and merges nearly-collinear segments. A 10,000-path SVG that takes 45 minutes to plot unoptimized can drop to 20 minutes after optimization. That matters when you are burning through archival ink and Bristol board.

## The Catalog

The full catalog is browseable at [/total-serialism/app/](/total-serialism/app/). Every algorithm has real-time parameter controls, preset management, and one-click SVG export. The editorial companion describes the taxonomy, the toolkit, and the surprises that emerged from building all ninety-eight.

The most useful entry point is the browse page, which shows every algorithm as a thumbnail grid organized by category. From there, click into any algorithm to adjust parameters and export.

If you are starting from zero, begin with the flow field. It is the most forgiving algorithm family. Then try a Lorenz attractor for something dramatic, a Voronoi stippler for image conversion, and a Truchet tile generator for something meditative. Four algorithms will teach you 80% of what matters about generative art for physical output.