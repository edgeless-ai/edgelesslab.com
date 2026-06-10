# Percussive Archaeology

Type to spawn archaeological line-growth agents that crawl across a grid, play a sound on collision, and leave a permanent color trail — then watch the spacebar liquefy the bedrock.

---

## Technique Notes

This demo is a hybrid of two distinct creative-coding systems:

- **Substrate-style agent-based line growth:** A 2D grid of discrete cells. Each agent starts at a random empty cell and walks in one of four cardinal directions. It stops when it collides with an existing line, the grid boundary, or another agent. The result is a dense, archaeological network of colored paths that resembles root systems or fracture patterns.
- **Patatap-style keyboard-to-visual/audio mapping:** Each keystroke spawns a new agent. The agent's phonetic class (vowel, plosive, fricative, nasal, liquid) determines its color and the synthesized tone it plays when it collides. The keyboard is the instrument; the grid is the score.

---

## How to Interact

| Interaction | Behavior |
|-------------|----------|
| **Type letters / numbers** | Spawns a new line-growth agent at a random empty cell. The agent's color and sound are determined by the phonetic class of the key. |
| **Spacebar** | Spawns a shockwave at the current mouse position. All lines within the shockwave radius ripple sinusoidally for 2 seconds, then snap back. |
| **Mouse click** | Spawns a shockwave at the click position (same as spacebar). |
| **Key `M`** | Toggles audio on/off. |
| **Key `R`** | Clears the grid and resets the canvas to blank linen. |
| **Arrow keys** | Shift the grid's "gravity bias" — new agents prefer to grow in that direction. |

---

## Attribution

- **Substrate** — Agent-based line growth / grid collision technique inspired by the Substrate algorithm by [Jared Tarbell](http://www.complexification.net/gallery/machines/substrate/).
- **Patatap** — Keyboard-to-visual/audio mapping inspired by [Patatap](https://patatap.com/) by [Jono Brandel](https://jonobr1.com/) and [Lullatone](https://lullatone.com/).

---

## File Location

- **Source:** `index.html` (single-file p5.js demo, no build step)
- **Demo path:** `/Users/djm/claude-projects/creative-demos/percussive-archaeology/`
