# Edgeless Lab Visual System

Edgeless Lab is a working research studio for autonomous systems, creative
code, and the notes produced while building both. The visual system has two
related environments:

- **Night Lab** is the operational shell used by the main site, navigation,
  projects, writing, and product surfaces.
- **Field Sheet** is the editorial and artifact language used by Field Notes,
  scientific studies, plotter work, and print-led storytelling.

They share typography, metadata, hard rules, and one live signal color. They
do not share every surface color. This keeps the site recognizable without
forcing a dark interface onto art that needs paper, ink, and natural pigment.

## Design thesis

The site should feel like evidence from an active lab, not a portfolio
template. Every visual device must do at least one of these jobs:

1. route a visitor;
2. expose the state of a real system;
3. frame an artifact;
4. identify provenance, date, method, or status.

One orchestrated interaction is stronger than several ambient effects. Motion
belongs to routing, filtering, comparison, or the behavior of the work itself.
It is not background decoration.

## Audience and page priorities

The homepage serves curious technical readers first, then potential
collaborators and employers, then buyers. Its priorities are:

1. showcase the lab;
2. build readership;
3. teach;
4. make David's work and availability legible;
5. introduce products and shop editions.

## Core palette

| Token | Value | Role |
|------|------|------|
| Night | `#09090b` | Main operational background |
| Carbon | `#111113` | Raised dark surface |
| Paper | `#f3eddd` | Field Sheet background |
| Ink | `#0c0a08` | Text and hard print structure |
| Signal lime | `#c6f24e` | Live state, active route, primary action |
| Malachite | `#1a6847` | Field Notes research and natural systems |
| Relay blue | `#7aa2ff` | Directed routing and interactive focus only |

Signal lime is not a general decoration color. Relay blue appears only when a
route, handoff, or interactive state is visible. Field Sheet projects may use
one natural pigment in place of malachite.

## Typography roles

- **Display:** a restrained editorial serif for theses, artifact titles, and
  Field Notes. Boska is preferred where it is already packaged; Georgia is the
  local fallback.
- **Interface:** Geist Sans for navigation, explanations, and product UI.
- **Metadata:** Geist Mono or JetBrains Mono for routes, dates, state,
  categories, and provenance.

Large sans-serif headlines are reserved for operational declarations. Large
serif headlines are reserved for ideas and artifacts. Do not use both at the
same scale in one section.

## Shape and material

- Prefer square corners or radii between 2px and 8px.
- Use hairline rules, crop marks, metadata strips, and hard print offsets.
- Reserve pills for filters, status, or compact toggles.
- Dark cards should not float in glass. They should read as panels, terminals,
  or captured artifacts.
- Texture must identify paper, scan, toner, or signal state. Random noise is
  not a substitute for hierarchy.

## Motion contract

- The homepage signature is a route field. Selecting a destination reorganizes
  its network and reveals the corresponding content.
- Field Notes motion comes primarily from live study previews.
- Hover motion should confirm what opens or what changes.
- All meaningful controls work with keyboard focus.
- `prefers-reduced-motion` receives a composed static state.
- No section may introduce a second ambient animation while the route field is
  active above the fold.

## Information architecture vocabulary

Use these labels consistently:

- **Field Notes:** interactive studies, scientific plots, generative systems,
  and visual research.
- **Writing:** essays, build reports, and longer explanations.
- **Now:** current work and operating status.
- **Work:** projects, products, and services.
- **Shop:** art-led editions and objects. The art is named before the garment
  or substrate.

`Creative` and `Notes` are retired as public navigation labels. Existing URLs
may redirect, but they do not define separate content collections.

## Field Sheet conventions

The following conventions apply to self-contained HTML field notes. Each
editorial is a single HTML file with inline CSS and JavaScript, with no build
step.

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
