# Edgeless Lab Editorial Design System

Shared conventions for self-contained HTML field notes. Each editorial is a single HTML file with inline CSS/JS, no build step.

## Typography

### Fonts

| Role | Family | Source | Weight codes |
|------|--------|--------|-------------|
| Display/body | Boska | Fontshare | 300,301,400,401,500,501 |
| Mono/captions | JetBrains Mono | Google Fonts | 400,500,700 + italic 400 |

**Fontshare weight convention**: even = normal (300, 400, 500), odd = italic (301, 401, 501).

```html
<!-- Always load BOTH normal and italic weights -->
<link href="https://api.fontshare.com/v2/css?f[]=boska@300,301,400,401,500,501&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
```

### CSS variables

```css
--serif: "Boska", "Times New Roman", Georgia, serif;
--mono:  "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

### Rules

- Body text: `font-weight: 400`, upright (never italic for body prose)
- Hero title: `font-weight: 400`, with `<em>` in italic weight 300 for the suffix
- Lede/deck: italic (`font-style: italic`), max-width ~36ch
- Section markers (S01, S02): JetBrains Mono, accent color
- Captions/plate labels: JetBrains Mono, uppercase, letter-spacing 0.08em
- No emdashes. Use commas, semicolons, periods, or restructure.

## Color

### Shared palette (every editorial)

```css
--paper:      #f3eddd;   /* warm off-white, aged */
--paper-deep: #ebe3cf;   /* shadow/alternate sections */
--ink:        #0c0a08;   /* deep cold black, primary text */
--ink-soft:   #2a2520;   /* secondary text */
--ink-faint:  #56524a;   /* tertiary, mono captions (5.5:1 on paper, AA) */
--rule:       #d4cab4;   /* hairlines, separators */
```

### Per-project accents

| Project | Accent name | Primary | Deep | Rationale |
|---------|-------------|---------|------|-----------|
| Pen Plotter | sodium amber | `#c2410c` | `#9a3412` | Warm, industrial, machine heat |
| Tartanism | woad blue | `#2d4a7a` | `#1e3459` | Isatis tinctoria, historical Scottish dye |
| Total Serialism | malachite green | `#1a6847` | `#134d35` | Algorithmic/natural, mineral |

Each editorial uses exactly one accent color. Define it as both a named variable and an `--accent` alias:

```css
--malachite:      #1a6847;
--malachite-deep: #134d35;
--accent:         var(--malachite);
--accent-deep:    var(--malachite-deep);
```

## Background texture

SVG noise grain, applied to `body`. Identical across all editorials:

```css
background-image:
  radial-gradient(ellipse 80% 50% at 50% -20%, rgba(194,65,12,0.05), transparent 60%),
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
```

The radial gradient tint uses the project's accent color at very low opacity (~0.05).

## Layout

### Meta strip (sticky header)

Top-of-page bar with project metadata. JetBrains Mono, uppercase, letter-spacing 0.1em.

```
[accent dot] EDGELESS LAB / PROJECT NAME                    FILED YYYY.MM.DD
```

Left: accent-colored dot + breadcrumb. Right: date filed. Stays pinned on scroll.

### Hero

Two-column grid at desktop, single column mobile. Left: title + lede. Right: hero specimen image with plate caption.

### Section structure

```
S0N
SECTION TITLE
[optional subtitle in mono]

[body prose in Boska 400, right column at desktop]
```

Section numbers use accent color. Body text max-width ~50ch.

### Table of contents (navigation bar)

Below the hero, above S01:

```
D. MURRAY . MONTH YEAR     CONTINUE     S01 METHOD . S02 CATALOG . S03 BEST OF RUN . S04 COLOPHON
                               |
```

### Specimen plates

Image with mono caption below:

```
PLATE I.  NAME . VARIANT NNNN        SCORE / DETAILS
```

### Catalog grid

CSS grid of specimen thumbnails. Each cell: image + mono label. Responsive column count via `auto-fill, minmax(...)`.

## File structure

```
project-name/
  field-notes/
    index.html          # self-contained editorial
    assets/
      specimens/        # hero + category images
      thumbs/           # catalog thumbnails (400x400)
      spreads/          # full-width spread images
      og-image.png      # 1200x630 OG card
      manifest.json     # specimen metadata (optional)
```

For the pen plotter (historical): lives at `/pen-plotter/index.html` directly (no field-notes/ subdirectory).

## Image sizes

| Type | Dimensions | Format |
|------|-----------|--------|
| Hero specimen | 800x800 | PNG |
| Category specimen | 600x600 | PNG |
| Catalog thumbnail | 400x400 | PNG |
| Spread | 800x1000 | PNG |
| OG card | 1200x630 | PNG |

## Conventions

- All CSS/JS inline in the HTML file. No external stylesheets, no build.
- `::selection` uses accent color background, paper text.
- Scrolling reveal animations: `IntersectionObserver` with `fadeUp` keyframe.
- Drop cap on first paragraph of each section body.
- No emdashes anywhere. No em dashes. Not even in comments.
- Accent dot in meta strip: CSS `::before` pseudo-element, 8px circle.
