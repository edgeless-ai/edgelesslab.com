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

Tartanism is a systematic exploration of generative plaid. [The field notes](/blog/when-plaid-becomes-tartan/) document loom structures, 48 textile colors, traditional reference setts, and a formal grammar for Scottish tartan. This synth exposes the actual system instead of reducing it to a stripe randomizer.

The live artifact: [Open Tartan Weave Synth](/creative-demos/tartan-weave-synth/)

## The Sett Is the Instrument

The synth reads and writes compact threadcount notation such as `K/4 B4 K4 B4 K20 G24 K6 G24 K20 B22 K/4`. Each token names a dye color and a thread width. Pivot markers describe a reflective sett. The same representation can be edited directly or manipulated through the stripe editor.

Eight reference setts provide a serious starting point, including Black Watch, Royal Stewart, Buchanan, Douglas, and Murray of Atholl. Warp and weft can share one sett, as traditional tartan usually does, or split into independent structures for broader textile studies.

## The Weave Structures

The renderer uses six explicit threading, treadling, and tie-up definitions:

- **Plain weave** for a balanced over-under structure
- **2/2 twill** for the familiar tartan diagonal
- **3/1 twill** for a warp-dominant surface
- **Herringbone** for a reversing twill
- **Houndstooth** for a broken check
- **Basket weave** for grouped warp and weft threads

Every visible cell is calculated from the active warp thread, weft thread, shaft, treadle, and tie-up. Changing the weave changes which thread is physically on top rather than placing a decorative texture over a plaid image.

## Dye and Material

The color vocabulary now includes all 48 codes used by the Tartanism system. The stripe editor exposes every chosen dye and width while keeping the formal notation in sync.

Material is separate from pattern. Brushed wool adds a soft, irregular grain. Worsted wool produces cleaner highlights. Linen is drier and more directional. Silk has a sharper raking highlight. Flat study removes the simulated fiber surface so the weave logic can be inspected directly.

Thread scale, weave depth, yarn irregularity, and light direction change the cloth without changing the sett. This makes it possible to compare structure and surface instead of baking both into one effect.

## Controlled Mutation

Mutation is not a single random button. A sett can shift proportions, shift dyes, transpose stripes, insert a stripe, rotate its sequence, or reverse direction. A general mutation chooses among those operations. A seeded generator creates new setts that can be reproduced and refined.

The important distinction is between randomness and authorship. A random pattern gives you an answer. A set of constrained mutations gives you a path through a design space.

## Motion and Art-only Mode

The cloth can remain still, breathe very subtly, or respond to the pointer with a local ripple. Motion is optional. Press `H` or choose **Hide controls** to remove the entire interface and leave only the cloth. `Escape` restores the controls.

## The Export

PNG export captures the rendered textile. Recipe export saves the seed, threadcounts, symmetry, weave, material, scale, depth, irregularity, and light as JSON. The image is an output. The recipe is the work that produced it.

This is what the first version lacked. Tartanism was broad and rigorous, while the synth had become a shallow animated toy. The rebuilt synth uses the same underlying vocabulary and gives it enough controls to support real exploration.
