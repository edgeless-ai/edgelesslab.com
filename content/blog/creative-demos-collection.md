---
slug: creative-demos-collection
title: The Creative Demos Collection
description: 37 interactive generative art experiments. p5.js, Canvas 2D, WebGL. No
  build step required. Open, explore, remix.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Creative Coding
- Collection
readTime: 4 min
productSlug: gen-art-starter
ctaHook: 10 Python generators for flow fields, L-systems, Voronoi, and reaction-diffusion,
  ready to take these algorithms from the browser to a pen plotter.
---

# The Creative Demos Collection

A living archive of 37 interactive generative art experiments. Each demo is a standalone HTML file: no build step, no dependencies beyond a CDN link to p5.js or raw Canvas 2D.

## The Philosophy

These demos are built on a simple principle: the artifact should be inspectable. Open the file, read the code, change a number, reload. The creative coding pipeline is: idea → code → render → publish. The same filter produced [the 10 algorithms that actually look good](/blog/generative-art-algorithms-that-work/): build a lot, keep what earns it.

## Featured Demos

- [Scroll-Chromatic Excavation](/creative-demos/scroll-chromatic-excavation/): Scroll-driven text excavation with agent swarms and a full control panel
- [Scroll-Isometric Dissolution](/creative-demos/scroll-isometric-dissolution/): Isometric typography dissolves into particles under scroll velocity
- [Percussive Archaeology](/creative-demos/percussive-archaeology/): Rhythm-driven excavation of buried text
- [Cursor Swarm Brush](/creative-demos/cursor-swarm-brush/): 64 particles track your cursor through a recursive geometric subdivision
- [Kinetic Type Physics](/creative-demos/kinetic-type-physics/): Physics-driven typography with mass, velocity, and collision
- [Monolith Drummer](/creative-demos/monolith-drummer/): 3D monolith that responds to rhythm with WebGL
- [Liquid Decryption](/creative-demos/liquid-decryption/): Text emerges from liquid simulation
- [Tartan Weave Synth](/creative-demos/tartan-weave-synth/): Interactive generative tartan with 6 weave structures and historical dye colors, with background in [the Tartanism field notes](/blog/when-plaid-becomes-tartan/)
- [Serial Permutation Canvas](/creative-demos/serial-permutation-canvas/): Visualizing total serialism as particle geometry

## The Full Collection

Browse all 37 demos at [edgelesslab.com/creative](/creative), or jump straight to the live index at [/creative-demos/](/creative-demos/). For the systematic side of the archive, there's [the 98-algorithm taxonomy](/blog/ninety-six-algorithms-one-constraint/).

## Technical Notes

Most demos are built with p5.js 1.9.0. A few use raw Canvas 2D or WebGL. All are self-contained in a single HTML file. The only external dependency is the p5.js CDN link.

The demos are served from `/creative-demos/` as static files. No server-side rendering, no build step, no framework. Just HTML, CSS, and JavaScript.

## Remixing

Every demo is readable. Open the HTML file, scroll to the script tag, and modify the constants. The code is not minified or bundled. It is designed to be read.