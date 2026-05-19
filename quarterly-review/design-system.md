# Pass 3: Design System Integrity ("The FISK Pass")

**Date**: 2026-05-18
**Auditor**: Claude Code quarterly review

---

## Executive Summary

The token system is **partially adopted**. Color tokens have strong coverage. Border-radius tokens are defined but disconnected from Tailwind (no theme config). Typography has no token scale -- 86 instances of arbitrary `text-[Npx]` values. Spacing uses Tailwind defaults consistently but without custom tokens. The system works in practice but can't be described as a "system" -- it's conventions enforced by habit, not by tooling.

**FISK grid discipline verdict**: Colors snap to the grid. Typography and radii don't.

---

## Token Inventory (globals.css)

### Colors (17 tokens) -- WELL ADOPTED
- `--bg-base`, `--bg-surface`, `--bg-surface-hover`, `--bg-elevated`, `--bg-raised`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--border-subtle`, `--border-focus`
- `--accent`, `--accent-hover`, `--accent-muted`
- `--green`, `--green-muted`
- `--phosphor`, `--amber`

### Radii (4 tokens) -- DEFINED BUT UNUSED BY TAILWIND
- `--radius-sm: 2px`, `--radius-md: 4px`, `--radius-lg: 6px`, `--radius-xl: 8px`
- No Tailwind theme extension -- `rounded-xl` (Tailwind) = 12px, `--radius-xl` = 8px

### Effects (6 tokens) -- PARTIALLY USED
- `--dot-size`, `--dot-gap`, `--scanline-opacity`
- `--ease-out`, `--ease-in-out`
- `--duration-fast`, `--duration-normal`, `--duration-slow`

### Typography -- NO TOKENS
No font-size, font-weight, or line-height tokens defined.

### Spacing -- NO TOKENS
No custom spacing scale. Uses Tailwind's default 4px grid (gap-1=4px, gap-2=8px, etc.)

---

## Findings

### 1. Typography Scale is Ad-Hoc

**86 instances of `text-[Npx]` arbitrary Tailwind values across the codebase.**

Sizes found: 10px, 11px, 12px, 13px, 14px, 15px, 32px -- used interchangeably for badges, labels, metadata, form inputs.

No two components agree on what size a "label" should be.

**Fix**: Define a type scale in globals.css and wire into Tailwind @theme:
```css
--text-label: 10px;    /* badges, meta, timestamps */
--text-caption: 12px;  /* secondary info */
--text-body-sm: 14px;  /* compact body text */
```

### 2. Tailwind Config Doesn't Extend Theme

No `tailwind.config.ts` file exists. The project uses Tailwind v4 with `@tailwindcss/postcss` and `@theme inline` in globals.css. But the @theme block doesn't map CSS variables to Tailwind's scale for border-radius or typography.

**Fix**: Add to the @theme inline block in globals.css:
```css
@theme inline {
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
}
```

### 3. Component API Patterns

**Cards**: Consistent. All card components use `var(--bg-surface)` background, `var(--border-subtle)` border, `p-5` or `p-6` padding. GlowingCard is the shared abstraction.

**Section headers**: Consistent at page level (`text-5xl sm:text-6xl`) but inconsistent for sub-section headers.

**Buttons/CTAs**: No shared component. Each page builds its own button styles inline. Common pattern: `rounded-full px-4 py-2 text-sm font-medium` but with varying colors.

### 4. Hardcoded White Opacity

47 instances of `white` in Tailwind classes:
- `hover:text-white` (31x)
- `border-white/[0.16]`, `border-white/20`, `border-white/30` (12x)
- `bg-white/5`, `bg-white/10` (7x)

These bypass the token system. `hover:text-white` should be `hover:text-[var(--text-primary)]`. Border/bg white opacity variants should be CSS tokens.

### 5. Dark Mode Only -- Clean

Zero references to `prefers-color-scheme: light`, `bg-white`, `text-black`, or `bg-gray-*`. The site declares `color-scheme: dark only` in globals.css. No light mode leaks.

### 6. Responsive -- Not Audited Visually

Would need browser screenshots at 375px, 768px, 1280px. Tailwind responsive prefixes (`sm:`, `lg:`) are used consistently. No obvious breakpoint issues in code, but visual verification needed.

---

## Gap Analysis

| Area | Has Tokens? | Used Consistently? | Fix Priority |
|------|------------|--------------------|----|
| Colors | Yes (17) | Yes | -- |
| Border-radius | Yes (4) | **No** (0 adoption) | HIGH |
| Typography | **No** | **No** (86 arbitrary values) | HIGH |
| Spacing | **No** | Yes (Tailwind defaults) | LOW |
| Effects/animation | Yes (6) | Partially | LOW |
| Overlays/opacity | **No** | **No** (hardcoded rgba) | MEDIUM |
