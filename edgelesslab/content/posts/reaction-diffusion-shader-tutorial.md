---
title: "Building Reaction-Diffusion Shaders from Scratch"
description: "How the Gray-Scott model spawns biological patterns in a WebGL fragment shader — with a live interactive demo you can tweak in real time."
date: 2026-05-15T20:00:00-07:00
author: "Edgeless Lab"
tags: ["shaders", "webgl", "generative-art", "reaction-diffusion", "tutorial"]
image: /og/reaction-diffusion-shader-tutorial.webp
---

Zebra stripes. Coral growth rings. Leopard spots. The Turing patterns that decorate the natural world all spring from the same mechanism: two chemicals diffusing and reacting in a field.

This is not poetry — this is code. The Gray-Scott reaction-diffusion model is a handful of arithmetic operations that, when mapped onto a GPU fragment shader, produce the same intricate geometries that evolution has been running for hundreds of millions of years.

This tutorial builds one from scratch. You'll understand the math, write the shader, and build a live demo that lets you paint chemistry across the screen.

---

## What Is Reaction-Diffusion?

At its core, a reaction-diffusion system is a field where two substances coexist and interact. Call them U (the *substrate*) and V (the *activator*).

### The Rules

1. **Diffusion:** U and V spread to neighboring cells each frame. In a shader, this is a 3×3 Laplacian convolution.
2. **Feeding:** U is continuously added to the system.
3. **Killing:** V is continuously removed.
4. **Reaction:** U and V interact: `U + 2V → 3V`. Substrate turns into activator when activator is present.

On a CPU grid this sounds like a simulation. On a GPU it is a texture operation — each pixel computes its own chemistry based on its neighbors' chemistry, in parallel.

---

## Setting Up the Simulator

WebGL 1 is everywhere. We use it because it requires zero build tooling to run a shader in a `<canvas>`.

### The Ping-Pong Pattern

A simulation needs to *read last frame, write this frame*. Textures are immutable resources in WebGL — you can't write into the texture you're reading from. The solution is two framebuffers: read from A, write to B, then swap.

```glsl
// fragment shader — read from sampler2D u_texture, write gl_FragColor
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_texture;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec4 pixel = texture2D(u_texture, uv);
    // ... chemistry here ...
    gl_FragColor = result;
}
```

### Building the State Texture

Before running the simulation, the state texture needs initial conditions. Pure noise makes the system collapse to trivial attractors. The right initialization is a sparse injection of V into a sea of U:

```javascript
function initStateTexture(gl, width, height) {
    const data = new Float32Array(width * height * 4);
    for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i]     = 1.0; // U = 1
        data[i + 1] = 0.0; // V = 0
    }
    }
    // Inject activator in the center
    const cx = Math.floor(width * 0.5);
    const cy = Math.floor(height * 0.5);
    const r = Math.min(width, height) * 0.15;
    for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx*dx + dy*dy < r*r) {
            const i = (y * width + x) * 4;
            data[i]     = 0.5; // U
            data[i + 1] = 0.25; // V seed
        }
    }
    }
    return textureFromData(gl, data, width, height);
}
```

---

## The Chemistry

### Laplacian (Diffusion Operator)

The discrete Laplacian is a weighted sum of a pixel and its 8 neighbors. It's the standard 3×3 stencil used in PDE solvers:

```
|  0  0.5  0 |
| 0.5 -2  0.5 |
|  0  0.5  0 |
(plus diagonals weighted 0.25 each for isotropic diffusion)
```

In GLSL:

```glsl
vec4 laplacian(vec2 uv, vec2 texel) {
    vec4 c = texture2D(u_texture, uv);
    vec4 n  = texture2D(u_texture, uv + vec2(0.0,  texel.y));
    vec4 s  = texture2D(u_texture, uv + vec2(0.0, -texel.y));
    vec4 e  = texture2D(u_texture, uv + vec2( texel.x, 0.0));
    vec4 w  = texture2D(u_texture, uv + vec2(-texel.x, 0.0));
    vec4 nw = texture2D(u_texture, uv + vec2(-texel.x,  texel.y));
    vec4 ne = texture2D(u_texture, uv + vec2( texel.x,  texel.y));
    vec4 sw = texture2D(u_texture, uv + vec2(-texel.x, -texel.y));
    vec4 se = texture2D(u_texture, uv + vec2( texel.x, -texel.y));
    return (n + s + e + w) * 0.5 +
           (ne + nw + se + sw) * 0.25 -
           c * 2.0;
}
```

