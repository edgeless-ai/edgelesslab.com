# Edgeless Lab - Component Wireframes

**Status:** Foundation v1.0
**Date:** 2026-03-13
**Design System:** `DESIGN-SYSTEM.md`

---

## 1. Navigation Bar

### Structure
```
+------------------------------------------------------------------------+
|  [Logo]   Projects   Lab   About   Journal   [Cmd+K]   [Get in Touch] |
+------------------------------------------------------------------------+
```

### Specifications
- **Position:** Fixed top, z-index 50
- **Style:** Glassmorphism (blur 12px, bg rgba(20,20,21,0.6), 1px border at 6% white)
- **Height:** 64px desktop, 56px mobile
- **Max width:** 1280px centered, with 24px horizontal padding
- **Logo:** "Edgeless" wordmark in Geist 600 weight, 20px. Or icon mark + text.
- **Links:** Geist 400, 14px, `--text-secondary` default, `--text-primary` on hover
- **Active link:** `--accent` color with subtle underline offset
- **CTA button:** "Get in Touch" in small pill (radius-full), `--accent` bg, `--bg-base` text, 13px
- **Cmd+K trigger:** Small icon button, `--border-subtle` border, opens command palette overlay

### Behavior
- Visible on scroll up, hidden on scroll down (show-on-scroll-up pattern)
- Collapses to hamburger below `--bp-md` (768px)
- Mobile drawer: full-height slide from right, dark overlay
- Nav becomes opaque when overlapping hero gradient

### Mobile Hamburger Menu
```
+------------------------------------------+
|  [Logo]                      [Hamburger] |
+------------------------------------------+

Drawer (slide from right):
+------------------+
|         [Close]  |
|                  |
|  Projects        |
|  Lab             |
|  About           |
|  Journal         |
|                  |
|  [Get in Touch]  |
|                  |
|  @github @twitter|
+------------------+
```

---

## 2. Hero Section

### Structure
```
+------------------------------------------------------------------------+
|                                                                        |
|              [Ambient glow - radial gradient, coral/purple]             |
|                                                                        |
|                    Edgeless Lab                                         |
|              Creative technology for                                   |
|              the [curious].                                             |
|                                                                        |
|         We build tools, experiments, and products at the                |
|         intersection of design, AI, and code.                          |
|                                                                        |
|                     [Explore Projects]                                  |
|                                                                        |
|        ---- scroll indicator (animated chevron) ----                   |
|                                                                        |
+------------------------------------------------------------------------+
```

### Specifications
- **Height:** 100vh (full viewport), with content vertically centered
- **Headline:** `--text-hero` size, 700 weight, `--text-primary`
- **Accent word:** "curious" in `--accent` color (coral)
- **Subtitle:** `--text-body-lg`, `--text-secondary`, max-width 480px, centered
- **CTA:** Single button, pill shape, `--accent` bg, 16px text, padding 16px 32px
- **Ambient glow:** `--gradient-hero` behind headline, using pseudo-element, 60px blur
- **Scroll indicator:** Animated chevron at bottom, subtle bounce (translateY 0 to 8px), `--text-tertiary`

### Animation Sequence (on page load)
1. **0ms:** Glow orb fades in (opacity 0 to 0.12, 1000ms)
2. **200ms:** Headline fades up from translateY(32px), 600ms
3. **400ms:** Subtitle fades up, 500ms
4. **600ms:** CTA fades up, 400ms
5. **1200ms:** Scroll indicator fades in, 300ms

---

## 3. Bento Grid (Projects/Capabilities)

### Structure
```
+------------------------------------+-------------------+
|                                    |                   |
|    [Featured Project]              |  [Project B]      |
|    Large card, 2 columns           |  1 column         |
|    16:9 thumbnail                  |  Square thumb     |
|                                    |                   |
+-------------------+----------------+-------------------+
|                   |                                    |
|  [Project C]      |    [Capability Card]               |
|  1 column         |    "AI Experiments"                 |
|  Square thumb     |    Icon + short description         |
|                   |    No thumbnail                     |
+-------------------+------------------------------------+
|                                    |                   |
|    [Project D]                     |  [Project E]      |
|    2 columns                       |  1 column         |
|                                    |                   |
+------------------------------------+-------------------+
```

