# Elastic Feedback Stage

A fullscreen Canvas 2D feedback loop creates recursive decay trails that serve as a living backdrop for a scroll-driven narrative. Text blocks do not just pin — they arrive with elastic spring physics, overshoot, and settle.

## What It Is

This demo fuses two distinct creative-coding techniques into a single coherent system:

1. **Hydra-style Canvas 2D feedback loop** — A hidden `1024×1024` offscreen canvas maintains recursive decay. Every frame, the previous frame is drawn back onto itself at `92%` global alpha with slight scale (`0.998`) and rotation (`0.002` rad). A drifting geometric grid is drawn on top, producing organic ghosting and fractal-like trails. This is the CPU-fallback equivalent of Hydra's WebGL ping-pong FBO.

2. **14islands scroll-driven narrative with elastic physics** — The page is a `600vh` tall scroll container. Five text blocks are `position: sticky` with `top: 35vh`, but they do not snap instantly. Each block is a physics body with a spring force toward its target: `force = (targetY - currentY) * tension`. Velocity is damped at `0.85`, producing visible overshoot and 2–3 oscillations before settling. This replicates 14islands' GSAP elastic easing without external libraries.

## The Three Weirdnesses

1. **Scroll Scratch** — Scroll delta is accumulated into `scratchOffset`, which decays per frame. When `scratchOffset > 5`, the feedback transform receives random jitter and white horizontal scratch lines are drawn across the display. Aggressive scrolling literally scratches the feedback memory like a vinyl record.

2. **Elastic Overshoot** — Text blocks have custom spring physics. During overshoot, a `2px solid #cdfd50` (lime) border flashes on the block, giving a visual pulse to the spring recoil.

3. **Brightness-to-Tension Coupling** — Every 10 frames, the feedback canvas is downsampled to `16×16` and its average brightness is computed. This brightness (0–1) is mapped to the text block spring tension: `tension = 0.05 + brightness * 0.08`. When the feedback loop is bright and active, the text blocks are stiff and snap quickly. When it is dark and calm, the text blocks are loose and wobbly. The background literally controls the personality of the foreground.

## How to Run

No build step, no server, no dependencies.

```bash
# Option 1: Open directly in a browser
open index.html

# Option 2: Serve with any static file server
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Interactions

| Interaction | Behavior |
|-------------|----------|
| **Scroll down** | Drives sticky text blocks into view. Fast scrolling injects scratch displacement into the feedback loop. Text blocks arrive with elastic overshoot. |
| **Scroll up** | Text blocks fade out. Feedback loop continues but scratch displacement decreases. |
| **Fast scroll** | Feedback canvas develops white scratch lines and random rotational displacement. Chromatic split intensifies. |
| **Slow scroll / idle** | Feedback loop settles into gentle rotation and scale. Text blocks spring with low tension (wobbly) if dark, or high tension (snappy) if bright. |
| **Mouse move** | The geometric grid pattern is centered on the mouse position; rectangles drift toward the cursor. |

## Implementation

- **Single HTML file** — All CSS, HTML, and JS inline. No external files.
- **No external libraries** — Vanilla JS + Canvas 2D + CSS. No p5.js, Three.js, or GSAP.
- **Chromatic split** — The feedback canvas is drawn to the screen three times with `globalCompositeOperation = 'screen'` at `(-2, 0)`, `(0, 0)`, and `(+2, 0)` offsets, creating a subtle RGB channel separation.
- **Performance** — The feedback loop runs at `1024×1024` on modern hardware. If needed, reduce the offscreen canvas to `512×512`.
- **Accessibility** — A skip link is provided. The display canvas has `aria-label`. Text blocks are standard DOM elements and screen-reader accessible.

## Color Palette

| Role | Hex |
|------|-----|
| Feedback void | `#000000` |
| Feedback trail | `#FF0055` |
| Feedback accent | `#00FFAA` |
| Feedback glitch | `#FFDD00` |
| Text block surface | `#F5F5F0` |
| Text primary | `#1A1A1A` |
| Text secondary | `#899090` |
| Elastic accent | `#cdfd50` |
| Scroll scratch | `#FFFFFF` |

## Attribution

- **Hydra** (live coding / WebGL ping-pong feedback / recursive decay / chainable coordinate transforms) — Olivia Jack & the live-coding community
- **14islands** (GSAP elastic physics / scroll-driven narrative / real-time WebGL stage / polished brand storytelling) — 14islands studio

Concept and prompt synthesized by the Phase 2 SYNTHESIZE agent. Built by the Phase 3 PRODUCE agent.

## License

Demonstration code. Use freely for learning and remixing.
