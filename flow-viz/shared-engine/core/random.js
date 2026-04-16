/**
 * Seeded RNG + aesthetic variation
 *
 * A single seed fully determines every random decision: palette, flow,
 * trails, markets, particle colors and placement. Omit the seed → fresh
 * variation on every page load. Pass ?seed=123 → reproducible output.
 */

// mulberry32: small, fast, well-distributed 32-bit PRNG.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tiny RNG surface that covers every call site in the engine.
function makeRng(seed) {
  const r = mulberry32(seed);
  const rng = () => r();
  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.seed = seed;
  return rng;
}

/**
 * Mutates `config` in place: picks a fresh palette, flow feel, trails, and
 * market/particle aesthetics. Every value is drawn from `rng`, so the same
 * seed produces the same look.
 */
function applyAestheticVariation(config, rng) {
  const hueAnchor = rng.int(0, 360);

  // Background: dark, lightly tinted toward the anchor hue.
  config.colors.background.h = hueAnchor;
  config.colors.background.s = rng.int(10, 40);
  config.colors.background.b = rng.int(3, 12);

  // Palette spread: pick a harmony scheme so categories feel related,
  // not like a random swatch dump.
  const schemes = ['analogous', 'complementary', 'triadic', 'split', 'wide'];
  const scheme = rng.pick(schemes);
  const spread = {
    analogous: 50,
    complementary: 180,
    triadic: 120,
    split: 150,
    wide: 360,
  }[scheme];

  const categories = config.colors.categories;
  const catNames = Object.keys(categories);
  catNames.forEach((cat, i) => {
    const offset = (i * spread) / catNames.length + rng.range(-12, 12);
    const hue = (hueAnchor + offset + 360) % 360;
    categories[cat].base = [hue, rng.int(55, 90), rng.int(65, 92)];
    categories[cat].accent = [
      (hue + rng.range(-18, 18) + 360) % 360,
      rng.int(75, 100),
      rng.int(82, 100),
    ];
  });

  // Flow dynamics — the big knob for "how does it feel?"
  config.particles.flow.noiseScale = rng.range(0.0012, 0.0075);
  config.particles.flow.speed = rng.range(0.4, 1.4);
  config.particles.flow.attractionStrength = rng.range(0.12, 0.55);
  config.particles.flow.damping = rng.range(0.945, 0.992);

  // Particle look
  const sizeMin = rng.int(1, 3);
  config.particles.size.min = sizeMin;
  config.particles.size.max = sizeMin + rng.int(1, 5);
  config.particles.visual.opacity = rng.range(0.18, 0.5);

  // Trails (dominate the image character)
  config.trails.fadeRate = rng.int(2, 12);
  config.trails.opacity = rng.int(6, 28);
  config.trails.particleSizeMultiplier = rng.range(0.35, 0.9);

  // Markets
  config.markets.visual.pulseSpeed = rng.range(0.01, 0.05);
  config.markets.visual.glowLayers = rng.int(2, 6);
  config.markets.visual.glowSpread = rng.int(10, 40);

  // Connections
  config.connections.visual.strokeWeight = rng.range(0.5, 3);
  config.connections.visual.maxAlpha = rng.int(15, 60);

  // Placement spacing
  config.markets.placement.minDistance = rng.int(70, 170);

  // Record what we chose, for debug overlays and saved filenames.
  config._variation = { seed: rng.seed, hueAnchor, scheme };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, makeRng, applyAestheticVariation };
}
