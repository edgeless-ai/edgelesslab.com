# Bespoke Emotion Ledger

A self-contained, interactive p5.js demo that fuses **Dear Data**'s hand-drawn bespoke visual encoding with **The Evolution of Trust**'s emotional state-machine game theory.

## What It Is

Five characters play a repeated Prisoner's Dilemma on a warm cream canvas. Each character has a distinct strategy:

- **Copycat** — cooperates first, then mirrors the opponent's last move
- **Cheater** — always cheats
- **Cooperator** — always cooperates
- **Grudge** — cooperates until cheated once, then always cheats
- **Detective** — cheats first (to test), then copies the opponent's last move

After every round, each character's emotional state updates (`happy`, `angry`, `neutral`, `grateful`) based on the outcome. Their trust score (0–10) also shifts.

## The Visual Encoding System (Dear Data × Nicky Case)

The demo refuses to commit to a single visual language. After every round, the encoding mode cycles:

1. **Line density** → trust level (more lines = more trust)
2. **Dot scatter** → memory length (more dots = longer memory)
3. **Concentric circles** → anger level (more rings = more anger)
4. **Spiral tightness** → happiness (tighter spiral = happier)

The legend at the bottom updates every round, forcing the viewer to re-learn the visual language each time — exactly as Dear Data forces you to learn a new legend for every postcard.

## The 3% Weirdness

### 1. Wobbly Hand (1%)
Every geometric primitive is drawn with a custom `wobblyLine()` and `wobblyCircle()` function. Each straight line is subdivided into 10 segments and every vertex is displaced by Perlin noise (`noise(i * 0.5, frameCount * 0.01) * 3`). Every circle is drawn with 0.2-radian steps, each vertex displaced by `noise(a, frameCount * 0.01) * 2`. The stroke weight varies (`random(1.5, 2.5)`) to simulate pen pressure. Nothing is ever perfectly straight or round.

### 2. Legend Amnesia (1%)
The encoding mode cycles every round: `line density → dot scatter → concentric circles → spiral tightness → line density`. There is no persistent key. The simulation treats every round as a new Dear Data postcard with its own bespoke legend.

### 3. Ghost Participant (1%)
Every 10 rounds, a 6th entity appears. It is drawn in `#E8DCC4` at 10% opacity — so faint it is almost invisible against the warm cream background. It has no name, no strategy, no score. It simply mimics the mouse cursor. After 5 seconds (150 frames), it vanishes. In the round immediately following its disappearance, all five real characters experience "confusion": their emotional states and trust scores are randomized because they are "confused" by the ghost's absence.

## How to Run

No build step, no dependencies, no server required.

1. **Double-click** `index.html` to open it in any modern browser.
2. Or serve it locally:
   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

The demo is a single HTML file that loads p5.js 1.9.0 from a CDN. It works entirely client-side.

## Interactions

| Interaction | Behavior |
|-------------|----------|
| **Mouse click** | Manually advances one round, recomputes strategies, updates emotions, and switches the visual encoding mode. |
| **Auto-play** | Every 2 seconds (60 frames at 30fps), a new round plays automatically. |
| **Mouse move** | The ghost participant, when active, lerps toward the mouse cursor at 10% per frame. |
| **Idle** | The simulation continues auto-playing. The wobbly lines and circles slowly drift due to the `frameCount` term in the noise seed. |

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Postcard background | `#F5F5F0` | Dear Data warm cream canvas |
| Ink black | `#1A1A1A` | Dear Data pen ink; primary text |
| Pencil gray | `#8B7355` | Dear Data pencil underdrawing; connections |
| Warm tan | `#C2B280` | Dear Data envelope; legend panel |
| Coral emotion | `#FF6B6B` | Nicky Case playful red; angry / cheat |
| Teal emotion | `#4ECDC4` | Nicky Case playful teal; happy / cooperate |
| Gold emotion | `#FFD93D` | Nicky Case playful yellow; neutral / unsure |
| Ghost invisible | `#E8DCC4` | Dear Data faint ghost; phantom at 10% opacity |
| Accent violet | `#9B59B6` | Nicky Case purple; special event / betrayal |

## Attribution

- **Dear Data** — Giorgia Lupi & Stefanie Posavec. The inspiration for bespoke hand-drawn visual encoding, wobbly pen lines, and round-by-round legend amnesia.
- **The Evolution of Trust** — Nicky Case. The inspiration for the emotional state machine, the Prisoner's Dilemma strategies, and the playful UI palette.

## Files

- `index.html` — the complete self-contained demo (HTML + CSS + JS inline)
- `README.md` — this file

## Notes

- The canvas is fixed at 900×700 pixels.
- `frameRate(30)` is set in `setup()`.
- The simulation runs for 50 rounds, then stops auto-advancing. Clicking still works until the max is reached.
- A screen-reader summary updates in the `<div aria-live="polite">` below the canvas every round.
