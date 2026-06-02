# Cycle 3 — Competitive Performance Benchmark (2026-06-02)
**Context**: edgelesslab.com vs top-tier solo dev / tech sites

---

## Network Performance Comparison

| Site | TTFB | HTML Size | Total Load | Tech Stack |
|------|------|-----------|------------|------------|
| **edgelesslab.com** | **68ms** | **91KB** | **82ms** | Next.js 16 (static) |
| simonwillison.net | 751ms | 92KB | 873ms | Django (server-rendered) |
| jvns.ca | 839ms | 146KB | 889ms | Jekyll (static) |
| paulgraham.com | 618ms | 5KB | 618ms | Viaweb (pure HTML) |
| rachelbythebay.com | 237ms | 1.4KB | 237ms | Blogspot (minimal) |
| overreacted.io | 198ms | 86KB | 295ms | Gatsby (static) |
| readwise.io | 502ms | 104KB | 520ms | Next.js (dynamic) |
| rauchg.com | 186ms | 34KB | 190ms | Next.js (static) |

## Key Takeaways

### Where edgelesslab.com wins
1. **Fastest TTFB (68ms)** — GitHub Pages CDN (Fastly) is best-in-class
2. **Fastest total load (82ms)** — static export eliminates server processing
3. **Content-rich at speed** — 91KB HTML delivered in same time as 1.4KB pure-HTML sites
4. **CDN edge distribution** — beats Django/Dynamic sites by 10x on TTFB

### Where edgelesslab.com loses
1. **JS execution cost not measured** — 397KB JS across 18 scripts hidden from curl benchmarks
2. **HTML too heavy** — 91KB vs 5KB (pg), 1.4KB (rachel), 34KB (rauchg)
3. **No progressive enhancement** — pure-content sites work without JS; edgelesslab requires JS for rendering
4. **Feature depth** — simonwillison has search, tags, series, conversational threads

### Strategic Insight
edgelesslab.com is already the **fastest-loading** site in this set for cold-cache visits. The optimization battle is not about network performance — it's about:

1. **JS parse/execute time** (hidden from curl benchmarks, visible in Lighthouse)
2. **Responsiveness after load** (time-to-interactive)
3. **Mobile performance** (JS weight hits harder on slower devices)
4. **SEO content depth** (more unique pages = more indexable surface)

## Recommended Focus Shift

| Priority | Focus | Why |
|----------|-------|-----|
| P0 | Reduce JS bundle (-60%) | Only metric where edgeless falls behind |
| P1 | Add search (+100% UX) | Simon Willison has it; changes how power users navigate |
| P2 | Content volume (+30% more pages) | Pure-content sites win on indexable surface area |
| P3 | OG image auto-generation | Every page should have a unique visual card |

The network edge is already won. The next frontier is JS delivery and content depth.
