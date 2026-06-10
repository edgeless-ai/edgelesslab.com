# Sashiko Wave Weaver

A living Sashiko textile where a 16×16 binary stitch grid is rendered as CSS DOM elements and animated by a Yasai-style sine-wave engine. The mouse controls the wave's frequency and amplitude. A rogue "Ghost Stitch" periodically breaks free from the grid and floats with its own physics.

---

## Technique Notes

### Sashiko Binary Stitch Pattern

The grid is a 16×16 matrix where each row and column carries a binary offset (0 or 1). A row offset of 1 means stitches in that row start shifted by half a cell; a column offset of 1 means stitches in that column start shifted by half a cell. The interference between row and column offsets creates emergent geometric patterns — crosses, diamonds, snowflakes — from simple OR logic:

```
hasStitch = (x + colOffsets[x]) % 2 == 0  OR  (y + rowOffsets[y]) % 2 == 0
```

With 2^32 possible combinations, every click generates a unique textile.

### Yasai CSS Variable-Driven Wave Engine

Every frame, a JavaScript loop computes a sine wave for each cell based on its index and global time:

```
wave = sin(t * frequency + index * 0.1) * amplitude
```

This bipolar value is written to CSS custom properties `--scale` and `--opacity` on each cell. The CSS `transition` engine interpolates between values, creating smooth, organic motion. Positive wave values expand the white stitch line; negative values contract it.

### DOM-as-Canvas Architecture

The entire piece is built with CSS Grid and DOM elements. There is no Canvas 2D or WebGL. The browser's compositor handles the interpolation, making the animation extremely lightweight even with 256 elements. This demonstrates that the DOM can be a powerful generative art medium when paired with CSS custom properties.

### Mouse-Driven Parameters

- **Mouse X** (normalized 0–1) maps to wave frequency: `0.5 … 4.0`
- **Mouse Y** (normalized 0–1) maps to wave amplitude: `0.2 … 1.0`

### Ghost Stitch (3% Weirdness)

Every ~60 frames, a single coral-red stitch detaches from the binary grid and becomes a rogue element. It:
- Ignores the Sashiko binary constraint (always visible)
- Follows its own wave function with double frequency
- Rotates slightly based on its wave value
- Fades out linearly over 3 seconds (180 frames)
- Is removed from the DOM entirely after despawn

This creates a momentary collision of order and chaos — a red thread in a blue world.

---

## Running the Demo

Simply open `index.html` in any modern web browser. No build step, no external dependencies, no server required.

```bash
open index.html
```

---

## Attribution

- **Concept & Prompt:** Phase 2 SYNTHESIZE agent | 2026-06-10
- **Implementation:** Phase 3 PRODUCE agent
- **Techniques fused:**
  - *Sashiko Design Generator* (binary stitch offset / Hitomezashi embroidery / emergent textile geometry / indigo-and-white palette)
  - *Yasai CSS Generative Art* (CSS variable-driven wave grid / JS sine-randomization / per-element state transitions)

---

## License

This demo is a creative artifact produced as part of an internal generative-art pipeline. Use freely for learning, remixing, or exhibition.
