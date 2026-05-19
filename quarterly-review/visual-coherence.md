# Pass 1: Visual Coherence Audit ("The Abloh Pass")

**Date**: 2026-05-18
**Auditor**: Claude Code quarterly review

---

## Executive Summary

The site has **significant design token drift**. A CSS variable system exists in `globals.css` but is almost entirely unused by components. Border-radius tokens have zero adoption. Hardcoded colors appear in 20+ files. Texture classes are partially applied. The site doesn't feel like one system -- it feels like one system's intention layered over ad-hoc Tailwind.

**Abloh 3% verdict**: Drift exceeds 3%. This needs correction before the next deliberate mutation.

---

## 1. Border-Radius Drift

### Severity: CRITICAL

**139 total border-radius instances across the codebase.**
**0 instances use the CSS token system.**

Token definitions in `globals.css`:
- `--radius-sm: 2px` -- UNUSED
- `--radius-md: 4px` -- UNUSED
- `--radius-lg: 6px` -- UNUSED
- `--radius-xl: 8px` -- UNUSED

Actual usage (Tailwind defaults, which DON'T align):

| Tailwind Class | Count | Computed Value | Token Equivalent |
|---------------|-------|----------------|-----------------|
| `rounded-full` | 31 | 9999px | None (pills/dots -- intentional) |
| `rounded-xl` | 18 | 12px | Exceeds `--radius-xl` (8px) |
| `rounded-lg` | 17 | 8px | Should be `--radius-xl` |
| `rounded-md` | 10 | 6px | Should be `--radius-lg` |
| `rounded-2xl` | 1 | 16px | WAY over any token |

Worst offenders:
- `home-client.tsx` -- 11 instances, mixes `rounded-full`, `rounded-lg`, `rounded-xl`, `rounded-md`
- `products/[slug]/page.tsx` -- 6 instances
- `projects/[slug]/project-detail.tsx` -- 6 instances
- `footer.tsx` -- uses `rounded-xl` (Tailwind 12px) when `--radius-xl` is 8px

**Inline hardcoded border-radius**:
- `performance-preload.tsx`: `border-radius: 9999px` (x6 -- acceptable for critical preload)
- `kinetic-pretext.tsx`: `border-radius: 50%`

### Fix Required

Either:
1. **Align Tailwind config** to match CSS tokens (override `borderRadius` in `tailwind.config.ts`), OR
2. **Replace all Tailwind rounded-* classes** with inline `style={{ borderRadius: 'var(--radius-*)' }}`

Option 1 is cleaner. Extend Tailwind theme:
```js
borderRadius: {
  sm: 'var(--radius-sm)',    // 2px
  md: 'var(--radius-md)',    // 4px
  lg: 'var(--radius-lg)',    // 6px
  xl: 'var(--radius-xl)',    // 8px
  full: '9999px',            // pills/dots -- keep
  none: '0',
}
```

---

## 2. Hardcoded Colors

### Severity: HIGH

**20+ files contain hardcoded hex/rgba values outside globals.css.**

### Categories

**A. Functional canvas colors (acceptable)**
- `attractor-playground.tsx`: Attractor palette (`#22d3ee`, `#a78bfa`, `#34d399`, `#f472b6`)
- `ascii-art-generator.tsx`: User-selectable color palette
- `generative-hero-bg.tsx`: Canvas rendering colors
- `performance-preload.tsx`: Critical path preload (must be hardcoded for speed)

**B. Theme colors that SHOULD be tokens (fix these)**

| Pattern | Files | Current | Should Be |
|---------|-------|---------|-----------|
| `rgba(0,0,0,0.4-0.85)` | 5+ files | Hardcoded overlay | New `--overlay-*` tokens |
| `rgba(255,255,255,0.03-0.1)` | 5+ files | Subtle white | New `--white-*` opacity tokens |
| `rgba(52,211,153,0.06-0.4)` | 4 files | Green variants | `--green` with opacity tokens |
| `rgba(129,140,248,0.08-0.25)` | 4 files | Accent variants | `--accent` with opacity tokens |
| `rgba(17,17,19,0.7-0.92)` | nav.tsx | Nav background | `--bg-surface` with opacity |
| `#EF4444` / red rgba | knowledge-client.tsx | YouTube red | New `--red` token |
| `#FBBF24` / amber rgba | knowledge-client.tsx | Amber | `--amber` token exists but not used |
| `#ffffff` | excalidraw-diagrams.tsx | White bg | Functional, but needs `--surface-light` |

### Missing Tokens to Add

```css
/* Overlay system */
--overlay-light: rgba(0,0,0,0.4);
--overlay-medium: rgba(0,0,0,0.65);
--overlay-heavy: rgba(0,0,0,0.85);

/* Opacity variants */
--accent-subtle: rgba(129,140,248,0.08);
--green-subtle: rgba(52,211,153,0.06);
--green-muted: rgba(52,211,153,0.15);

/* Utility */
--red: #EF4444;
--red-muted: rgba(239,68,68,0.12);
--dot-subtle: rgba(255,255,255,0.1);
--grid-line: rgba(255,255,255,0.03);
```

---

## 3. Texture Class Usage

### Severity: MEDIUM

Texture classes exist and are partially applied. Coverage:

| Class | Applied To | Status |
|-------|-----------|--------|
| `texture-scanlines` | Hero section, Footer | Correct |
| `texture-grain` | Hero section | Correct |
| `texture-dots` | GlowingCard | Correct |
| `tui-border` | Field notes cards (lab + field-notes pages) | Correct |
| `cursor-blink` | Nav logo | Correct |
| `prompt` | **NOWHERE** | Defined but unused |

### Missing Applications (Phase 3 plan items still pending)

- Blog post cards -- no texture (should have `texture-dots` or `texture-scanlines`)
- Section headers -- no prompt-style treatment
- Blog data viz -- no TUI treatment applied yet
- Code blocks in blog posts -- no terminal texture

---

## 4. Standalone App Design Isolation

### Severity: LOW (intentional, but needs documentation)

| App | Aesthetic | Font | Accent | Background |
|-----|----------|------|--------|------------|
| Pen Plotter | Warm paper | Boska serif | Sodium-vapor amber | `#f3eddd` |
| Tartanism | Warm paper | Boska serif | Woad blue `#2d4a7a` | `#f3eddd` |
| Total Serialism | Warm paper | Boska serif | Malachite green `#1a6847` | `#f3eddd` |
| Flow Viz | Dark tech | Courier mono | Cyan | `#0a0a0f` |
| **Main site** | Dark lab | Geist Sans/Mono | Indigo `--accent` | `#09090b` |

This is intentional -- field notes have their own editorial identity. But the **transition** between main site and standalone apps needs labeling. Currently the field-notes page says "These open in a standalone design system" which is good.

Flow-viz is the odd one out -- dark like the main site but completely different design tokens. Consider aligning it closer to main site tokens OR giving it the warm paper treatment.

---

## Fix Priority

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Align Tailwind borderRadius to CSS tokens | 30min | HIGH -- fixes 139 instances in one config change |
| 2 | Extract hardcoded rgba to CSS tokens | 1hr | HIGH -- 20+ files become theme-consistent |
| 3 | Apply remaining Phase 3 texture treatments | 45min | MEDIUM -- completes the Nous aesthetic |
| 4 | Wire up `prompt` class on section headers | 15min | LOW -- finishing touch |
| 5 | Document standalone app design divergence | 15min | LOW -- already partially done |
