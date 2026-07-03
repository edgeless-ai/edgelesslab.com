---
slug: cursor-swarm-brush
title: Noise-Shared Cursor Swarm Brush
description: 64 particles track your cursor through a recursive geometric subdivision.
  Noise-driven turbulence stains tiles as you move.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Noise
- Particles
readTime: 3 min
---

# Noise-Shared Cursor Swarm Brush

Three creative coding aesthetics fused into one: Zajno's cursor-velocity displacement, Manoloide's recursive geometric subdivision, and Raven Kwok's global noise field.

See it live: [Cursor Swarm Brush](/creative-demos/cursor-swarm-brush/)

## The Three Techniques

### Recursive Geometric Subdivision

The background is built via a recursive quad-tree-like subdivision. A tile splits when its size exceeds a minimum threshold and a 2D simplex noise sample at its center crosses a threshold. Split direction (horizontal vs vertical) is also noise-driven, producing an organic, off-center tessellation rather than a rigid grid.

### Shared Noise Field

A single lightweight inline simplex noise function drives both the tile vertex displacement and the swarm turbulence. Each corner of every tile is displaced by the noise field, creating a breathing, warped mosaic. The cursor-following particles receive velocity impulses from the same field, so the swarm and the tiles warp in the same organic direction. If this technique is new to you, [flow fields and noise-driven algorithms](/blog/generative-art-algorithms-that-work/) covers where it earns its keep.

### Cursor Swarm

The cursor is replaced by 64 particles that lerp-track the mouse position at a factor of ~0.12. Each particle has independent noise-driven turbulence. When the cursor moves fast (velocity > 12 px/frame), particles are randomly shed. These shed particles fall toward the nearest tile and "stain" it.

## The Stain Mechanism

When a shed particle lands on a tile, it does not change the tile's color permanently. It adds a temporary color overlay that fades over 60 frames. The overlay color is sampled from the particle's velocity: fast particles are warm, slow particles are cool. The tile retains a memory of recent activity.

The result is a canvas that records your cursor's path not as a line, but as a field of stains. The stains overlap, fade, and accumulate. The canvas has memory.

## What It Teaches

The key insight is sharing the noise field between two unrelated systems. The tiles and the swarm are independent subsystems, but they respond to the same underlying field. This creates visual coherence without explicit coupling. The tiles breathe, the swarm drifts, and both move in the same direction because they read the same noise.

This is a general pattern: use a shared noise field to coordinate independent visual systems. The coupling is implicit, not explicit. The systems do not know about each other. They only know about the field.

More experiments like this live in [the full demos collection](/blog/creative-demos-collection/).