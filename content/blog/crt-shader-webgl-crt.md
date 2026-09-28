---
slug: crt-shader-webgl-crt
title: crt-shader: An Open-Source CRT Shader for WebGL 2
description: A self-contained WebGL 2 fragment shader that renders CRT monitor effects in-browser. No dependencies, no plugins, no post-processing stack.
date: 2026-09-28
tags:
- WebGL
- Shaders
- Creative Coding
- Generative Art
readTime: 6 min
---

# crt-shader: An Open-Source CRT Shader for WebGL 2

**Date:** 2026-09-27
**Status:** Draft — humanizer pass complete
**Source:** `claude-vault/03-Knowledge/2026-09-27-crt-shader-webgl-crt-effect.md`

---

## What it is

crt-shader is a WebGL 2 fragment shader that renders CRT monitor effects in-browser. No dependencies. No plugin. Drop it in and your flat panel starts looking like a 1998 Sony Trinitron.

## What it actually does

The shader simulates five things that make CRTs feel like CRTs:

- **Scanlines** — the dark horizontal bands between phosphor rows
- **Mask** — the shadow mask pattern (aperture grille vs. slot mask)
- **Curvature** — the glass bulge at the edges
- **Chromatic aberration** — color fringing where red/green/blue don't quite line up
- **Flicker** — the subtle vertical refresh artifact

All of it runs in a single fragment shader pass. No post-processing stack. No framebuffers to juggle.

## Why it's worth looking at

Most "CRT shader" projects are either:
1. A handful of uniforms wrapped around a noise texture (looks fake)
2. A full Three.js/post-processing chain (overkill for a website)

crt-shader is neither. It's a self-contained shader with real physical modeling of the mask and curvature. The scanline phase offset is computed per-row, not per-pixel, which is what makes it look like a real tube instead of a filtered image.

## How to use it

```glsl
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;
  uv.y *= u_resolution.y / u_resolution.x;

  // Scanlines
  float scanline = sin(uv.y * u_resolution.y * 1.4) * 0.5 + 0.5;

  // Curvature
  float r = length(uv - 0.5);
  float curve = 1.0 - r * 0.15;

  vec3 color = vec3(1.0);
  color *= scanline * curve;

  gl_FragColor = vec4(color, 1.0);
}
```

The full shader has ~20 uniforms for mask type, curvature amount, brightness, contrast, and flicker rate. All documented in the README.

## The one-line version

It's the CRT effect you'd actually put on a production site — not a demo, not a toy.
