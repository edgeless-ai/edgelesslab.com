# Ghost Sashiko Weaver

A self-contained HTML/JS demo that fuses **Sashiko embroidery** (traditional Japanese running-stitch patterns) with a **Codrops-style WebGL motion-trail feedback loop**. Each stitch is drawn one per frame to an offscreen Canvas2D texture, which is then composited through a ping-pong framebuffer with simplex-noise UV distortion, mouse-biased offset, and a frayed-edge decay gradient.

---

## Concept

Sashiko is a form of Japanese folk embroidery that uses running stitches to create geometric patterns. In this demo, the pattern is defined by two binary strings: `h` (horizontal offsets) and `v` (vertical offsets). Each `1` shifts the stitches by one dash length, creating interference patterns that look like traditional Sashiko motifs.

The twist: instead of rendering the full pattern instantly, each stitch is drawn one per frame, leaving a ghostly trail that fades into an indigo fabric background. The trail is distorted by simplex noise and pulled toward the mouse cursor, turning the embroidery into a temporal fluid simulation.

---

## Technique Notes

1. **Sashiko Binary Parsing**
   - Two input strings (`h` and `v`) define horizontal and vertical stitch offsets.
   - Grid: 28×28 stitches, `STITCH = 20px`, `LEADING = 80px`, `MARGIN = 44px`.
   - Stitches are shuffled (Fisher–Yates) for emergent animation order.

2. **Temporal Animation**
   - One stitch per frame is drawn to an offscreen 800×800 Canvas2D texture.
   - The texture is uploaded to the GPU via `THREE.CanvasTexture` each frame.

3. **Ping-Pong Motion Trail**
   - Two `THREE.WebGLRenderTarget` framebuffers alternate each frame.
   - The post-process fragment shader samples the previous frame with a slight UV offset and multiplies by `0.97–0.99` (frayed-edge decay), creating a ghostly fade.

4. **Simplex Noise Distortion**
   - A 2D GLSL simplex noise function (Ashima Arts / Ian McEwan) perturbs the UV offset by `snoise(v_uv * 2.0 + time * 0.1) * 0.002`, making the trail swirl organically.

5. **Mouse Bias**
   - The UV offset direction is influenced by normalized mouse position (`mousePos * 0.004`), so the ghost trail follows the cursor like ink drawn by an invisible hand.

6. **Frayed Edge Decay**
   - The alpha decay is not uniform. It is `0.97 + distance(v_uv, vec2(0.5)) * 0.02`.
   - Stitches at the center fade faster (0.97); stitches at the edge fade slower (0.99), creating a frayed-border effect where the outer pattern persists longer.

7. **Needle Click**
   - Every 8th stitch triggers a 5ms 1200Hz sine wave via the Web Audio API, giving a subtle tactile sewing-machine feel.

8. **Fabric Substrate**
   - The background is a static canvas texture of indigo noise (`#1A237E` and `#00008B` rectangles).
   - The ghost trail fades into the grain, not into pure black, giving the embroidery a physical substrate.

---

## Color Palette

| Role | Hex |
|------|-----|
| Background | `#0A0A0A` |
| Stitch | `#FFFFFF` |
| Fabric indigo | `#1A237E` |
| Fabric dark | `#00008B` |
| Trail tint | `#222222` |
| Decay target | `#0A0A0A` |
| Needle flash | `#FFFFFF` |

---

## How to Run

1. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge).
2. No build step or server is required. Three.js is loaded from a CDN.
3. The demo is viewport-locked and auto-plays.

### Interactions

- **Mouse move**: The ghost trail swirls toward the cursor.
- **Type in input fields**: Change the `h` and `v` binary strings to generate new Sashiko patterns.
- **Random button**: Generates random 8-character binary strings.
- **Reset button**: Restores the default `10101010` / `01010101` pattern.
- **Auto-loop**: After the full pattern completes, the canvas clears and a new randomized stitch order begins after a 3-second pause.

---

## Attribution

- **Sashiko technique**: Traditional Japanese folk embroidery.
- **Motion trail / ping-pong feedback**: Inspired by Codrops WebGL tutorials (framebuffer ping-pong with alpha decay).
- **Simplex noise**: Ashima Arts / Ian McEwan 2D implementation.
- **Palette**: Sashiko indigo (`aizome`) + Codrops dark void.

---

*Built as part of the Ghost Sashiko Weaver creative pipeline prompt. 2026-06-09.*
