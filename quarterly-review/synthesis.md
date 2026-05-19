# Pass 6: Synthesis & Roadmap ("The 3% Mutation")

**Date**: 2026-05-18
**Quarter**: Q2 2026
**Auditor**: Claude Code quarterly review

---

## Triage: All Findings

### FIX NOW (broken/drifted -- no design decision needed)

| # | Finding | Source | Effort | Impact |
|---|---------|--------|--------|--------|
| F1 | **4 blog posts reference broken productSlugs** -- companion CTAs don't render | Pass 2 | 15min | Lost engagement on every view |
| F2 | **playwright in production dependencies** -- 200MB shouldn't ship | Pass 4 | 2min | Cleaner dep tree |
| F3 | **Add draft status to BlogPost interface** -- filter drafts from rendering | Pass 5 | 15min | Enables staging content |
| F4 | **Add blog link validation** -- pre-commit check for internal links | Pass 5 | 30min | Prevents broken links shipping |
| F5 | **Convert product-cover images to WebP** | Pass 4 | 30min | 30-50% image size reduction |
| F6 | **Add width/height to img tags** | Pass 4 | 15min | Prevents CLS layout shifts |

### DESIGN DECISION (requires aesthetic judgment -- batch into focused session)

| # | Finding | Source | Effort | Notes |
|---|---------|--------|--------|-------|
| D1 | **Align Tailwind borderRadius to CSS tokens** -- 139 instances disconnected | Pass 1, 3 | 1hr | One config change + sweep. Biggest visual coherence win. |
| D2 | **Extract hardcoded rgba to CSS tokens** -- 20+ files | Pass 1 | 1.5hr | Add overlay/opacity token system |
| D3 | **Create typography token scale** -- 86 arbitrary text-[Npx] values | Pass 3 | 1hr | Define --text-label, --text-caption, --text-body-sm |
| D4 | **Replace hardcoded white Tailwind classes** -- 47 instances | Pass 3 | 1hr | hover:text-white -> hover:text-[var(--text-primary)] |
| D5 | **Complete Phase 3 TUI treatment** -- hero textures, card borders, nav/footer chrome | Pass 1 | 2hr | Finishes the Nous aesthetic |
| D6 | **Extract blog posts to markdown files** -- currently 3,131 lines inline | Pass 5 | 3hr | Maintainability, tooling, CMS migration path |
| D7 | **Product catalog curation** -- 21 products, only 7 with landing pages | Pass 2 | 2hr | JJJJound: fewer, stronger, deeper |
| D8 | **Flow-viz design alignment** -- dark tech aesthetic doesn't match other field notes | Pass 1 | 1hr | Decide: warm paper or dark lab |

### BACKLOG (next quarter)

| # | Finding | Source | Notes |
|---|---------|--------|-------|
| B1 | Require PR for blog changes (branch protection) | Pass 5 | Needs GitHub admin setup |
| B2 | Build content authoring skill (Scribe pipeline) | Pass 5 | The content engine that doesn't exist yet |
| B3 | Editorial calendar via Paperclip | Pass 5 | Plan posts ahead |
| B4 | Staging preview environment | Pass 5 | Preview before publish |
| B5 | Scheduled publishing (publishedAt field) | Pass 5 | Pre-write and auto-publish |
| B6 | Evaluate Knowledge vs Blog nav consolidation | Pass 2 | Check PostHog analytics |
| B7 | Audit draft experiments for staleness | Pass 2 | Archive if >60 days no commits |
| B8 | PostHog Web Vitals dashboard review | Pass 4 | Establish CWV baselines |
| B9 | Run Lighthouse on 5 key pages | Pass 4 | Measure against 95+ target |

---

## The 3% Brief: Q2 2026

### The One Mutation: **Token System Activation**

The single most impactful change this quarter is **making the design token system actually work**. The tokens exist in globals.css. The components ignore them. Every visual audit finding traces back to this disconnect.

**What changes**:
1. Wire CSS variables into Tailwind's theme (border-radius, add typography scale)
2. Replace 139 unaligned border-radius instances
3. Replace 86 arbitrary font-size instances
4. Replace 47 hardcoded white instances
5. Extract rgba patterns into overlay/opacity tokens

**What this achieves**:
- The site becomes **one system** instead of one system's intention
- Future changes propagate through tokens instead of find-and-replace
- Phase 3 TUI treatment becomes trivial to apply once tokens are wired

**What this DOESN'T change** (the 97%):
- No layout changes
- No new pages
- No content restructuring
- No navigation changes
- Same Nous aesthetic, same dark lab feel
- Generative hero, ASCII art, field notes -- all untouched

**Abloh framing**: "The token system was always the design. We just connected the wires."

---

## Execution Order

If executing this quarter, work in this sequence:

```
Week 1: Fix Now items (F1-F6)                    ~2 hours
Week 2: Token system activation (D1-D4)           ~4.5 hours
Week 3: Phase 3 TUI completion (D5)               ~2 hours
Week 4: Blog extraction + catalog curation (D6-D7) ~5 hours
```

Total estimated: ~13.5 hours of focused work across 4 sessions.

---

## Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| CSS token adoption (border-radius) | 0/139 (0%) | 139/139 (100%) | Grep rounded-* vs var(--radius-*) |
| Hardcoded colors outside globals.css | 60+ instances | <10 (canvas/functional only) | Grep rgba/hex in .tsx files |
| Typography arbitrary values | 86 instances | 0 | Grep text-\[.*px\] |
| Blog posts with broken CTAs | 4 | 0 | Check productSlug resolution |
| Lighthouse Performance | Unknown | 95+ | PageSpeed Insights |
| Lighthouse Accessibility | Unknown | 95+ | PageSpeed Insights |
| Blog post file size | 3,131 lines (1 file) | ~100 lines index + individual .md files | wc -l |

---

## What "Done" Looks Like

This quarterly review is complete when:
- [ ] All Fix Now items (F1-F6) are resolved
- [ ] Token system is activated (D1-D4) -- every visual property traces to a token
- [ ] Phase 3 TUI treatment is applied (D5)
- [ ] Lighthouse scores measured and at 95+ (or remediation plan if not)
- [ ] This `quarterly-review/` directory is committed to the repo
- [ ] Paperclip issues created for all remaining Design Decision and Backlog items

---

*Next quarterly review: August 2026. Focus areas: content pipeline automation (B1-B5), product catalog depth (D7), Lighthouse optimization.*
