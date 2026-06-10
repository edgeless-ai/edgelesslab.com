# Synesthetic Weather Typewriter

A self-contained Three.js demo that fuses kinetic typography, generative audio, and agent-based segregation on a spherical surface.

## What it does

- **Typing** spawns 3D text sprites on a faceted sphere. Each letter is colored by its phonetic class (vowel, plosive, fricative, nasal, liquid, or other) and plays a pentatonic pitch spatialized to its longitude.
- **Wind field** is derived from the last 50 characters you typed. The ASCII value and sentence position determine a pseudo-random vector that advects letters across the sphere.
- **Schelling segregation** runs every 30 frames: each letter evaluates its 12 nearest neighbors. If the ratio of same-phonetic-class neighbors is below the **Social Bias** threshold, the letter glows red and drifts faster. If satisfied, it shrinks, glows white, and stops singing.
- **3% weirdness** (two layers):
  - *Visual*: 3% of the 5000 background stars are actually tiny 1px text sprites drifting away from the sphere, carrying fragments of your typed text into the void.
  - *Auditory*: Every 7th letter plays a faint minor-second dissonance alongside its pentatonic note, creating barely perceptible tension.

## Controls

| Input | Action |
|-------|--------|
| **Keyboard** | Type letters to spawn them on the sphere |
| **Mouse drag** | Orbit the camera |
| **Mouse wheel** | Zoom in/out (distance 50–500) |
| **Social Bias slider** | Adjust Schelling threshold (0–100%) |
| **Clear Wind** | Reset the sentence and wind field; existing letters drift freely |
| **Reseed** | Remove all letters and reset the sphere |

## Technique Notes

### Spherical Cube Geometry
Instead of a standard `SphereGeometry`, a `BoxGeometry(100,100,100, 32,32,32)` is used with all vertices normalized to radius 100. This creates a sphere with subtle, invisible faceting. The faceting causes letter trajectories to follow "great circle paths" with occasional kinks, giving motion a slightly non-Euclidean feel without being visible.

### Text Sprites
Letters are rendered as `THREE.Sprite` objects with `CanvasTexture` baked from an offscreen 2D canvas. No external font files are loaded. This is the standard lightweight approach for text in Three.js scenes.

### Wind Field
A 2D array (36 lat × 72 lon cells) stores vectors. Each character in the sentence contributes a deterministic angle and magnitude based on `angle = (charCode * 7.3 + index * 11.7) % 360`. A 3×3 smoothing pass is applied so the field feels organic rather than blocky.

### Geodesic Nearest-Neighbors
For the Schelling step, neighbors are sorted by geodesic distance using `acos(sinφ1·sinφ2 + cosφ1·cosφ2·cosΔλ)`. A simple O(n log n) sort is used per letter (fast enough for <1000 sprites). For larger populations, binning into the wind-field grid would be the next optimization.

### Trails
Each sprite maintains a rolling buffer of its last 20 positions. A `THREE.Line` with `BufferGeometry` is updated each frame. The line material’s opacity fades when the sprite settles.

### Audio
- **Timbre**: Soft sine wave with 10ms attack and exponential decay (150ms for normal notes, 400ms for settlement chimes).
- **Spatialization**: `PannerNode` with `panningModel = 'HRTF'`; azimuth is driven by the sprite’s longitude.
- **Reverb**: A simple feedback delay line (200ms, 30% feedback, low-pass filtered) is applied to settlement chimes.
- **Polyphony cap**: A hard limit of 8 concurrent tones prevents clipping; the oldest tone is stopped when the limit is exceeded.
- **Dissonance**: Every 7th letter adds a second oscillator at +1 semitone, delayed by 5ms and at 15% volume.

### Starfield Letter-Stars
150 of the 5000 starfield points are actually drifting letter-stars. They are initialized inactive and randomly activated every 10 frames (3% chance per star), taking the position of a random text sprite and then drifting outward radially. This is a visual trick rather than a full physics simulation.

## Running

No build step. Open `index.html` directly, or serve via a local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The demo loads Three.js r160 and OrbitControls from CDN via an ES module import map.

## Files

- `index.html` — self-contained HTML/CSS/JS demo
- `README.md` — this file

## Palette

| Role | Hex |
|------|-----|
| Vowel | `#F4A8B4` |
| Plosive | `#8EC5E4` |
| Fricative | `#A8E6CF` |
| Nasal | `#FCE38A` |
| Liquid | `#DDA0DD` |
| Other | `#FBC4AB` |
| Globe wireframe | `#1A1A2E` |
| Globe surface | `#0A0A14` |
| Dissatisfied glow | `#FF6B6B` |
| Satisfied bloom | `#FFFFFF` |
