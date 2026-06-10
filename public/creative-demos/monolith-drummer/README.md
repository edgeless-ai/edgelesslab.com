# Monolith Drummer

A p5.js generative art piece that fuses Moshun-style modular 3D typography with Patatap-style keyboard audio-visual mapping. Type to spawn pseudo-3D isometric letter blocks that drum, pulse, and collide — but 3% of them are cannibal monoliths that slowly consume their own phonetic kind.

---

## Technique Notes

This demo is a hybrid of two distinct creative systems:

**Moshun-style modular 3D typography**
Each typed letter spawns as a pseudo-3D isometric block with a front face (saturated color), a lighter top face (`#C0C0C0`), and a darker side face (`#808080`). The block size is literal modular typography — narrow letters are physically smaller, wide letters are wider. When a block spawns, it enters with a back-ease overshoot, sliding past its target then snapping back elastically. The camera tracks the average position of all blocks with the same overshoot physics, making the canvas feel like a spring suspension.

**Patatap-style keyboard audio-visual mapping**
Each keystroke triggers a synthesized tone via the Web Audio API. The phonetic class of the letter determines both the block's color and its waveform: vowels (red / sine), plosives (blue / square), fricatives (green / sawtooth), nasals (yellow / triangle), and liquids (purple / sine). Block-to-block collisions trigger chordal bursts. The spacebar triggers a global drum hit that causes every block to pulse simultaneously.

**3% Weirdness**
Exactly 3% of spawned blocks are cannibal monoliths, marked by a red glow. They slowly drift toward the nearest block of the same phonetic class, consume it on contact (growing by 20% and dropping one octave), and leave a fading dark scar behind. The camera shudders when a monolith feeds. Every block also has a subtle metabolic pulse — a living heartbeat encoded in its scale oscillation.

---

## How to Interact

| Interaction | Behavior |
|-------------|----------|
| **Type letters / numbers** | Spawn a modular 3D letter block at a random position. It overshoots, then settles. |
| **Spacebar** | Triggers a global drum hit — all blocks pulse to 1.4× scale and decay back. |
| **Click a block** | Kicks the block with a random upward impulse. |
| **Drag mouse** | Creates a repulsion field — blocks within 100px of the cursor are pushed away. |
| **R** | Clears all blocks and scars. |
| **M** | Toggles audio mute. |

---

## Attribution

- **Moshun** — Animated typeface by Jono Gaughan, distributed via [Animography](https://animography.net/products/moshun). The modular 3D block letterforms, mechanical aesthetic, and back-ease overshoot animation are derived from this resource.
- **Patatap** — Interactive audio-visual instrument by [Jono Brandel](https://patatap.com). The keyboard-to-event mapping, saturated color palette, and Web Audio API + Canvas synchronization are derived from this resource.

Both resources were discovered and documented on 2026-06-09 as part of the creative knowledge pipeline. Full ingest notes are available in the vault:
- `~/claude-vault/03-Knowledge/creative-resources/typography-motion-01.md` (Patatap)
- `~/claude-vault/03-Knowledge/creative-resources/typography-motion-02.md` (Moshun)
- `~/claude-vault/03-Knowledge/creative-resources/prompts/prompt-06.md` (generation prompt)

---

## File Location

The demo is a single self-contained `index.html` file that runs in any modern browser with no build step required.

```
~/claude-projects/creative-demos/monolith-drummer/index.html
```

Open the file directly in a browser, or serve it from any static file server.