### The Gray-Scott Update

This is the heart of the simulation, 8 lines:

```glsl
// Reaction-diffusion parameters
const float dU = 0.16;   // Diffusion rate of U
const float dV = 0.08;   // Diffusion rate of V
const float f  = 0.060;  // Feed rate (U replenishment)
const float k  = 0.062;  // Kill rate (V removal)

vec2 st = fragCoord / iResolution.xy;
vec2 texel = 1.0 / iResolution.xy;

vec4 L = laplacian(st, texel);
float U = state.r;
float V = state.g;

// Gray-Scott equations
float dU_dt = dU * L.r - U * V * V + f * (1.0 - U);
float dV_dt = dV * L.g + U * V * V - (f + k) * V;

U += dU_dt * 0.8; // timestep
V += dV_dt * 0.8;

outColor = vec4(U, V, 0.0, 1.0);
```

The `(f + k)` term is killer — literally. When V exceeds the threshold `f + k`, it dies faster than the reaction can produce it. This is the knife edge: a small change to `k` can collapse a rich pattern into featureless gray or explode it into total activation.

---

## Pattern Phases — Reading the Parameter Space

The GB of the Gray-Scott model is the `f * k` plane. Different emerge for different regions. Here are the landmarks:

| Region | f range | k range | Pattern |
|---------|---------|---------|---------|
| Spots | 0.030–0.070 | 0.060–0.065 | U-shaped "holes" in V field |
| Waves | 0.014–0.020 | 0.054–0.060 | Traveling pulse trains |
| Maze | 0.029–0.030 | 0.057–0.063 | Labyrinthine corridors |
| Chaos | 0.025–0.027 | 0.060–0.065 | Turbulent agititating |

This is why the demo below has a "Magic Seed" button — it tweaks those values into a region we copied from published Turing maps. You can break it in interesting ways.

---

## Rendering the Patterns

After running the simulation, we need to turn the `(U, V)` field into something visible. The simplest is a direct mapping: `rgb = normalize(vec3(V, V*0.8, 1.0-U))` which maps the activation field to a cyan → green → hot color ramp.

```glsl
// Render pass — distinct from simulation pass
vec4 state = texture2D(u_texture, uv);
float V = state.g;
float U = state.r;

// Two-tone highlight: pinks for high activation, greys for U field
vec3 color = mix(
    vec3(0.08, 0.04, 0.12),  // deep background
    vec3(1.0, 0.6, 0.75),    // hot pink for V
    pow(V, 0.8)              // nonlinear boost
);
color = mix(color, vec3(0.6, 0.8, 1.0), pow(V, 2.5));
gl_FragColor = vec4(color, 1.0);
```

The nonlinear transfer functions (`pow(V, 0.8)`, `pow(V, 2.5)`) are where "artistic" meets "mathematical." Linear mapping looks flat. Small power adjustments compress the dynamic range and make patterns *punch*.

---

## Interactive Demo

The embed below is the full shader running in your browser. Click and drag to inject V (activator) into the U field. Use the parameter sliders to explore the phase space.

<div class="shader-embed" id="gray-scott-demo" data-feed-rate="0.054" data-kill-rate="0.064"></div>
<script type="module" src="/demos/reaction-diffusion-demo.js"></script>

<!--
NOTE: The interactive demo implementation lives in /static/demos/reaction-diffusion-demo.js.
We intentionally keep this post free of giant inline JS blocks.
-->


---

## The API Reference in Practice

When writing a WebGL shader, the math is only half the battle. The half that will slow you down is *picking values* that actually work. Here's a condensed reference showing the safe zones and notable frontiers:

