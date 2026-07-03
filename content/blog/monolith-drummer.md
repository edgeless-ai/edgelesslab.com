---
slug: monolith-drummer
title: Monolith Drummer
description: A 3D monolith that responds to rhythm. Web Audio API drives the geometry,
  each beat deforms the surface.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- WebGL
- Audio
readTime: 3 min
---

# Monolith Drummer

A 3D monolith that listens to rhythm and deforms its surface in response. WebGL renders the geometry, Web Audio API drives the deformation.

The live artifact: [Open Monolith Drummer](/creative-demos/monolith-drummer/)

## The Geometry

The monolith is a subdivided cube, 32 segments per face. The vertices are displaced by a combination of:

- **Base noise**: low-frequency Perlin noise that gives the monolith a rough, stone-like surface
- **Beat deformation**: on each detected beat, a radial displacement is applied to vertices near the beat's origin point
- **Decay**: the deformation decays exponentially over 30 frames

The monolith is rendered with a single directional light and flat shading. The aesthetic is brutalist: dark gray, no texture, no specular. The geometry is the entire visual.

## The Audio Pipeline

The Web Audio API provides real-time frequency analysis. Beats are detected by thresholding the low-frequency energy. On each beat, a random point on the monolith's surface is chosen as the deformation origin. The displacement is radial: vertices near the origin move outward, vertices far away are unaffected.

The deformation is not symmetric. The beat's frequency content determines the deformation shape: low beats produce broad, shallow deformations. High beats produce sharp, localized deformations.

## The Visual Result

The monolith appears to be breathing. Beats produce visible pulses that travel across the surface and fade. The pulses overlap. A fast rhythm creates a continuously vibrating surface. A slow rhythm creates isolated, distinct deformations.

The monolith is never still. Even without audio input, the base noise produces a subtle, constant motion. The monolith is alive.

## What It Teaches

The key technique is mapping audio events to geometric deformations. The mapping is not direct (amplitude -> displacement). It is event-driven (beat -> deformation). The deformation has memory (decay), so the visual is not just a frame-by-frame reaction. It is a cumulative record of recent beats.

This pattern applies to any audio-driven geometry: detect events, apply localized deformations, let them decay. The result is a visual that responds to rhythm without being a slave to it.

For a sibling study driven by continuous frequency data instead of discrete beats, see the [Chladni Visualizer](/blog/chladni-waveform-visualizer). Monolith Drummer lives alongside the rest of the [creative demos collection](/blog/creative-demos-collection).