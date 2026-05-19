# Pass 2: Content Curation Audit ("The JJJJound Pass")

**Date**: 2026-05-18
**Auditor**: Claude Code quarterly review

---

## Executive Summary

The catalog is **bloated relative to its depth**. 21 products, all free, most without landing pages. 32 blog posts in 2 months is aggressive velocity but several reference broken product slugs. 16 experiments is healthy but 2 drafts may be abandoned. The JJJJound test: "Does every piece earn its place?" -- several don't.

---

## 1. Product Catalog

### Current State: 21 products, all free, 1 comingSoon

**Landing page coverage**: Only 7/21 products have local landing page slugs. The other 14 link directly to Gumroad.

| Status | Count | Action |
|--------|-------|--------|
| Has local landing page | 7 | Keep, ensure pages are quality |
| Gumroad-only link | 13 | Evaluate: do these need local pages? |
| comingSoon | 1 | "Always-On Agent Deployment Kit" -- still relevant? |

### Products with Local Landing Pages
1. `claude-code-cheat-sheet`
2. `multi-agent-blueprint`
3. `gen-art-starter`
4. `always-on-agent` (comingSoon)
5. `production-mcp-kit`
6. `launch-toolkit`
7. `n8n-ai-workflows`

### Curation Decisions Needed

- **Always-On Agent Deployment Kit** (comingSoon): Is this still being built? If shelved, remove it. Dead "coming soon" labels erode trust.
- **14 Gumroad-only products**: Either create landing pages (adds SEO value) or trim the catalog. A JJJJound-style catalog would have 8-12 products max, each with a strong landing page.
- **All free**: Is this the permanent model? If so, the pricing display ("Free") is correct. If paid products are coming, the catalog UX needs to accommodate that.

---

## 2. Blog Posts

### Current State: 32 posts, 2026-03-21 to 2026-05-13

**Velocity**: ~4 posts/week over 8 weeks. This is very high for a solo lab.

### Last 5 Posts (freshness check)

| Date | Title | Substance? |
|------|-------|-----------|
| 2026-05-13 | "We Built an Envelope Protocol to Stop Our AI Agents from Talking Forever" | Yes -- original protocol design |
| 2026-05-13 | "A Circuit Breaker Saved Me $200 in Tokens" | Yes -- practical, specific savings |
| 2026-05-13 | "From Algorithm to Ink: How We Turn Generative Code into Physical Art" | Yes -- unique pen plotter pipeline |
| 2026-05-12 | "The Most Useful Thing Your AI Agents Can Do Is Audit Themselves" | Yes -- agent self-improvement |
| 2026-05-12 | "I Pointed 7 AI Agents at My YouTube History" | Yes -- novel use case |

**Assessment**: Recent posts have substance. They're experience-driven, not filler. The content engine appears to be producing quality when it runs.

### BROKEN PRODUCT REFERENCES

**4 blog posts reference productSlugs that don't match any product in data.ts:**

| Blog Post | productSlug Used | Problem |
|-----------|-----------------|---------|
| (2 posts) | `claude-memory-kit` | Product exists but has no `slug` field |
| (1 post) | `lixicg` | This is a Gumroad ID, not a slug |
| (1 post) | `plbzo` | Gumroad ID for "The Agent Cookbook" -- no slug |
| (1 post) | `prompt-engineering-os` | Product has no slug field |

**Impact**: These blog posts show no companion product CTA even though one was intended. Revenue/engagement lost on every view.

### Fix Required
Either add `slug` fields to the matching products in `data.ts`, or remove `productSlug` from the blog posts and use `ctaHook` text with direct Gumroad links instead.

---

## 3. Navigation

### Current: 7 items
Projects, Products, Lab, Field Notes, Blog, Knowledge, About + GitHub (external)

**Assessment**: Clean. Not cluttered. Each serves a distinct purpose.

| Item | Earns its place? | Notes |
|------|-----------------|-------|
| Projects | Yes | Portfolio/case studies |
| Products | Yes | Revenue path |
| Lab | Yes | Experiments showcase |
| Field Notes | Yes | User couldn't find these before -- this fixed it |
| Blog | Yes | Content hub |
| Knowledge | Maybe | Overlaps with Blog? Check analytics. |
| About | Yes | Standard |

**Question**: Is "Knowledge" distinct enough from "Blog"? If analytics show low click-through, consider merging or renaming.

---

## 4. Experiments

### Current: 16 total (12 live, 2 draft, 2 active)

**Draft experiments**: These need evaluation. If they've been draft for >60 days with no commits, they're abandoned and should be removed.

**Action**: Check git log for last commit touching each draft experiment. If stale, archive.

---

## 5. Field Notes Apps

### Current: 4 apps, all linked from /field-notes/ page

| App | Loads? | Console Errors? | Data Fresh? |
|-----|--------|----------------|-------------|
| Pen Plotter | Needs verification | Unknown | Static |
| Total Serialism | Needs verification | Unknown | Static |
| Tartanism | Needs verification | Unknown | Static |
| Flow Viz | Needs verification | May have stale API calls | Live data sources |

**Action**: Load each in browser, check console, verify functionality. Flow-viz is the highest risk since it depends on live APIs (Bitcoin mempool, GitHub, Polymarket).

---

## 6. Dead Links

**Known broken patterns**:
- 4 blog posts with broken productSlug references (no CTA rendered)
- 14 products link to Gumroad -- need to verify all Gumroad URLs are live

**Action**: Crawl all Gumroad product URLs to verify they return 200.

---

## Curation Decisions Summary

| Item | Decision | Rationale |
|------|----------|-----------|
| Products with no landing page (14) | Create top 5 landing pages, keep rest as Gumroad-only | SEO value + JJJJound depth |
| Always-On Agent (comingSoon) | Decide: ship or kill | Dead "coming soon" erodes trust |
| Broken productSlug refs (4 posts) | Fix slugs in data.ts OR remove productSlug | Lost CTA revenue |
| Knowledge nav item | Check PostHog analytics | May merge with Blog |
| Draft experiments (2) | Check git activity, archive if stale | Clutter reduction |
| Flow-viz live APIs | Test functionality | Highest breakage risk |
| Blog velocity | Sustainable at 2-3/week, reduce from 4 | Quality > quantity |