<figure class="post-embed" style="margin:2em 0;overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;font-size:0.85em">
    <thead>
      <tr style="background:var(--accent,#4f46e5);color:white">
        <th style="padding:8px;text-align:left">Name</th>
        <th style="padding:8px;text-align:left">f (feed)</th>
        <th style="padding:8px;text-align:left">k (kill)</th>
        <th style="padding:8px;text-align:left">Visual</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f9f9f9"><td>目标</td><td>0.054</td><td>0.064</td><td>目标状态</td></tr>
      <tr><td>骆驼</td><td>0.0250</td><td>0.0645</td><td>驼峰状曲线</td></tr>
      <tr style="background:#f9f9f9"><td>海螺</td><td>0.0620</td><td>0.0609</td><td>螺旋形状</td></tr>
      <tr><td>洞穴</td><td>0.0580</td><td>0.0630</td><td>洞穴结构</td></tr>
      <tr style="background:#f9f9f9"><td>波纹带</td><td>0.0140</td><td>0.0540</td><td>周期性波纹</td></tr>
      <tr><td>涟漪</td><td>0.0180</td><td>0.0500</td><td>扩散波纹</td></tr>
    </tbody>
  </table>
</figure>

**Safe zones**: `f > 0` and `f + k < 1`. The kill rate `k` should almost always exceed the feed rate `f` — that's what prevents runaway activation and keeps the system near equilibrium rather than reaching saturation at `V = 1.0`.

**Practical starting point**: `f = 0.055, k = 0.062` (or your target: `f = 0.054, k = 0.064`) is the region we use in the demo. It produces spots and maze-like corridors without vanishing into noise. You will lose hours here — the space is fractal and every pixel of parameter shift produces a new organism.

---

## Adding Mouse Interaction

The demo lets you *paint* V into the simulation. This is the difference between watching and exploring: you see the pattern react to your intervention.

```javascript
canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * simWidth;
  const y = 1.0 - (e.clientY - rect.top) / rect.height * simHeight;

  // Inject V at mouse position — done by drawing a circle into the state texture
  const brushRadius = simWidth * 0.02;
  injectActivator(x, y, brushRadius);
});
```

The subtle trick: mouse injection is *matrix-under* to simulation, not a simulation parameter. You're seeding the attractor externally, and the attractor's own growth dynamics determine how far that bleed spreads over subsequent ticks. If you inject in a stable attractor, the injection dissipates. If you inject in a previously dormant zone, you might seed an entirely new organism.

---

## Deployment Gotchas

**Color accuracy**: WebGL renders in sRGB but the framebuffer is linear. Wrap rendering with `gl.needContext(gl, { antialias: false })` and call `gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)`. For proper sRGB output, use `gl.renderbufferStorageMultisample` and `gl.SRGB8` attachments when available.

**Mobile performance**: A 512×512 simulation on a mobile GPU is one thing; a 1024×1024 with antialiased rendering is another. The live demo detects available memory caps on loadgear and steps down to 256×256 on constrained devices automatically.

**Loop unrolling**: WebGL 1 frag shaders disallow for-loops with dynamic bounds in some implementations. Hard-code your stencil or precompute offsets. In the live demo, the Laplacian is unrolled manually rather than looped.

---

## Where to Go Next

The Gray-Scott model is the teaching tool, not the endgame. Once you grok these mechanics, the obvious extensions are:

1. **Chunks / load culling** — run simulation only in regions that have changed, an infinite plane
2. **GPU compute** — WebGL 2 transform feedback or WebGPU for 3D reaction-diffusion fields
3. **ShaderToy port** — same method, GLSL sandbox trivially, with bonus Perlin noise parameters
4. **Physics coupling** — let the activation field push vertices (displacement surface)
5. **Audio-reactive seeding** — feed in spectrum analysis to bias parameters in real-time

The core insight survives all of these: *diffusion + nonlinear reaction = emergence*. The rest is packaging.

---

## Attribution & Origins

This system originates with Alan Turing's 1952 paper *"The Chemical Basis of Morphogenesis"* — substrate morphogenesis. The two-species Gray-Scott variant was formalized in 1983 by P. Gray & S.K. Scott, then rediscovered by the procedural graphics community in the 2010s when shader demoscene artists ported it to fragment shaders and began posting iterations on GLSL sandboxes. The Turing paper is essential reading: the reaction mechanism is *precisely* what Turing described, just run on a rectangular grid instead of a developing organism's tissues.
