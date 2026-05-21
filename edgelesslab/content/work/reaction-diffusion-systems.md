---
title: "Reaction-Diffusion Systems"
description: "Simulating biological pattern formation with Gray-Scott and Turing reaction-diffusion models."
date: 2026-04-18
tags: ["generative-art", "shaders", "webgl", "patterns"]
---

Reaction-diffusion systems simulate how chemicals spread and react to create emergent patterns found throughout nature—zebra stripes, coral formations, and leopard spots all arise from similar mathematical processes.

## Gray-Scott Model

The Gray-Scott model simulates two chemical reactants (A and B) where:
- A is continuously fed into the system
- B is continuously removed
- A + 2B → 3B (the reaction)

Parameters control the resulting patterns: spots, stripes, mazes, and chaotic regions emerge from simple parameter shifts.

## Technical Implementation

GPU acceleration via WebGL shaders enables real-time parameter exploration. Each frame runs a compute shader performing:
1. Diffusion (Laplacian convolution)
2. Reaction (nonlinear interaction)
3. Render (visualization)

## Gallery

(Interactive demos would be embedded here)
