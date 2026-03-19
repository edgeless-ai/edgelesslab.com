# Edgeless Lab - Page Structure and Site Architecture

**Status:** Foundation v1.0
**Date:** 2026-03-13

---

## Site Map

```
edgelesslab.com/
  |
  +-- / (Home / Landing)
  |
  +-- /projects
  |     +-- /projects/[slug] (Individual project/case study)
  |
  +-- /lab
  |     +-- /lab/[slug] (Individual experiment, full-screen)
  |
  +-- /about
  |
  +-- /journal
  |     +-- /journal/[slug] (Individual post)
  |
  +-- /contact
```

---

## Page Details

### 1. Home (/)

The landing page. Scroll-driven narrative that introduces the lab and showcases work.

**Sections in scroll order:**

1. **Hero** - Full viewport. Lab name, mission statement, single CTA, ambient glow.
2. **Featured Projects** - Bento grid with 4-6 highlighted projects. Mix of large (2-col) and small (1-col) cards.
3. **Capabilities Strip** - Horizontal row of capability icons with labels. Subtle scroll-triggered reveal.
4. **Lab Preview** - 2-3 live experiment cards with canvas embeds. "See all experiments" link.
5. **About Teaser** - Short philosophy statement with link to full about page.
6. **Footer** - Newsletter signup, links, status indicator.

**Technical notes:**
- Each section uses Intersection Observer for scroll-triggered animations
- Hero stays sticky for first 100vh, then scrolls normally
- Bento grid items stagger in with 80ms delay between cards
- Total page height: approximately 4-5 viewports

### 2. Projects (/projects)

Filterable grid of all projects and case studies.

**Sections:**

1. **Page Header** - "Projects" title, optional filter bar
2. **Filter Bar** - Horizontal pills: All, Creative Tech, AI, Design, Open Source
3. **Project Grid** - Bento grid, 3 columns desktop, 2 tablet, 1 mobile
4. **Footer**

**Technical notes:**
- Filter changes use layout animation (Framer Motion `AnimatePresence`)
- URL params for filter state (`/projects?filter=ai`)
- Lazy-load thumbnails with blur-up placeholder
- Pagination or infinite scroll for 10+ projects

### 3. Project Detail (/projects/[slug])

Immersive case study page for individual projects.

**Sections:**

1. **Back Navigation** - "Back to Projects" with left arrow
2. **Project Header** - Category, year, title, description, action buttons
3. **Hero Media** - Full-width image, video, or embedded interactive demo
4. **Content** - MDX-rendered sections: Challenge, Approach, Results
5. **Media Gallery** - Additional screenshots or videos
6. **Tech Stack** - Pills showing technologies used
7. **Next Project** - Navigation to next case study
8. **Footer**

**Technical notes:**
- Content stored as MDX files or Sanity CMS entries
- Hero media supports: static image (WebP/AVIF), video (mp4), iframe (live demo)
- Reading progress bar at top (optional)
- Estimated reading time in header

### 4. Lab (/lab)

Playground showcasing interactive experiments and generative art.

**Sections:**

1. **Page Header** - "Lab" title, tagline about experimentation
2. **Tag Filter** - Pills: All, Generative, AI, Audio, Data Viz, Pen Plotter
3. **Experiment Grid** - Equal-size cards with live canvas previews
4. **Footer**

**Technical notes:**
- Canvas previews run at reduced framerate (15fps) until hovered (60fps)
- Each experiment lazy-loads its own JS bundle
- Full-screen mode available on click-through
- Performance budget: no experiment should block main thread for more than 50ms

### 5. Lab Experiment Detail (/lab/[slug])

Full-screen interactive experience for individual experiments.

**Sections:**

1. **Floating Controls** - Back button, title, fullscreen toggle, settings gear
2. **Canvas** - Full viewport interactive canvas
3. **Info Panel** - Slide-out drawer with description, tech used, source link

**Technical notes:**
- Minimal chrome, experiment takes full viewport
- Info panel is a drawer that slides from right on click
- Share button generates a URL with current state parameters
- Settings panel for adjustable parameters (if applicable)

### 6. About (/about)

Studio philosophy, capabilities, and tools.

**Sections:**

1. **Hero** - "About Edgeless Lab" with large type
2. **Philosophy** - Two-column layout: image/illustration left, text right
3. **Capabilities** - Icon grid of what the lab works with
4. **Tools** - Horizontal strip of technology logos/names
5. **Timeline** - Optional, key milestones in lab history
6. **Footer**

**Technical notes:**
- Scroll-triggered reveals for each section
- Philosophy text uses `--max-width-narrow` for readability
- Capabilities grid uses Lucide icons with accent coloring

### 7. Journal (/journal)

Technical blog, process documentation, and research notes.

**Sections:**

1. **Page Header** - "Journal" title
2. **Featured Post** - Large card for latest/pinned post
3. **Post Grid** - 2-column layout of post cards
4. **Footer**

**Post card anatomy:**
```
+-------------------------------------------+
|  CATEGORY  .  March 13, 2026              |
|  Post Title Goes Here                      |
|  First two lines of the post as a          |
|  preview excerpt...                        |
|  [3 min read]                              |
+-------------------------------------------+
```

**Technical notes:**
- MDX-based content with code syntax highlighting
- RSS feed at `/journal/feed.xml`
- Categories: Engineering, Design, Research, Process
- Related posts at bottom of each post

### 8. Contact (/contact)

Simple contact page.

**Sections:**

1. **Header** - "Get in Touch"
2. **Contact Info** - Email, social links, optional form
3. **Form** - Name, email, message, submit button (or "Prefer email? hello@edgelesslab.com")
4. **Footer**

**Technical notes:**
- Form submits to serverless function or email API
- Honeypot field for spam prevention (no CAPTCHA)
- Confirmation message on submit with animation

---

## Route Configuration (Next.js App Router)

```
app/
  layout.tsx              # Root layout with nav + footer
  page.tsx                # Home
  projects/
    page.tsx              # Projects listing
    [slug]/
      page.tsx            # Project detail
  lab/
    page.tsx              # Lab listing
    [slug]/
      page.tsx            # Experiment detail (full-screen layout)
  about/
    page.tsx              # About
  journal/
    page.tsx              # Journal listing
    [slug]/
      page.tsx            # Journal post
  contact/
    page.tsx              # Contact
  api/
    contact/
      route.ts            # Contact form handler
    og/
      route.tsx           # Dynamic OG image generation
```

---

## Shared Layout Components

| Component | Used On | Notes |
|-----------|---------|-------|
| `Navbar` | All pages | Fixed, glass effect |
| `Footer` | All pages except lab/[slug] | Newsletter, links, status |
| `CommandPalette` | All pages | Cmd+K global search |
| `ScrollProgress` | project/[slug], journal/[slug] | Reading progress bar |
| `PageTransition` | All pages | Framer Motion page transitions |

---

## SEO and Meta

Each page generates:
- `<title>` with pattern: "Page Name - Edgeless Lab"
- `<meta description>` unique per page
- Open Graph image (dynamic via `/api/og` or static per page)
- JSON-LD structured data (Organization, Article for journal posts)
- Canonical URL
- Sitemap at `/sitemap.xml`
- Robots.txt

---

## Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Total Blocking Time | < 200ms |
| Lighthouse Performance | 90+ |
| Bundle size (initial) | < 150KB gzip |
| Font loading | WOFF2, preloaded, font-display: swap |
| Images | WebP/AVIF, responsive srcset, blur-up placeholders |
