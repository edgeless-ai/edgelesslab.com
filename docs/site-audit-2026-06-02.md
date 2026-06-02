# Edgeless Lab Website Audit — 2026-06-02

**Goal**: Make edgelesslab.com one of the best sites on the internet
**Benchmarks**: Vercel, Linear, Raycast tier
**Context**: Next.js 16 static export, GitHub Pages, Tailwind CSS v4

## Current State

### Meta
- URL: https://edgelesslab.com
- Stack: Next.js 16, React 19, Tailwind CSS v4, framer-motion, @chenglou/pretext
- Hosting: GitHub Pages (via GitHub Actions deploy)
- 104 HTML pages across 10+ sections
- 95MB static export (51MB = pen-plotter images)
- Git: 3 recent commits (blog posts, lab improvements, deploy fixes)

### Design Quality
- Dark theme: Linear/Basement Studio-inspired
- Accent: Indigo #818CF8, Green #34D399
- Font: Geist (sans + mono), same as Vercel
- Nav: Fixed top, backdrop-blur, rounded-full pill design
- Hero: Generative ASCII art, kinetic text (pretext library), ping indicator
- Sections: Activity feed, Featured projects (bento grid), Infrastructure, Stack flow, Lab experiments, Products, About, Subscribe
- Blog: Editorial layout with TOC sidebar, inline data viz, drop caps
- Mobile: Hamburger nav with smooth overlay

### SEO Foundation (Good)
- JSON-LD Organization schema ✓
- OG metadata with images ✓
- Twitter card ✓
- RSS feed ✓
- Sitemap.xml ✓
- robots.txt ✓
- Canonical URLs ✓
- Breadcrumb struct data potential

### Performance Concerns
- Homepage HTML: 91KB (framer-motion + inline animation styles)
- Static export means no code-splitting for routes (everything in initial bundle)
- 95MB total export (51MB pen-plotter image assets)
- No measured Lighthouse score, no PWA

### Content Quality
- 8 active blog posts (recent: 6/2 through 5/26, solid throughput)
- 18 free products listed
- 6 projects with individual pages
- 4 lab experiments with detail pages
- Agents directory
- Knowledge base

### Gaps vs Vercel/Linear/Raycast Tier

| Area | Current | Target |
|------|---------|--------|
| Page transitions | None | Smooth route transitions |
| Interactive demo | Static ASCII art only | Live, clickable demos |
| Agent-updated content | None | Live dashboards, auto-updates |
| Perf score | Unknown | 95+ Lighthouse all categories |
| Bundle optimization | 91KB HTML | <50KB initial render |
| Design system | Fragmented (DESIGN.md separate) | Unified system |
| OG images | Static per-page | Auto-generated per blog post |
| Search | None | Full-text search |
| Dark/light | Dark only | Both modes |
| E-commerce | Gumroad links | Embedded checkout, product demos |

## Priority Roadmap (by impact/effort)

### Cycle 1: Audit + Measurement (this cycle)
- [ ] Run Lighthouse on production
- [ ] Audit bundle composition
- [ ] Check for 404/redirect issues
- [ ] Create prioritized issue backlog

### Cycle 2: Performance (highest impact)
- [ ] Bundle analysis + tree-shaking audit
- [ ] Optimize framer-motion usage (replace with CSS where possible)
- [ ] Compress pen-plotter images (51MB -> target <15MB)
- [ ] Inline critical CSS, defer non-critical
- [ ] Target: <50KB initial render, 95+ Lighthouse

### Cycle 3: Living Content / Agent Integration
- [ ] Agent-generated activity feed (auto-updating from Paperclip)
- [ ] "Latest from the swarm" dashboard component
- [ ] Auto-generated project update pages
- [ ] Cron job that commits data updates

### Cycle 4: Interaction + Delight
- [ ] Page transitions (framer-motion AnimatePresence)
- [ ] Interactive code demos in blog posts
- [ ] Live product previews
- [ ] Scroll-triggered ambient effects

### Cycle 5: SEO + Content Infrastructure
- [ ] Auto-generated OG images per blog post
- [ ] Breadcrumb structured data
- [ ] Internal linking audit
- [ ] Search functionality (Fuse.js or similar)
- [ ] Enhanced blog schema (Article + BlogPosting)
