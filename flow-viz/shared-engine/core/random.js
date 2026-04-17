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

  // Pick a mood: each mood dramatically changes the overall feel
  const moods = ['void', 'neon', 'warm', 'cold', 'pastel', 'monochrome', 'fire', 'ocean', 'acid'];
  const mood = rng.pick(moods);

  // Background: vary dramatically by mood
  const bgPresets = {
    void:       { s: rng.int(5, 15),  b: rng.int(2, 6) },
    neon:       { s: rng.int(20, 50), b: rng.int(3, 8) },
    warm:       { s: rng.int(30, 60), b: rng.int(5, 15) },
    cold:       { s: rng.int(20, 45), b: rng.int(4, 10) },
    pastel:     { s: rng.int(10, 25), b: rng.int(8, 20) },
    monochrome: { s: rng.int(0, 8),   b: rng.int(3, 12) },
    fire:       { s: rng.int(40, 70), b: rng.int(4, 12) },
    ocean:      { s: rng.int(30, 55), b: rng.int(5, 14) },
    acid:       { s: rng.int(30, 60), b: rng.int(3, 10) },
  };
  const bg = bgPresets[mood];
  config.colors.background.h = mood === 'fire' ? rng.int(0, 30)
    : mood === 'ocean' ? rng.int(180, 240)
    : mood === 'acid' ? rng.int(80, 150)
    : hueAnchor;
  config.colors.background.s = bg.s;
  config.colors.background.b = bg.b;

  // Palette: harmony scheme + mood-driven saturation/brightness ranges
  const schemes = ['analogous', 'complementary', 'triadic', 'split', 'wide'];
  const scheme = rng.pick(schemes);
  const spread = { analogous: 45, complementary: 180, triadic: 120, split: 150, wide: 360 }[scheme];

  const satRange = mood === 'pastel' ? [30, 55] : mood === 'neon' ? [80, 100]
    : mood === 'monochrome' ? [0, 15] : [50, 95];
  const briRange = mood === 'pastel' ? [75, 95] : mood === 'neon' ? [85, 100]
    : mood === 'void' ? [60, 85] : [60, 100];

  const categories = config.colors.categories;
  const catNames = Object.keys(categories);
  catNames.forEach((cat, i) => {
    const offset = (i * spread) / catNames.length + rng.range(-20, 20);
    const hue = mood === 'monochrome' ? hueAnchor + rng.range(-10, 10)
      : (hueAnchor + offset + 360) % 360;
    categories[cat].base = [
      (hue + 360) % 360,
      rng.int(satRange[0], satRange[1]),
      rng.int(briRange[0], briRange[1])
    ];
    categories[cat].accent = [
      (hue + rng.range(-25, 25) + 360) % 360,
      rng.int(Math.min(satRange[1], satRange[0] + 20), 100),
      rng.int(Math.min(briRange[1], briRange[0] + 15), 100),
    ];
  });

  // Flow dynamics: wider ranges for more variety
  config.particles.flow.noiseScale = rng.range(0.0005, 0.012);
  config.particles.flow.speed = rng.range(0.2, 2.0);
  config.particles.flow.attractionStrength = rng.range(0.05, 0.7);
  config.particles.flow.damping = rng.range(0.92, 0.995);
  config.particles.flow.noiseOctaves = rng.int(2, 8);

  // Particle count: varies the density dramatically
  config.particles.count = rng.int(400, 3000);

  // Particle size: from tiny dots to fat blobs
  const sizeMin = rng.int(1, 4);
  config.particles.size.min = sizeMin;
  config.particles.size.max = sizeMin + rng.int(1, 8);
  config.particles.visual.opacity = rng.range(0.1, 0.6);

  // Blend mode: occasionally use additive for glow effect
  config.particles.visual.blendMode = rng.chance(0.3) ? 'add' : 'normal';

  // Trails: the biggest visual lever
  config.trails.enabled = !rng.chance(0.05); // 5% chance of no trails at all
  config.trails.fadeRate = rng.int(1, 20);
  config.trails.opacity = rng.int(3, 40);
  config.trails.particleSizeMultiplier = rng.range(0.2, 1.2);

  // Markets: size and glow variation
  config.markets.visual.pulseSpeed = rng.range(0.005, 0.08);
  config.markets.visual.glowLayers = rng.int(1, 8);
  config.markets.visual.glowSpread = rng.int(5, 60);
  config.markets.size.minRadius = rng.int(25, 60);
  config.markets.size.maxRadius = rng.int(100, 300);

  // Connections: sometimes off, sometimes thick
  config.connections.enabled = !rng.chance(0.2); // 20% chance off
  config.connections.visual.strokeWeight = rng.range(0.3, 4);
  config.connections.visual.maxAlpha = rng.int(8, 80);

  // Placement spacing
  config.markets.placement.minDistance = rng.int(40, 200);

  config._variation = { seed: rng.seed, hueAnchor, scheme, mood };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mulberry32, makeRng, applyAestheticVariation };
}
