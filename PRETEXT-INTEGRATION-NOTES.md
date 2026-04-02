# PreText Integration Notes -- Technical Implementation

> Implementation companion to PRETEXT-ULTRATHINK-PLAN.md. Contains code, architecture decisions, and gotchas.

---

## 1. Package Setup

```bash
npm install @chenglou/pretext
```

Current version: v0.0.3 (published 2026-03-27). API may change -- pin the version.

---

## 2. Core Hook: `usePreText`

```tsx
// src/hooks/use-pretext.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type PreTextModule = typeof import("@chenglou/pretext");

const FONT_CHECK_TIMEOUT = 3000;

export function usePreText(fontFamily = "Geist") {
  const [ready, setReady] = useState(false);
  const moduleRef = useRef<PreTextModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Wait for named font to be loaded (Canvas needs it for accurate measurement)
      try {
        await Promise.race([
          document.fonts.ready.then(() =>
            document.fonts.check(`16px "${fontFamily}"`)
              ? Promise.resolve()
              : document.fonts.load(`16px "${fontFamily}"`)
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Font timeout")), FONT_CHECK_TIMEOUT)
          ),
        ]);
      } catch {
        console.warn(`[PreText] Font "${fontFamily}" not confirmed loaded`);
      }

      // Dynamic import keeps PreText out of SSR bundle
      const mod = await import("@chenglou/pretext");
      if (cancelled) return;

      moduleRef.current = mod;
      setReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, [fontFamily]);

  const prepare = useCallback(
    (text: string, font: string) =>
      moduleRef.current ? moduleRef.current.prepare(text, font) : null,
    []
  );

  return {
    ready,
    prepare,
    layout: moduleRef.current?.layout ?? null,
    layoutWithLines: moduleRef.current?.layoutWithLines ?? null,
    layoutNextLine: moduleRef.current?.layoutNextLine ?? null,
    walkLineRanges: moduleRef.current?.walkLineRanges ?? null,
  };
}
```

---

## 3. Reusable Component: `PreTextBlock`

```tsx
// src/components/ui/pretext-block.tsx
"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import { usePreText } from "@/hooks/use-pretext";

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreTextBlockProps {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  obstacles?: Obstacle[];
  onLayout?: (info: { height: number; lineCount: number }) => void;
}

export function PreTextBlock({
  text,
  font = '16px "Geist"',
  lineHeight = 28,
  className,
  style,
  obstacles,
  onLayout,
}: PreTextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, prepare, layoutWithLines, layoutNextLine } = usePreText("Geist");
  const [lines, setLines] = useState<string[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const el = containerRef.current;
    const maxWidth = el.clientWidth;
    const prepared = prepare(text, font);
    if (!prepared) return;

    if (obstacles?.length && layoutNextLine) {
      // Obstacle-aware: each line gets different available width
      const resultLines: string[] = [];
      let cursor = { index: 0, offset: 0 };
      let y = 0;

      while (cursor.index < text.length) {
        let availableWidth = maxWidth;
        for (const obs of obstacles) {
          if (y + lineHeight > obs.y && y < obs.y + obs.height) {
            availableWidth = Math.min(availableWidth, obs.x - 8);
          }
        }

        const line = layoutNextLine(prepared, cursor, availableWidth);
        if (!line) break;
        resultLines.push(line.text);
        cursor = line.cursor;
        y += lineHeight;
      }

      setLines(resultLines);
      setHeight(y);
      onLayout?.({ height: y, lineCount: resultLines.length });
    } else if (layoutWithLines) {
      const result = layoutWithLines(prepared, maxWidth, lineHeight);
      setLines(result.lines.map((l: { text: string }) => l.text));
      setHeight(result.height);
      onLayout?.({ height: result.height, lineCount: result.lineCount });
    }
  }, [ready, text, font, lineHeight, obstacles, prepare, layoutWithLines, layoutNextLine, onLayout]);

  // SSR fallback: plain text, CSS handles layout
  if (!ready) {
    return (
      <div ref={containerRef} className={className} style={style}>
        {text}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, height: height ? `${height}px` : undefined }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            display: "block",
            height: `${lineHeight}px`,
            lineHeight: `${lineHeight}px`,
          }}
        >
          {line}
        </span>
      ))}
    </div>
  );
}
```

---

## 4. Font Constants

```tsx
// src/lib/pretext-fonts.ts
export const PRETEXT_FONTS = {
  sans: '"Geist"',
  mono: '"Geist Mono"',
} as const;
```

---

## 5. Hero Obstacle Flow -- Implementation Sketch

The DotBackground currently animates two orbs via CSS `@keyframes`:
- Indigo orb: `orbPulse` -- 10s loop, scale 1.0-1.08, opacity 0-28%
- Green orb: `orbPulseGreen` -- 12s loop, scale 1.0-1.12, opacity 10-18%, 3s delay

