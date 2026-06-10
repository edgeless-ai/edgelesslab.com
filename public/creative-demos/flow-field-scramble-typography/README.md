# Flow-Field Scramble Typography

A generative art demo that combines **flow-field particle tracing** with **text scramble glyph decay**. Particles spawn from letterforms, trace through a Perlin-noise flow field, and as they die, they trigger the resolution of scrambled text.

## Technique

- **Flow Field**: A 2D grid of angles driven by Perlin noise. Each cell stores a direction; particles follow it.
- **Glyph Masks**: `p5.Font.textToPoints()` generates a point cloud for each letter of the target word.
- **Text Scramble**: Each letter starts as a random glyph. When particles die, they accelerate the scramble resolution.
- **3% Weirdness**: The scramble glyphs themselves perturb the flow field angles, so the text literally dictates the wind.

## Interaction

- **Mouse Move**: Creates a local vortex that curves particles.
- **Click**: Resets the entire word to scramble state and reseeds the noise field.
- **Spacebar**: Toggles between "Paper" (cream background, charcoal strokes) and "Terminal" (dark background, phosphor green strokes) themes.

## Attribution

- Flow field technique: Tyler Hobbs (https://tylerxhobbs.com/essays/2020/flow-fields)
- Text scramble concept: Inspired by Soulwire / Justin Windle text scramble effects
- Built as part of the 8-hour creative pipeline | Phase 3 PRODUCE | 2026-06-10
