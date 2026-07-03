---
slug: generative-art-algorithms-that-work
title: I Built 75 Generative Art Algorithms. These 10 Actually Look Good.
description: Most generative art looks like noise. After 105+ experiments with pen
  plotters and AI scoring, these are the algorithms that consistently produce work
  worth framing.
date: '2026-04-08'
tags:
- Generative Art
- Pen Plotters
- Creative Coding
readTime: 6 min
productSlug: gen-art-starter
isLaunch: true
editorial: true
ctaHook: Working generators for every algorithm in this post, plus SVG optimization
  scripts.
---

# I Built 75 Generative Art Algorithms. These 10 Actually Look Good.

Generative art has a dirty secret: most of it looks bad. Not "challenging" bad. Not "you don't understand it" bad. Just noise that happens to be mathematically derived.

I've built 75+ generative algorithms over the past year, run them through 105+ experiments on physical pen plotters, and developed an AI scoring system to evaluate the output. The hit rate for "would I frame this on a wall" is about 13%. That's 10 algorithms out of 75+.

What separates the ones that work from the ones that don't.

## The Scoring System

Before talking about specific algorithms, the scoring matters. I built a rubric with five dimensions: composition (does it use the full canvas intentionally?), complexity (is there enough detail to reward close inspection?), coherence (do the elements relate to each other?), novelty (does it look different from obvious generative art?), and craft (would the physical plot look clean?).

Each dimension is 1-10. An AI vision model scores the output. Anything above 35/50 is worth plotting. Anything above 42 is worth framing. The model agrees with my subjective judgment about 80% of the time, which is good enough for filtering hundreds of outputs.

## The Algorithms That Work

**Flow fields** consistently score highest. A vector field defines direction at every point. Particles follow the field, leaving trails. The key: the field function determines everything. Perlin noise fields produce organic, cloud-like forms. Curl noise fields create turbulent, dynamic compositions. Attractor-based fields generate tight spirals and vortices.

The parameter that matters most isn't the noise function. It's the particle count and step count. Too few particles: sparse, unfinished. Too many: muddy, overworked. The sweet spot is where individual strokes are still visible but the overall composition reads as a unified form.

**L-systems** (Lindenmayer systems) generate branching, plant-like structures from simple rewrite rules. The surprise: the most visually interesting L-systems aren't the ones that look most like plants. They're the ones that produce unexpected geometric patterns from minimal rule sets.

A two-rule system with the right angle and iteration count generates forms that look designed, not random. The constraint is the art. Four rules or more tends to produce noise.

**Voronoi diagrams** are the most reliably "good-looking" algorithm. Scatter points, compute the Voronoi tessellation, and you have an organic cellular pattern that inherently fills the canvas and creates visual hierarchy through cell size variation.

The trick: don't use random point distributions. Use blue noise (minimum distance between points) for even tessellations, or clustered distributions for organic, biological-looking patterns. Random looks random. Structured randomness looks intentional.

**Reaction-diffusion** simulates chemical patterns (like spots and stripes on animals). Slow to compute, but produces textures that no other algorithm can match. The Gray-Scott model with carefully tuned feed and kill rates creates everything from coral to fingerprints.

For pen plotters, the challenge is converting continuous gradients to discrete strokes. Threshold the concentration field and trace contours. The resulting line art has a quality that's immediately recognizable as "real" in a way that most digital generative art isn't.

## Why Most Algorithms Fail

The failures share common traits. **Over-reliance on randomness**: if you can't predict approximately what the output will look like, the algorithm is generating noise, not art. **No composition awareness**: elements placed without regard for canvas edges, balance, or focal points. **Wrong scale for the medium**: what looks good on screen at 1000x1000 often fails as a physical plot because line density and spacing change with physical size.

The fix for all three: constrain the algorithm. Limit the parameter space. Test at output scale. Score ruthlessly. An algorithm that produces one great output and nine mediocre ones is worse than one that produces ten consistently good ones.

## Getting Started

If you want to try generative art for pen plotters, start with flow fields. They're forgiving, visually rewarding, and teach you the fundamentals: particle simulation, SVG output, and the relationship between parameter space and visual output.

The [Generative Art Starter Kit](/products) includes 10 production-ready generators, parameter guides, example outputs, and the scoring rubric. The [generative ASCII experiment](/lab/generative-ascii) on this site shows a related technique: mapping mathematical structures to character space.

The best generative art doesn't look generative. It looks like someone made a deliberate choice at every point. The algorithm just happens to be the one making those choices.