To get obstacle positions without DOM measurement, compute them mathematically:

```tsx
// In HeroSection or a dedicated hook
function useOrbPositions(containerRef: RefObject<HTMLDivElement>) {
  const [orbs, setOrbs] = useState<Obstacle[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Orb base positions (from globals.css)
    // Indigo: left 50%, top 0, 600x900 blur
    // Green: right -10%, top 20%, 400x500 blur
    const indigo = { baseX: rect.width * 0.5, baseY: 0, baseW: 600, baseH: 900 };
    const green = { baseX: rect.width * 1.1, baseY: rect.height * 0.2, baseW: 400, baseH: 500 };

    let frameId: number;
    function tick() {
      const t = performance.now() / 1000;

      // Indigo: 10s cycle, scale 1.0 -> 1.08
      const indScale = 1.0 + 0.08 * Math.sin((t / 10) * Math.PI * 2);
      // Green: 12s cycle, 3s delay, scale 1.0 -> 1.12
      const grScale = 1.0 + 0.12 * Math.sin(((t - 3) / 12) * Math.PI * 2);

      setOrbs([
        {
          x: indigo.baseX - (indigo.baseW * indScale) / 2,
          y: indigo.baseY,
          width: indigo.baseW * indScale,
          height: indigo.baseH * indScale,
        },
        {
          x: green.baseX - (green.baseW * grScale) / 2,
          y: green.baseY,
          width: green.baseW * grScale,
          height: green.baseH * grScale,
        },
      ]);

      frameId = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [containerRef]);

  return orbs;
}
```

**Important:** The orb positions relative to the subtitle container determine which lines get narrowed. The actual visual effect is subtle -- the subtitle text gently adjusts its line breaks as the orbs breathe. It should not be dramatic reflow, just alive.

---

## 6. Card Height Normalization -- Implementation Sketch

```tsx
// Inside FeaturedGrid or a shared hook
function useNormalizedCardHeight(
  descriptions: string[],
  font: string,
  cardWidth: number,
  lineHeight: number
) {
  const { ready, prepare, layout } = usePreText("Geist");
  const [minHeight, setMinHeight] = useState<number | undefined>();

  useEffect(() => {
    if (!ready || !layout) return;

    const heights = descriptions.map(desc => {
      const prepared = prepare(desc, font);
      if (!prepared) return 0;
      return layout(prepared, cardWidth, lineHeight).height;
    });

    setMinHeight(Math.max(...heights));
  }, [ready, descriptions, font, cardWidth, lineHeight, prepare, layout]);

  return minHeight;
}
```

Use with a ResizeObserver to recalculate when card width changes on responsive breakpoints.

---

## 7. Gotchas

1. **`system-ui` is unsafe on macOS.** Always use the named font `"Geist"`, never `system-ui` or `-apple-system`. PreText README explicitly warns about this.

2. **Font string must match CSS exactly.** If your CSS says `font: 300 18px/1.7 "Geist", sans-serif`, the PreText font string must be `'300 18px "Geist"'`. Weight and style matter for measurement accuracy.

3. **Font must be loaded before `prepare()`.** The `usePreText` hook handles this with `document.fonts.ready` + a 3s timeout. If the font fails to load, measurements will use the fallback font -- results will be close but not pixel-perfect.

4. **No SSR.** PreText needs Canvas. The dynamic import + SSR fallback pattern in `PreTextBlock` handles this cleanly. The flash between SSR text and PreText-measured text should be imperceptible for body text (same font, same container).

5. **`layoutNextLine` cursor shape.** The exact cursor type may differ from the sketch above -- check the actual TypeScript types in the package. The API is v0.0.3 and may change.

6. **Cache management.** For a marketing site with fixed copy, cache is not a concern. If you ever use PreText for user-generated content at scale, call `clearCache()` periodically.

7. **Next.js 16 + React 19.** The dynamic import pattern (`import("@chenglou/pretext")`) works with Next.js 16's module resolution. No special webpack config needed. The package ships ESM.

---

## 8. Performance Numbers

| Operation | Cost | When |
|-----------|------|------|
| Bundle (gzipped) | 15KB | One-time download, async |
| `prepare()` per text | ~1ms | Once per text block, cached |
| `layout()` per text | ~0.0002ms | Every resize/animation frame |
| Font check | ~0ms (already loaded by Next.js) | Once on hydration |
| Total added FCP impact | 0ms (async loaded) | -- |
| Total added TTI impact | ~50ms (import + prepare) | -- |

For context: Framer Motion is 44KB gzipped. A single hero image is typically 50-200KB. PreText at 15KB is well within budget.

---

*Technical implementation notes for PRETEXT-ULTRATHINK-PLAN.md. Generated 2026-03-31.*
