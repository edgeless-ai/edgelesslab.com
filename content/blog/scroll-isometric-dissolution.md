---
slug: scroll-isometric-dissolution
title: Scroll-Isometric Dissolution
description: Isometric typography that dissolves into particles as you scroll. A 3D
  word space that collapses under velocity.
date: '2026-06-10'
tags:
- Creative
- Generative Art
- Typography
- Scroll
readTime: 3 min
---

# Scroll-Isometric Dissolution

Isometric typography exists in a curious space between 2D and 3D. It reads as depth without actually having it. The illusion is cheap — a 30-degree angle, a shadow, a second face — but the brain buys it immediately.

This demo asks: what happens when that illusion dissolves?

The live artifact: [Open Scroll-Isometric Dissolution](/creative-demos/scroll-isometric-dissolution/)

## The Mechanism

A word is rendered in isometric projection. Each letter has three faces: front, top, side. The faces are not polygons. They are CSS transforms on divs. The isometric effect is achieved with `rotateX(60deg) rotateZ(-45deg)`, a standard axonometric trick.

As you scroll, the word begins to break apart. Not all at once — from the edges inward, or from the center outward, depending on scroll direction. Each letter face becomes a particle. The particle inherits the face's color and position, then drifts away with velocity proportional to scroll speed.

## The Physics

The particles are simple: position, velocity, drag, and a fade. No collision, no gravity. The dissolution looks chaotic but is actually deterministic. The same scroll velocity produces the same particle cloud every time.

The drag coefficient is tuned to feel like ink dispersing in water. Fast scroll = explosive dissolution. Slow scroll = gentle peeling. The particles reassemble when you scroll back up, but not perfectly. Each cycle leaves residue.

## The Design Decision

The isometric projection was chosen because it is the most readable fake-3D. A perspective projection would look more realistic but less typographic. The goal was a word that is clearly a word until it isn't.

The color palette is monochrome: black faces on white, with a single accent color for the particle trails. The accent changes based on scroll velocity: cool at low speeds, warm at high speeds.

## What It Teaches

Scroll is not just navigation. It is a force. The demo treats scroll velocity as a physical input, not a positional one. The word is not at a scroll position. It is in a scroll field.

This is a useful pattern for any scroll-driven animation: measure velocity, not position. Velocity carries energy. Position is just a coordinate.