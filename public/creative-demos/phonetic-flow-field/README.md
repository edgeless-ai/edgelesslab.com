# Phonetic Flow Field

A standalone HTML/JS demo that fuses three techniques into a single coherent living system:

1. **Nullschool-style particle advection** — 500 letter-agents drift through a continuous 2D Perlin-noise vector field.
2. **Schelling-style social physics** — agents evaluate their 20 nearest neighbors every 10 frames; if the ratio of same-phonetic-class neighbors falls below the "Social Bias" threshold, they apply a corrective force toward their own cluster.
3. **Typatone-style generative audio** — when an agent transitions from dissatisfied to satisfied, it triggers a synthesized tone mapped to its phonetic class.

## Running the Demo

Open `index.html` in any modern browser. No build step or external assets are required beyond the p5.js CDN link.

```bash
# Option 1: double-click index.html
# Option 2: serve locally
python3 -m http.server 8000 --directory .
```

Then visit `http://localhost:8000`.

## Interactions

| Input | Behavior |
|-------|----------|
| **Mouse click** | Spawns 20 new agents at the cursor, all of the same randomly chosen phonetic class (a "colony injection"). Also initializes audio on first click. |
| **Mouse drag** | Repels agents within 100px via an inverse-square force. |
| **Slider** | Adjusts the Schelling satisfaction threshold (0–100%). At 0% agents are always satisfied (pure flow field). At 100% they demand perfect monoculture. |
| **Key `S`** | Toggles audio on/off. |
| **Key `R`** | Re-seeds all agents with new random positions and characters. |

## Color Palette

| Role | Hex | Meaning |
|------|-----|---------|
| Background | `#000011` | Deep space navy |
| Vowels | `#00FFFF` | Cyan; high-energy, voiced |
| Plosives | `#FF00FF` | Magenta; sudden, percussive |
| Fricatives | `#FFFFFF` | White; turbulent, airy |
| Nasals | `#008080` | Teal; resonant, mid-speed |
| Liquids | `#001F3F` | Dark blue; subtle, slow |
| Dissatisfied | `#FF3333` | Red pulse when below threshold |

## Audio Design

Each phonetic class has a distinct timbre and pitch range:

- **Vowels** — Sine wave, pentatonic (C4–A4), 120ms
- **Plosives** — Triangle wave, low staccato (C2–G2), 60ms
- **Fricatives** — White noise through bandpass (2–4kHz), 80ms
- **Nasals** — Square wave with 6Hz vibrato (C3–E3), 150ms
- **Liquids** — Sine wave with slow attack (C2–E2), 200ms

All tones are routed through a master `GainNode` at 0.3 to avoid clipping.

## The Outlier (3% Weirdness)

Every 15 seconds, one random agent becomes "The Outlier" for 10 seconds:

- Its displayed phonetic class (and therefore color and desired neighborhood) flips to a random other class.
- It is almost always dissatisfied, so its social force pulls it toward a cluster that does not want it.
- Its color flickers between true and false class at ~4Hz.
- When within 50px of any other agent, it emits a dissonant minor-second sawtooth tone.

This tiny disruption prevents the system from ever fully crystallizing and keeps the motion alive.

## Implementation Notes

- **p5.js** is used in global mode with `createCanvas(windowWidth, windowHeight)` and `textFont('monospace')` for legibility at 14px.
- **Performance:** A 2D spatial hash grid (50×50px cells) is rebuilt every frame so that the nearest-neighbor search (evaluated every 10 frames) only checks the local 3×3 block of cells. This keeps the simulation running smoothly at 60fps.
- **Trail persistence:** Instead of storing per-agent position histories, a semi-transparent screen-wide rectangle (`fill(0, 0, 17, 20)`) is drawn each frame. This is the classic Nullschool approach and is much faster than individual trail rendering.
- **Audio context:** Initialized lazily on the first user click/keypress to comply with browser autoplay policies.
- **Edge wrapping:** Agents wrap around the canvas edges so the flow field is toroidal.
