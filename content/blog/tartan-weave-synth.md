---
slug: tartan-weave-synth
title: Tartan Weave Synth
description: Interactive generative tartan based on Tartanism field notes. Six weave
  structures, 48 historical dye colors, mouse-warped threads, and click-to-pulse.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Tartanism
- Interactive
readTime: 3 min
---

# Tartan Weave Synth

Tartanism is a systematic exploration of generative plaid. The field notes document six weave structures, 48 period-correct dye colors, and a formal grammar for Scottish tartan. This demo takes that system and makes it playable.

The live artifact: [Open Tartan Weave Synth](/creative-demos/tartan-weave-synth/)

## The Aesthetic

The palette is brighter than historical accuracy. The colors are inspired by real woven tartans: deep rust, warm saffron, soft navy, natural cream, beige, muted sage, wheat, and ivory. The background is a warm off-white, not black. The result feels like looking at fabric under daylight, not a CRT monitor in a dark room.

The thread scale is adjustable. At small scales, the weave looks like a dense upholstery textile. At large scales, it looks like a coarse handwoven blanket. The scale control lets you match the tartan to its intended use.

## The Weave Structures

The demo implements all six weave structures from the Tartanism field notes:

- **Plain**: the simplest weave, alternating warp and weft
- **Twill**: diagonal lines created by offsetting the weave pattern
- **Herringbone**: a broken twill that creates a chevron pattern
- **Hopsack**: paired warp threads create a basket-like texture
- **Satin**: long floats create a smooth, lustrous surface
- **Broken**: an irregular weave that produces chaotic patterns

Each structure is implemented as a pixel-level function that determines which color (warp or weft) is visible at each thread intersection.

## The Color System

The palette uses 12 natural textile colors inspired by the Tartanism research. The sett (the repeating pattern of colored stripes) is generated randomly, with each stripe having a width of 2-5 threads. The colors are desaturated enough to feel like real dye, but bright enough to feel alive.

## The Fabric Texture

Perlin noise simulates the irregularity of real threads. No two threads are exactly the same color. The noise creates subtle variations that make the digital weave feel like actual fabric. The texture is not a post-process effect. It is part of the color calculation.

## The Interaction

Mouse movement warps the weave. The cursor displaces threads horizontally and vertically, creating a distorted, breathing tartan. The displacement is sinusoidal, so the warp feels organic, not mechanical.

Clicking produces a pulse: a bright ring expands from the click point, temporarily lightening the threads it passes through. The pulse decays over 30 frames, leaving a subtle afterimage.

## The Animation

The tartan breathes. The sett pattern drifts slowly, and the fabric texture undulates. The breath speed is controlled by a slider. At maximum speed, the tartan becomes a living, changing pattern. At minimum speed, it is static.

## The Export

The demo includes a frame export feature. Click "Export GIF" to capture 90 frames (3 seconds at 30fps) as a PNG sequence. These frames can be assembled into an animated GIF using a tool like ezgif.com, or integrated directly into an NFT minting pipeline.

Each exported sequence is unique because the sett pattern is random and the breath animation is deterministic. The same seed produces the same sequence, but the seed is not exposed. Every export is a one-of-a-kind tartan animation.

## The Design Decision

The pixel-level rendering is deliberate. Most tartan generators use image-based approaches: draw stripes, blend them. This demo renders each thread intersection individually, which allows for the warp, pulse, and texture effects. The tradeoff is performance: the demo runs at 30fps on most devices, not 60fps. The visual complexity is worth the frame rate.

## What It Teaches

The lesson is about making a system playable and exportable. The Tartanism field notes are a rigorous, scholarly document. This demo is a toy and a tool. But the toy is built from the same system. The weave structures, the dye colors, the sett grammar — all from the field notes. The difference is interactivity and exportability. The system is no longer read-only. It is played, recorded, and minted.

This is the bridge between research, creative coding, and digital ownership: take a formal system, implement it faithfully, add interaction, and export the result. The interaction reveals properties of the system that are not visible in the static form. The export makes those properties permanent.