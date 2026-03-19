# Edgeless Lab - Website Design System

**Status:** Foundation v2.0 - "Mint Lab" palette (approved by David 2026-03-13)
**Date:** 2026-03-13
**Based on:** Design research report (`docs/edgeless-website-design-research.md`), color palette research (`edgeless-website/COLOR-PALETTE-RESEARCH.md`)
**Context:** Creative technology lab website. Light/neutral-first, clean typography, modern and fresh.

---

## 1. Color Tokens

### Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#F0F2F4` | Page background, cool neutral gray |
| `--bg-surface` | `#FAFBFC` | Cards, sections, elevated surfaces |
| `--bg-surface-hover` | `#F5F6F8` | Card hover states, active surfaces |
| `--bg-elevated` | `#FFFFFF` | Modals, dropdowns, floating elements |
| `--border-subtle` | `#E2E5E9` | Dividers, card borders |
| `--border-focus` | `#CBD0D6` | Focus rings, active borders |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#1A1E24` | Headings, body text |
| `--text-secondary` | `#6B7580` | Descriptions, captions, muted text |
| `--text-tertiary` | `#9CA3AD` | Placeholders, disabled text |

### Accent - Fresh Mint (Primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#0D9668` | CTAs, links, highlights, active states |
| `--accent-hover` | `#0BAD7A` | Hover state on accent elements |
| `--accent-muted` | `rgba(13, 150, 104, 0.10)` | Accent backgrounds, tags |
| `--accent-glow` | `rgba(13, 150, 104, 0.15)` | Subtle glow effects, 60px blur |

### Accent - Blue (Secondary / Interactive)

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-alt` | `#2563EB` | Interactive elements, links, secondary highlights |
| `--accent-alt-hover` | `#3B82F6` | Hover state |
| `--accent-alt-muted` | `rgba(37, 99, 235, 0.10)` | Alt accent backgrounds |

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#4ADE80` | Operational status, confirmations |
| `--warning` | `#FBBF24` | Alerts, caution states |
| `--error` | `#EF4444` | Errors, destructive actions |

### Gradient Presets

```css
/* Hero ambient glow */
--gradient-hero: radial-gradient(
  ellipse 80% 50% at 50% 0%,
  rgba(255, 107, 74, 0.12) 0%,
  rgba(124, 92, 252, 0.06) 50%,
  transparent 100%
);

/* Card hover glow */
--gradient-card-glow: radial-gradient(
  circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
  rgba(255, 107, 74, 0.08) 0%,
  transparent 60%
);

/* Footer fade */
--gradient-footer: linear-gradient(
  to bottom,
  #0A0A0B 0%,
  #000000 100%
);
```

---

## 2. Typography

### Font Stack

| Role | Font | Fallback | Weight Range |
|------|------|----------|-------------|
| **Display/Headings** | Geist Sans | system-ui, sans-serif | 600-800 |
| **Body** | Geist Sans | system-ui, sans-serif | 400-500 |
| **Code/Mono** | Geist Mono or JetBrains Mono | monospace | 400 |

**Note:** Geist is Vercel's open-source variable font, designed by Basement Studio. Free, high quality, great for dark UIs. If a more distinctive identity is desired later, commission a custom grotesque or evaluate Right Grotesk from Pangram Pangram.

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-hero` | `clamp(48px, 8vw, 120px)` | 700 | 0.95 | Hero headlines |
| `--text-display` | `clamp(36px, 5vw, 72px)` | 700 | 1.0 | Section titles |
| `--text-heading` | `clamp(24px, 3vw, 40px)` | 600 | 1.1 | Card titles, subsections |
| `--text-subheading` | `clamp(18px, 2vw, 24px)` | 500 | 1.3 | Subheadings |
| `--text-body` | `16px` | 400 | 1.6 | Body copy |
| `--text-body-lg` | `18px` | 400 | 1.6 | Intro paragraphs |
| `--text-caption` | `13px` | 400 | 1.4 | Labels, metadata |
| `--text-code` | `14px` | 400 (mono) | 1.5 | Inline code, technical details |

### Typography Rules

1. Hero text uses `letter-spacing: -0.03em` for tight, impactful headlines.
2. Body text uses default tracking. Never tighten body copy.
3. All-caps sparingly: only for small labels/tags, with `letter-spacing: 0.08em`.
4. Accent color on a single word in hero headlines (not the whole headline).
5. Line lengths: body text maxes out at `65ch` for readability.

---

## 3. Spacing Scale

Based on a 4px base unit. Consistent across all components.

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--space-1` | `4px` | Tight internal padding |
| `--space-2` | `8px` | Icon gaps, badge padding |
| `--space-3` | `12px` | Input padding, small gaps |
| `--space-4` | `16px` | Card internal padding, list spacing |
| `--space-5` | `20px` | Standard gap |
| `--space-6` | `24px` | Bento grid gap, card padding |
| `--space-8` | `32px` | Section internal spacing |
| `--space-10` | `40px` | Component separation |
| `--space-12` | `48px` | Section padding (mobile) |
| `--space-16` | `64px` | Section padding (tablet) |
| `--space-20` | `80px` | Section padding (desktop) |
| `--space-24` | `96px` | Page section gaps |
| `--space-32` | `128px` | Hero vertical padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Badges, small buttons |
| `--radius-md` | `12px` | Input fields, small cards |
| `--radius-lg` | `16px` | Cards, bento tiles |
| `--radius-xl` | `24px` | Feature sections, modals |
| `--radius-full` | `9999px` | Pills, avatars |

