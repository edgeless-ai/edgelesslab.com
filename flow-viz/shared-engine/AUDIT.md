# edgelesslab.com audit — 2026-04-16

Two halves: flow-viz (fixed in this commit) and the wider Next.js site (findings only).

---

## Part 1 — flow-viz: what was broken

### 1.1 Why page refresh never varied the look

Every demo hard-coded a single seed in `setup()`:

```js
// demos/{polymarket,github,bitcoin-mempool}/index.html
randomSeed(42); noiseSeed(42);
CONFIG.engine.seed = 42;
```

That locked p5's RNG to seed `42` on every load, so colour, placement, and
particle lifetimes were identical each refresh.

### 1.2 The aesthetic randomizer only ran on `r`, not on page load

`orchestrator.regenerate()` was the only code path that randomised palette,
flow, trails, glow, and connection alpha. `loadConfig()` used the hand-crafted
defaults verbatim — so even without the demo-level seed hard-coding, a refresh
would have re-used the same palette.

### 1.3 The regeneration itself wasn't actually seeded

`regenerate()` called `randomSeed(seed)` / `noiseSeed(seed)` *and then*
used raw `Math.random()` for every aesthetic choice. Since `Math.random()`
is not affected by `randomSeed()`, `?seed=X` did not produce reproducible
output. Same on `r`-press — the seed was reported in the filename but
didn't drive the visuals.

### 1.4 `fluid-engine.regenerate()` called a method that didn't exist

```js
regenerate() {
  this.particles = [];
  this.spawnParticles();   // <-- throws: no such method
  ...
}
```

The throw was masked because the follow-up `updateMarkets()` re-initialised
particles via `initParticles()` anyway, but it would have logged a runtime
error on every `r` press.

### 1.5 `orchestrator.setup()` discarded the result of `loadConfig()`

```js
this.loadConfig(overrides);   // not assigned
```

So URL-param overrides (`?seed=`, `?source=`) were computed and thrown away.
`initialize()` later called `loadConfig({})` and re-derived config from
scratch — a second call to `loadConfig` whose env-var reading happened to
catch `?seed=` again, which is why it was mostly invisible.

### 1.6 `JSON.parse(JSON.stringify(CONFIG))` stripped helper functions