### Specifications
- **Grid:** CSS Grid, `grid-template-columns: repeat(3, 1fr)`
- **Gap:** 24px (`--space-6`)
- **Max width:** 1440px (`--max-width-wide`)
- **Featured cards:** `grid-column: span 2`
- **Card background:** `--bg-surface`
- **Card border:** 1px solid `--border-subtle`
- **Card radius:** `--radius-lg` (16px)
- **Card padding:** 0 (image bleeds to edges) or 24px for text-only cards
- **Thumbnail aspect:** 16:9 for wide cards, 1:1 for square cards
- **Thumbnail hover:** `scale(1.02)` with `overflow: hidden` on card, 400ms `--ease-out`

### Responsive Behavior
- Desktop (1024px+): 3 columns
- Tablet (768px): 2 columns, featured cards still span 2
- Mobile (below 768px): 1 column, all cards full width

### Card Anatomy (Project Card)
```
+------------------------------------------+
|  [Thumbnail image, 16:9]                 |
|                                          |
+------------------------------------------+
|  CREATIVE TECH                           |  <-- category, --text-tertiary, 12px caps
|  Project Title Goes Here                 |  <-- --text-heading, --text-primary
|  Brief one-line description of the       |  <-- --text-body, --text-secondary
|  project and what it does.               |
+------------------------------------------+
```

### Card Anatomy (Capability Card, no image)
```
+------------------------------------------+
|                                          |
|    [Icon, 32px, --accent]                |
|                                          |
|    AI Experiments                         |
|    We explore generative models,         |
|    computer vision, and language          |
|    tools for creative workflows.         |
|                                          |
|    [Learn more ->]                       |
|                                          |
+------------------------------------------+
```

---

## 4. Project Detail / Case Study

### Structure
```
+------------------------------------------------------------------------+
|  <- Back to Projects                                                    |
+------------------------------------------------------------------------+
|                                                                        |
|  CREATIVE TECH  .  2026                                                |
|                                                                        |
|  Project Name                                                          |
|  A paragraph describing what this project is, why it matters,          |
|  and what technologies power it.                                       |
|                                                                        |
|  [Visit Project]  [View Source]                                        |
|                                                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  [Full-width hero image or embedded demo]                              |
|                                                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  ## The Challenge                                                      |
|  Body text describing the problem...                                   |
|                                                                        |
|  ## The Approach                                                       |
|  Body text with inline images...                                       |
|                                                                        |
|  ## Results                                                            |
|  Metrics or outcomes...                                                |
|                                                                        |
+------------------------------------------------------------------------+
|  [Next Project ->]                                                     |
+------------------------------------------------------------------------+
```

### Specifications
- **Content width:** `--max-width-narrow` (768px) for text, `--max-width-wide` for images
- **Category + year:** `--text-caption`, `--text-tertiary`, all-caps with dot separator
- **Title:** `--text-display` size
- **Body:** `--text-body-lg`, line-height 1.7, optimized for reading
- **Hero media:** Full-bleed or rounded-xl, can be video/iframe for interactive demos
- **Section headings:** `--text-heading`, `--text-primary`
- **Navigation:** "Back" link at top, "Next Project" at bottom for sequential browsing

---

## 5. Lab / Experiments Section

### Concept
A dedicated section (or page) showcasing live, interactive experiments. This is the differentiator: the website itself as a portfolio of running creative tech.

