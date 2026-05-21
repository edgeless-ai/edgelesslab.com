---
slug: "pretext-typography-that-thinks"
title: "PreText: Typography That Thinks"
description: "Most web text is a dumb rectangle. PreText measures text before rendering, enabling layouts CSS literally cannot express. Six ways we use it."
date: "2026-04-02"
tags:
  - "PreText"
  - "Typography"
  - "Web Development"
readTime: "6 min"
editorial: true
---
CSS gives you two options for text layout: a block that fills its container, or `fit-content` that shrinks to the longest line. Neither lets you answer "how tall will this paragraph be at 320px wide?" without rendering it first.

PreText answers that question in 0.002ms, before a single DOM node exists. That changes what's possible.

## The Measurement Gap

Every masonry layout, every accordion animation, every balanced text block on the web has the same problem: you need to know the height of something before you render it.

The standard approach is render-measure-rerender. Mount the DOM, read `offsetHeight`, reposition. This causes layout thrash: visible flicker where elements jump as the browser recalculates.

PreText skips the DOM entirely. It uses the Canvas 2D text measurement API to calculate exact line breaks, line widths, and total height for any text at any width. The results match browser rendering because they use the same font metrics.

## What We Built With It

The [Edgeless Lab site](/) uses PreText in six places, each solving a different layout problem:

**Masonry product grid**: The [products page](/products) lays out product cards in a masonry grid. Each card's height is different because descriptions vary in length. PreText measures every description, calculates the exact card height, and places cards using a shortest-column algorithm. Zero DOM measurement. Zero layout shift.

**Shrink-wrap balanced text**: The about section on the homepage wraps text to the tightest possible width that preserves line count. CSS `fit-content` leaves dead space on the last line. PreText's `walkLineRanges` finds the actual maximum line width, giving text a balanced, typeset appearance.

**Hero cursor reflow**: The homepage subtitle text flows around your cursor in real time. As you move the mouse, PreText recalculates line breaks around a circular obstacle at 60fps using `layoutNextLine` with remaining-width budgets. Pure DOM manipulation, no React re-renders.

**Stagger reveal**: The stack section reveals text line-by-line on scroll. PreText's `layoutWithLines` returns exact line widths, so wider lines slide further during the entrance animation, creating geometry-driven stagger.

**Rich inline flow**: The stack pipeline displays tool names in monospace and descriptions in sans-serif, reflowing as a single mixed-font paragraph. Each segment is measured separately; `layoutNextLine` coordinates the width budget across font changes.

**Generative ASCII art**: The [generative ASCII experiment](/lab/generative-ascii) uses PreText to measure character widths for proportional-to-monospace mapping, ensuring spatial accuracy in typographic art.

## The API in 30 Seconds

PreText exposes six functions. You only need two for most work:

`prepare(text, font)`: tokenizes text and measures segment widths. Returns a prepared object. Runs once per text/font pair.

`layout(prepared, width, lineHeight)`: calculates total height and line count at a given container width. Returns `{ height, lineCount }`. Runs in microseconds.

For advanced layouts:

`layoutWithLines(prepared, width, lineHeight)`: returns every line with its exact pixel width. Use for stagger animations or justified text.

`walkLineRanges(prepared, font, lineHeight, callback)`: iterates line ranges for binary search over widths (shrink-wrap).

`layoutNextLine(prepared, cursor, maxWidth, lineHeight)`: advances one line at a time. Use for multi-column, obstacle avoidance, or mixed-font layouts.

`prepareWithSegments(text, font)`: like prepare, but returns individual segment widths for character-level operations.

## Why This Matters for Product Pages

When you're selling developer tools, the site itself is a portfolio piece. A masonry layout that loads without flicker. Accordion animations that hit their target height on the first frame. Text that reflows around your cursor without a single layout recalculation.

These aren't features for their own sake. They demonstrate the kind of engineering precision that the products represent. If the site can't get typography right, why would you trust the templates?

## Getting Started

PreText is an npm package: `@chenglou/pretext`. It's 4KB gzipped, zero dependencies, works in any framework. The [PreText demos](https://chenglou.me/pretext/) show every technique in isolation.

The integration pattern: load PreText in a `useEffect`, wait for fonts, then measure. Server-side, fall back to CSS estimates. The switch from fallback to measured layout is imperceptible because the content is identical; only the positioning changes.

```
const { ready, prepare, layout } = usePreText("Geist");

if (ready) {
  const prepared = prepare(text, '14px "Geist"');
  const { height } = layout(prepared, containerWidth, 22.4);
  // height is exact, before any DOM exists
}
```

Every technique on this site is built from those six functions. The [source is on GitHub](https://github.com/edgeless-ai).