`config.loadEnvironment()`, `config.validate()`, and `config.merge()`
survived only because they were being called on the singleton `CONFIG`
object, not the cloned one. After the clone, `config.loadEnvironment is
not a function` would fire on the next call path that used the clone
(this is the root cause of commit `083d1bda9` "flow-viz bitcoin mempool
crash (config.loadEnvironment not a function)"). The fix was to re-attach
the three helpers on the clone.

### 1.7 Engine used raw `Math.random()` everywhere

Market placement, particle spawn position / life / decay / size / hue,
and target-switching all used `Math.random()`, bypassing p5's seeded
`random()`. So even if you fixed every other bug, `?seed=X` still
wouldn't have been reproducible.

---

## Part 2 — flow-viz fixes in this commit

- **New `shared-engine/core/random.js`** — `mulberry32` seeded RNG
  + `makeRng(seed)` surface (`rng()`, `rng.range`, `rng.int`, `rng.pick`)
  + `applyAestheticVariation(config, rng)` — one canonical randomiser,
  called at init **and** on `r`. Adds five colour-harmony schemes
  (analogous / complementary / triadic / split / wide) so palettes feel
  composed, not stochastic-noise.
- **Orchestrator**:
  - `setup()` now assigns `this.config`, so URL overrides survive.
  - `initialize()` no longer re-loads config when setup already did.
  - `loadConfig()` re-attaches `validate` / `merge` / `loadEnvironment`
    after the JSON clone.
  - `loadConfig()` calls `applyAestheticVariation` with the resolved
    seed — page refresh actually varies now.
  - `regenerate()` reuses the same `applyAestheticVariation` function;
    no more duplicated inline logic.
  - `?preset=default` opts out of randomisation (keeps hand-crafted
    palette for anyone who wants it).
- **Fluid engine**:
  - `regenerate()` stops calling the nonexistent `spawnParticles()`.
  - Placement (poisson-disk + random), particle spawn, market pulse
    phase, and target re-selection all use p5's seeded `random()` with
    a `Math.random` fallback for headless paths.
- **Demos (polymarket, github, bitcoin-mempool, prototype-multi-source)**:
  - Removed `randomSeed(42); noiseSeed(42); CONFIG.engine.seed = 42;`.
  - Added `<script src="../../shared-engine/core/random.js">`.

### Contract after the fix

- Plain refresh → fresh random seed → different palette + flow + trails
  every time.
- `?seed=123` → identical output every time (placement, colours,
  particles).
- `?preset=default` → original hand-crafted palette.
- Pressing `r` → new seed, new aesthetic, and the filename of a saved
  PNG records it (`polymarket-flow-viz-${seed}.png`).

### Verification

`node` smoke test on the randomiser (seed→values snapshot):

```
seed=1   bgHue=225  speed=0.802  fadeRate=11  scheme=wide
seed=2   bgHue=264  speed=1.380  fadeRate=10  scheme=triadic
seed=42  bgHue=216  speed=1.093  fadeRate=3   scheme=split
seed=42  bgHue=216  speed=1.093  fadeRate=3   scheme=split   # reproducible
seed=999 bgHue=349  speed=1.152  fadeRate=10  scheme=split
```

Visuals need a browser to confirm — I couldn't run the WebGL/p5 canvas
headlessly here.

---

## Part 3 — wider site findings (not fixed yet)

From an Explore agent sweeping `src/`, `scripts/`, and repo hygiene.

### Critical

| # | File:line | Issue | Fix |
|---|---|---|---|
| 1 | `src/app/products/[slug]/page.tsx:314-319` | `inlineFormat()` interpolates captured markdown groups into HTML without escaping — `**<img onerror=…>**` executes. | HTML-escape `$1`/`$2` before inserting. |
| 2 | `src/app/products/[slug]/page.tsx:318` | URL from `[text](url)` is placed into `href` without scheme validation — `javascript:` and `data:` URLs pass through. | Reject any href that isn't `http(s):` or relative. |

### High

| # | File:line | Issue | Fix |
|---|---|---|---|
| 3 | `src/components/posthog-provider.tsx:27-31` | Module-scoped `initialized` flag races across provider instances under StrictMode / double-mount. | `useRef` for the guard, or init in a module-scoped IIFE. |
| 4 | `src/components/blog-article.tsx:65,75` | `dangerouslySetInnerHTML` on blog content with no sanitizer. Safe only while `src/lib/blog.ts` stays trusted static data — becomes a live XSS channel the moment anything external feeds it. | Document the invariant inline, or run through DOMPurify. |
| 5 | `src/lib/knowledge-data.ts` | Uses `window.*` without a `"use client"` directive; an accidental server import will crash the build. | Add the directive or move window-touching code behind a guard. |

### Medium

| # | Issue | Fix |
|---|---|---|
| 6 | `out/` (421 MB) and `_next/` committed despite being in `.gitignore`. Suggests a non-standard deploy that bypasses `.gitignore` at commit time. | `git rm -r --cached out _next`, verify CI workflow. |
| 7 | `favicon.ico?favicon.0x3dzn~oxb6tn.ico` — literal query-string in a filename, 26 KB duplicate. | Delete the file. |
| 8 | `layout.tsx:76` CSP has `'unsafe-eval'` and `'unsafe-inline'` — defeats most of CSP's XSS value. | Move to nonce-based CSP; confirm PostHog doesn't need `eval`. |
| 9 | `scripts/preserve-standalone.sh` swallows rsync failures. | `set -euo pipefail` + explicit checks. |

### Low / nits

| # | Issue |
|---|---|
| 10 | `<img>` on product covers has no `alt` even though the eslint rule is disabled for them. |
| 11 | Mobile nav in `nav.tsx` doesn't trap focus when open. |
| 12 | `playwright` is a prod dependency but is never imported — move to `devDependencies` or drop. |
| 13 | `use-pretext.ts` disables `exhaustive-deps` with an explanatory comment but the dep array could just be `[]`. |
| 14 | `sitemap.ts` sets `lastModified: new Date()` on static pages — every build bumps it. Use a fixed date. |
| 15 | Footer external links inconsistent vs `nav.tsx` for `aria-label` / sr-only. |
| 16 | Ad-hoc `text-[13px]` in `nav.tsx` breaks design-token consistency. |
| 17 | `next-env.d.ts` is checked in — Next.js recommends gitignoring it. |

### Other repo hygiene

- Root-level scaffold files (`__next.__PAGE__.txt`, `__next._full.txt`,
  `__next._head.txt`, `__next._index.txt`, `__next._tree.txt`,
  `next-env.d.ts`, `index.html`, `app/favicon.ico.bak`) look accidental.
- Duplicate `favicon.ico` / `apple-touch-icon.png` / `og-image.png`
  between repo root and `public/`.
- `feed.xml`, `sitemap.xml`, `robots.txt` exist both as committed
  static files **and** as `src/app/*.ts` generators — they'll drift.

### Recommended follow-ups

1. Fix the two critical XSS holes (`products/[slug]/page.tsx`) — same
   commit, small diff.
2. Stop committing `out/` and `_next/`; either GitHub Pages deploys from
   a branch or your deploy should build in CI.
3. Replace `'unsafe-inline'` / `'unsafe-eval'` in CSP with nonces.
4. Decide whether `sitemap.xml` / `feed.xml` / `robots.txt` are
   generated or authored, delete the other.
