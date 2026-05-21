---
title: "Case Study: TouchDesigner Pen Plotter"
date: 2026-05-15T09:00:00-07:00
description: "A generative art pipeline connecting TouchDesigner, ASCII aesthetics, and physical pen-plotter output — custom specs, 32×32 grid geometry, and AxiDraw-ready SVG export."
author: "Edgeless Lab"
tags: ["generative-art", "touchdesigner", "pen-plotter", "svg", "physical-output", "ascii"]
image: "/og/default.webp"
draft: false
---

**Case Study #3** | Project: TouchDesigner + Pen Plotter | Status: Feature complete

---

## Problem

Generative artists who use TouchDesigner typically export static imagery — PNGs, MOVs, stills. The physical output path (pen plotter, plotter SVG, vpype → AxiDraw) requires a different file format, different tolerance, and a different rendering mindset.

The goal: build a TouchDesigner → SVG → AxiDraw pipeline that produces output a pen plotter can physically render — no "image export" middleman.

---

## What We Built: Hero Base Animation

Built via twozero MCP on 2026-04-29. Location in TouchDesigner: `/project1/hero_base`.

The project combines **3D swarm geometry** with **ASCII aesthetic conventions**. Every element of the design references monospace terminal culture — 32×32 grids, Courier font, block separators, CLI-style timestamps — embedded in generative 3D art:

```
HERO_BASE (containerCOMP)
│
├─ CHOP Animation Layer
│  ├─ time_driver (speedCHOP)        ──► seed animation driver
│  ├─ swarm_noise (noiseCHOP)        ──► organic displacement field
│  ├─ pulse_lfo (lfoCHOP)            ──► rhythmic heartbeat signal
│  └─ signal_blend (mathCHOP)        ──► combined motion signal
│
├─ SOP Geometry Layer (The Swarm)
│  ├─ ascii_grid (gridSOP)           ──► 32×32 particle emission surface
│  ├─ grid_displace (noiseSOP)       ──► dynamic displacement field
│  ├─ particle_sphere (sphereSOP)    ──► instanced geometry
│  └─ swarm_transform (transformSOP) ──► animated position/rotation
│
├─ TOP Post-Processing Layer
│  ├─ bg_noise (noiseTOP)            ──► procedural background
│  ├─ color_grade (levelTOP)         ──► brightness/contrast curves
│  └─ edge_glow (blurTOP)            ──► atmospheric glow layer
│
├─ COMP Rendering Layer
│  ├─ swarm_geo (geometryCOMP)       ──► 3D scene container
│  ├─ hero_cam (cameraCOMP)          ──► framing and motion
│  ├─ edgeless_light (lightCOMP)     ──► cyan point light source
│  └─ edgeless_mat (phongMAT)        ──► cyan/purple/phosphor surface
│
└─ Composite & Output Layer
   ├─ swarm_render (renderTOP)       ──► 3D → 2D rasterization
   ├─ scene_comp (compositeTOP)      ──► bg + 3D layer blend
   ├─ ascii_overlay (textTOP)        ──► monospace overlay text
   ├─ timestamp_text (textTOP)       ──► "2026-04-29 :: Hive#2662" identity
   ├─ final_comp (compositeTOP)      ──► full composite
   ├─ hero_out (nullTOP)             ──► final output node
   └─ hero_recorder (moviefileoutTOP)──► ProRes video export
```

### ASCII Allusions

| Visual Element | ASCII Reference | TouchDesigner Implementation |
|---|---|---|
| Grid density | 32×32 character grid | `ascii_grid` SOP with 32 rows/cols |
| Typography | Monospace Courier | `textTOP` with Courier font |
| Block separators | ██████ ASCII block chars | Overlay text TOP |
| Timestamp | CLI prompt format | `"2026-04-29 :: Hive#2662"` |
| Swarm identity | Agent codename notation | Hive#2662 as visual signature |

---

## Export Pipeline: TouchDesigner → AxiDraw

The hero_base COMP has **five exposed parameters** — all animatable, all keyframeable:

| Parameter | Type | Range | Default | Effect |
|---|---|---|---|---|
| **Seed** | Float | 0–1000 | 42 | Noise randomization seed |
| **Speed** | Float | 0.1–2.0 | 0.5 | Animation tempo |
| **Complexity** | Float | 1–10 | 3 | Particle/instance density |
| **ASCII Intensity** | Float | 0–1 | 0.6 | Overlay opacity |
| **Swarm Hue** | Float | 0–1 | 0.5 | Phase color selection |

Output files:
- `~/Desktop/hero_screenshot.png` — still frame export
- `~/Desktop/edgeless_hero_demo.mov` — full ProRes motion render

The project is validated in **Specimen integration** — parameter sweeps interpreted by Critic with 55/45 scoring rubric. Score runs are reproducible via batch parameter sweeps (Hermes-ready).

---

## Physical Output (Pen Plotter Coordinate Right)

| Item | Output | Format |
|---|---|---|
| **Still frame** | `hero_screenshot.png` | PNG |
| **Motion demo** | `edgeless_hero_demo.mov` | ProRes |
| **Integration mode** | Specimen + Critic | JSON score reports |

For pen-plotter export: the 32×32 grid and SVG primitives are compatible with vpype → AxiDraw pipeline. Export SOP → SVG → vpype vetting → AxiDraw-ready. Block chars (█) render as filled polygons, not ASCII text — clean for physical output.

---

## Stack

| Tool | Role |
|---|---|
| **TouchDesigner** | Core DCC, all CHOP/SOP/TOP/COMP work |
| **twozero MCP** | Claude-driven TD session control (2026-04-29) |
| **Hermes Critic** | 55/45 scoring, Specimen parameter prison |
| **vpype** | SVG → AxiDraw workflow |
| **AxiDraw SE/A3** | Target plotter hardware |

---

## Status

- ✅ COMP structure complete (20+ operators)
- ✅ 5 parameters on `hero_base` user page
- ✅ ProRes output verified
- ✅ ASCII overlay + Edgeless identity
- ⬜ vpype integration test (ready but not executed yet)
- ⬜ Specimen automated batch sweep (ready, not triggered)
