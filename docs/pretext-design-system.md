# PreText Design System -- edgelesslab.com

> Living document. Rules for when and how to use PreText in the Edgeless website.

## Components

### `PreTextBlock`
**Location:** `src/components/ui/pretext-block.tsx`
**Purpose:** Renders text with precise PreText line-breaking. Supports obstacle-aware flow.

```tsx
<PreTextBlock
  text="Your text content"
  font='300 18px "Geist"'
  lineHeight={30}
  obstacles={[{ x: 400, y: 0, width: 200, height: 100 }]}
  className="text-lg font-light"
  style={{ color: "var(--text-secondary)" }}
  fallback={<p>Plain text fallback for SSR</p>}
  onLayout={({ height, lineCount }) => console.log(height, lineCount)}
/>
```

**Props:**
- `text` (required) -- plain text string
- `font` -- CSS font shorthand matching your styles exactly
- `lineHeight` -- in px, must match CSS
- `obstacles` -- array of `{ x, y, width, height }` rects to flow around
- `onLayout` -- callback with computed dimensions
- `fallback` -- SSR/loading fallback ReactNode

**SSR behavior:** Renders `fallback` or raw text. PreText takes over after hydration.

### `EditorialBlock`
**Location:** `src/components/ui/pretext-pull-quote.tsx`
**Purpose:** Multi-paragraph layout with floating pull-quotes.

```tsx
<EditorialBlock
  paragraphs={["Paragraph 1...", "Paragraph 2..."]}
  pullQuotes={[
    { text: "Key phrase.", side: "right", yOffset: 20, width: 240 }
  ]}
  font='300 18px "Geist"'
  lineHeight={30}
/>
```

### `useCardHeights`
**Location:** `src/hooks/use-card-heights.ts`
**Purpose:** Measures card text blocks and returns `max(heights)` for equal-height grids.

```tsx
const gridRef = useRef<HTMLDivElement>(null);
const normalizedHeight = useCardHeights(
  cards.map(c => ({ text: c.description, font: '14px "Geist"', lineHeight: 22.4 })),
  gridRef
);
// Apply as minHeight on each card's description element
```

### `usePreText`
**Location:** `src/hooks/use-pretext.ts`
**Purpose:** Core hook. Lazy-loads PreText, waits for font, returns API functions.

### `pretextFont`
**Location:** `src/lib/pretext-fonts.ts`
**Purpose:** Builds CSS font shorthand strings for PreText.

---

## Where to Use PreText

| Surface | Component | Why |
|---------|-----------|-----|
| **Hero subtitle** | `PreTextBlock` with obstacles | Signature moment -- text flows around animated orbs |
| **About/Philosophy** | `EditorialBlock` with pull-quotes | Editorial feel, text flows around accent phrases |
| **Product card descriptions** | `useCardHeights` | Equal-height cards without `min-h` hacks |
| **Blog prose** (future) | `PreTextBlock` | Knuth-Plass justification for long-form reading |

## Where NOT to Use PreText

| Surface | Why CSS is sufficient |
|---------|----------------------|
| H1 headlines | Hard `<br>` breaks, no reflow. `text-wrap: balance` is enough. |
| Section labels | Single-line, small text. |
| Navigation, footer | Static, short text. |
| Tag pills | `flex-wrap` works correctly. |
| Code blocks | Pre-formatted, author-controlled line breaks. |
| Status chips | Single-line decorative text. |

**Rule of thumb:** If the text is fewer than 3 lines or has author-controlled breaks, use CSS. PreText earns its keep on flowing prose (2+ paragraphs) and obstacle-aware layout.

---

## Fallback Behavior

Every PreText component renders a plain-text fallback until:
1. The font is confirmed loaded via `document.fonts.ready`
2. The PreText module is dynamically imported (~15KB gzipped)

This means:
- SSR output is plain text with CSS layout (no layout shift for simple text)
- After hydration (~50ms), PreText takes over with measured layout
- The visual transition should be imperceptible for body text
- For obstacle-aware layout, the "flowing around obstacles" effect pops in after hydration (acceptable since orb animations also start post-hydration)

---

## Performance Budget

| Item | Cost |
|------|------|
| Bundle (gzipped) | 15KB async-loaded |
| `prepare()` per text | ~1ms |
| `layout()` per text | ~0.0002ms |
| Total FCP impact | 0ms (async) |
| Total TTI impact | ~50ms |

---

## Font Sync Requirements

**Critical:** The `font` string passed to PreText must match your CSS exactly.

| CSS | PreText font string |
|-----|---------------------|
| `font-weight: 300; font-size: 18px; font-family: Geist` | `'300 18px "Geist"'` |
| `font-weight: 600; font-size: 22px; font-family: Geist` | `'600 22px "Geist"'` |
| `font-size: 14px; font-family: Geist` (default weight) | `'14px "Geist"'` |

Use `pretextFont(18, "sans", 300)` helper from `pretext-fonts.ts` to build these.

---

## Anti-Patterns

1. **Don't use PreText for static, short text.** A `<h2>` with 3 words doesn't need measurement.
2. **Don't forget the font string must match CSS.** Mismatched weight/size = wrong measurements.
3. **Don't use `system-ui` font.** PreText explicitly warns this is inaccurate on macOS. Always use `"Geist"`.
4. **Don't block render on PreText.** Always provide a fallback. PreText is progressive enhancement.
5. **Don't animate obstacles at 60fps without throttling.** The hero uses `requestAnimationFrame` for orb tracking, which is fine, but avoid triggering PreText re-layout on every mouse move.
6. **Don't expand PreText usage without a go/no-go evaluation.** Each new surface needs a comparison against CSS-only to justify the complexity.

---

*Last updated: 2026-03-31. PreText v0.0.3.*
