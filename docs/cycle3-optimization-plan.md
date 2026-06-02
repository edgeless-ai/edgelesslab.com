# Cycle 3: P0/P1 Optimization Implementation Plan
**Date**: 2026-06-02
**Goal**: Reduce JS bundle size by ~60% and improve FCP/LCP by ~200ms

---

## Current State (After Cycle 2 Audit Verification)

### What's Already Fixed Since Audit
| Item | Status | Evidence |
|------|--------|----------|
| framer-motion usage | ✅ Dead dep | In package.json but ZERO imports in source |
| PostHog lazy init | ✅ Already deferred | On first user interaction (pointerdown/keydown) |
| ScrollReveal framer dep | ✅ None | Uses CSS transitions + useInView hook (27 lines) |
| Hero keyframes | ✅ Already in critical CSS | Inline style block, no JS |
| AnimatedText | ✅ No framer dep | Pure CSS animation via inline keyframes |
| Inline critical CSS | ✅ Working | PerformancePreload component |
| OG image preload | ✅ Working | fetchPriority=high |

### What Needs Fixing

#### P0: Critical Bundle Size Reduction

**P0-1: Remove framer-motion from package.json** (~350KB claimed)
- `framer-motion` is listed in deps but zero files import it
- Run `npm uninstall framer-motion` to verify tree-shaking
- Risk: None — verified via grep across all source files

**P0-2: Dynamic import GenerativeHeroBackground** (~120KB estimated)
- Currently imported statically in home-client.tsx (line 9)
- Runs canvas particle simulation immediately on page load
- Fix: Use `next/dynamic` with `ssr: false`
- Effect: Detaches ~8KB of critical-path JS, defers ~338 lines of canvas code to post-LCP

**P0-3: Dynamic import GenerativeAscii** (~80KB estimated)
- Same pattern as hero background — eagerly loaded canvas code
- Fix: Dynamic import in HeroSection
- Effect: Another ~80KB deferred from critical bundle

**P0-4: Dynamic import KineticPreText** (~200KB via @chenglou/pretext)
- Already has a static `fallback` prop (renders `<p>` tag)
- But the dynamic import of `@chenglou/pretext` happens in use-pretext hook
- The component itself is still in the initial bundle
- Fix: `next/dynamic` wrapper component

**P0-5: Defer PreTextOrbs / PreTextRichFlow** (below-fold components)
- Used in StackFlow section, which is already wrapped in ScrollReveal
- But the component code is in the initial client bundle
- Fix: Lazy-load the entire StackFlow section with `next/dynamic`

#### P1: Remaining Optimizations

**P1-1: Self-host Geist fonts** (eliminate Google Fonts connection)
- Currently served via `next/font/google` → 2 external woff2 requests
- Download woff2 files to `public/fonts/`, serve locally
- Eliminates 2 external HTTP connections and DNS lookups

**P1-2: Reduce lucide-react footprint** (replace with inline SVGs)
- Only two icons used: ArrowRight, ArrowUpRight
- Tree-shaking should handle this, but confirm with bundle analyzer
- Alternative: Inline the two SVGs directly

**P1-3: Configure Next.js chunk grouping**
- Current: 10+ separate JS chunks loaded on page
- Fix: Add `experimental.turbopack.codeSplitting` config
- Group vendor (react, next) and app chunks

#### P2: Strategic Content Improvements

**P2-1: Replace hero text animation with visual content**
- Current: All text, no images on homepage
- Add a subtle project/product screenshot or generative art still
- Would improve LCP opportunities and visual engagement

---

## Implementation Code Patches

### Patch 1: Dynamic import GenerativeHeroBackground

In `src/components/home-client.tsx`:
```tsx
// Remove static import:
import { GenerativeHeroBackground } from "@/components/ui/generative-hero-bg";

// Add dynamic import at top (with rest of imports):
import dynamic from "next/dynamic";
const GenerativeHeroBackground = dynamic(
  () => import("@/components/ui/generative-hero-bg").then((m) => ({ default: m.GenerativeHeroBackground })),
  { ssr: false }
);
```

### Patch 2: Dynamic import KineticPreText and Ascii

```tsx
const KineticPreText = dynamic(
  () => import("@/components/ui/kinetic-pretext").then((m) => ({ default: m.KineticPreText })),
  { ssr: false }
);

const GenerativeAscii = dynamic(
  () => import("@/components/generative-ascii").then((m) => ({ default: m.GenerativeAscii })),
  { ssr: false }
);
```

### Patch 3: Dynamic import entire StackFlow section

In `src/app/page.tsx`:
```tsx
const StackFlow = dynamic(
  () => import("@/components/home-client").then((m) => ({ default: m.StackFlow })),
  { ssr: false }
);
```

### Patch 4: Remove framer-motion

```bash
npm uninstall framer-motion
# Verify with: grep -r "framer-motion" src/ -- should return nothing
```

### Patch 5: Self-host fonts

```tsx
// In layout.tsx, replace:
import { Geist, Geist_Mono } from "next/font/google";
// With local version:
import localFont from "next/font/local";
const geistSans = localFont({
  src: "../public/fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
});
```

---

## Measurable Targets

| Metric | Before (Cycle 2) | After (Cycle 3 Target) |
|--------|-------------------|----------------------|
| FCP | 1188ms | <900ms |
| Total JS | 397KB (18 scripts) | <200KB (6-8 scripts) |
| Total Transfer | 648KB | <400KB |
| HTML Size | 91KB | <80KB |
| Lighthouse Perf | ~75 (est.) | >90 |

---

## Notes for Implementation

1. **SSH access still blocked** — patches above prepared for `git commit` + push via HTTPS when credentials are available
2. **GenerativeAscii has zero callbacks** — splitting just the dynamic import is safe, components with canvas effects don't require auth or external API
3. **No NPM install needed** — dynamic imports reduce critical path size without changing dependencies
4. **KineticPreText fallback is already a static `<p>`** — visual regressions on JS failure are already handled
5. **After implementing P0 items** — re-run the browser-based timing API to measure improvement