---

## 4. Shadow and Depth

Dark-mode shadows use subtle opacity and colored glows rather than traditional box-shadows.

```css
/* Card resting state */
--shadow-card: 0 1px 2px rgba(0, 0, 0, 0.3);

/* Card elevated (hover) */
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.4);

/* Floating elements (nav, modals) */
--shadow-float: 0 16px 48px rgba(0, 0, 0, 0.5);

/* Accent glow (used behind highlighted cards) */
--shadow-glow: 0 0 60px rgba(255, 107, 74, 0.15);
```

---

## 5. Motion and Animation

### Timing Curves

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations, reveals |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transitions, transforms |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful interactions, bounces |
| `--ease-smooth` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Subtle movements |

### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `150ms` | Hover states, color changes |
| `--duration-normal` | `250ms` | Standard transitions |
| `--duration-slow` | `400ms` | Page transitions, reveals |
| `--duration-scroll` | `600ms` | Scroll-triggered animations |
| `--duration-hero` | `1000ms` | Hero entrance animation |

### Animation Rules

1. Use `transform` and `opacity` only for hardware acceleration.
2. Scroll-triggered reveals: fade up from `translateY(24px)` to `translateY(0)` with opacity 0 to 1.
3. Stagger children by 60-100ms for grouped reveals.
4. Never animate layout properties (`width`, `height`, `margin`, `padding`).
5. Reduce motion: respect `prefers-reduced-motion` and disable all non-essential animation.
6. Glow orbs float with `animation: float 6s ease-in-out infinite`.

---

## 6. Glassmorphism Spec

Used on navigation bar and floating cards. Subtle, not heavy.

```css
.glass {
  background: rgba(20, 20, 21, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-lg);
}
```

---

## 7. Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| `--bp-sm` | `640px` | Mobile landscape |
| `--bp-md` | `768px` | Tablet |
| `--bp-lg` | `1024px` | Small desktop |
| `--bp-xl` | `1280px` | Desktop |
| `--bp-2xl` | `1536px` | Large desktop |

### Content Width

| Token | Value | Usage |
|-------|-------|-------|
| `--max-width` | `1280px` | Default content container |
| `--max-width-narrow` | `768px` | Blog posts, about text |
| `--max-width-wide` | `1440px` | Bento grids, full-width sections |

---

## 8. Icon System

- Primary: Lucide icons (consistent, open source, tree-shakeable)
- Size tokens: `16px` (inline), `20px` (standard), `24px` (prominent), `32px` (feature)
- Stroke width: 1.5px (matches Geist aesthetic)
- Color: inherits `currentColor`

---

## 9. CSS Custom Properties (Implementation Reference)

```css
:root {
  /* Colors */
  --bg-base: #0A0A0B;
  --bg-surface: #141415;
  --bg-surface-hover: #1A1A1B;
  --bg-elevated: #1E1E1F;
  --border-subtle: #222223;
  --border-focus: #333334;
  --text-primary: #EDEDED;
  --text-secondary: #888888;
  --text-tertiary: #555555;
  --accent: #FF6B4A;
  --accent-hover: #FF8266;
  --accent-alt: #7C5CFC;

  /* Typography */
  --font-sans: 'Geist', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;

  /* Spacing */
  --space-unit: 4px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-normal: 250ms;
}
```