### Structure
```
+------------------------------------------------------------------------+
|  Lab                                                                    |
|  Experiments, prototypes, and things we built for fun.                 |
+------------------------------------------------------------------------+
|                                                                        |
|  +-------------------+  +-------------------+  +-------------------+  |
|  | [Live Canvas]     |  | [Live Canvas]     |  | [Live Canvas]     |  |
|  | Generative art    |  | Strange attractor |  | Pen plotter       |  |
|  | experiment        |  | visualizer        |  | preview           |  |
|  |                   |  |                   |  |                   |  |
|  | Title             |  | Title             |  | Title             |  |
|  | [Try it ->]       |  | [Try it ->]       |  | [Try it ->]       |  |
|  +-------------------+  +-------------------+  +-------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### Specifications
- Cards have live canvas/iframe embeds showing the experiment in action
- Hover pauses/resumes the animation
- Each card links to a full-screen interactive page
- Grid: same bento pattern as projects, but all cards are equal size (1:1 or 4:3)
- Tag system: "generative", "AI", "audio", "data-viz", "pen-plotter"

---

## 6. About Section

### Structure
```
+------------------------------------------------------------------------+
|                                                                        |
|  About Edgeless Lab                                                    |
|                                                                        |
|  [Photo or illustration]     Edgeless Lab is a creative technology     |
|                              studio exploring the boundaries of        |
|                              design, AI, and experimental tools.       |
|                                                                        |
|                              We believe the best technology is         |
|                              invisible. The best interfaces feel       |
|                              like magic. The best tools make you       |
|                              forget you are using a tool.              |
|                                                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  What we work with                                                     |
|                                                                        |
|  [Icon] Generative AI    [Icon] Computer Vision  [Icon] Web Platform  |
|  [Icon] Creative Coding  [Icon] Data Viz         [Icon] Audio/Music   |
|                                                                        |
+------------------------------------------------------------------------+
|                                                                        |
|  Tools we use                                                          |
|                                                                        |
|  Next.js . Python . Swift . Three.js . PyTorch . Claude . p5.js       |
|                                                                        |
+------------------------------------------------------------------------+
```

### Specifications
- **Layout:** Two-column on desktop (image left, text right), stacked on mobile
- **Philosophy text:** `--text-body-lg`, `--text-primary`, max-width `--max-width-narrow`
- **Capability icons:** 32px Lucide icons in `--accent`, with label below
- **Tools strip:** Horizontal scroll or wrap, monospace font, `--text-secondary`

---

## 7. Footer

### Structure
```
+------------------------------------------------------------------------+
|  [gradient fade to black]                                              |
|                                                                        |
|  Edgeless Lab                                                          |
|                                                                        |
|  Projects     Lab         Connect       Legal                          |
|  All Work     Experiments GitHub        Privacy                        |
|  Case Studies Open Source Twitter/X     Terms                          |
|               Tools       Email                                        |
|                                                                        |
|  +----------------------------------------------------+               |
|  | your@email.com                        [Subscribe]   |               |
|  +----------------------------------------------------+               |
|  Stay updated on new experiments and projects.                         |
|                                                                        |
|  ---                                                                   |
|  (c) 2026 Edgeless Lab          [*] All systems operational            |
|                                                                        |
+------------------------------------------------------------------------+
```

### Specifications
- **Background:** `--gradient-footer` (base to pure black)
- **Logo:** Wordmark, `--text-primary`, 18px
- **Link columns:** 4 columns on desktop, 2x2 on tablet, stacked on mobile
- **Link style:** `--text-secondary`, 14px, `--text-primary` on hover
- **Newsletter input:** Single-line, inline submit button, `--bg-surface` background, `--border-subtle` border
- **Status indicator:** Small green dot (`--success`) + "All systems operational" text, 12px
- **Bottom bar:** Separated by 1px `--border-subtle`, copyright left, status right

---

## 8. Command Palette (Cmd+K)

### Structure
```
+----------------------------------------------------+
| [Search icon]  Search projects, posts, labs...     |
+----------------------------------------------------+
|                                                    |
|  PROJECTS                                          |
|  > Edgeless Photo App                              |
|  > Strange Attractors                              |
|  > Pen Plotter Art                                 |
|                                                    |
|  LAB                                               |
|  > Generative Art Experiment                       |
|  > Audio Visualizer                                |
|                                                    |
|  PAGES                                             |
|  > About                                           |
|  > Contact                                         |
|                                                    |
+----------------------------------------------------+
```

### Specifications
- **Trigger:** Cmd+K (Mac), Ctrl+K (Windows), or click search icon in nav
- **Overlay:** Dark scrim (rgba(0,0,0,0.5)), modal centered
- **Modal:** `--bg-elevated`, `--radius-xl`, max-width 560px
- **Search input:** 18px, no border, auto-focus
- **Results:** Grouped by type, keyboard navigable (up/down arrows, Enter to select)
- **Animation:** Scale from 0.95 to 1.0 with opacity, 200ms `--ease-out`
- **Dismiss:** Esc key, click outside, or Cmd+K again
