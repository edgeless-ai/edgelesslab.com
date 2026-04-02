# PreText Ultrathink Plan -- edgelesslab.com

> Council synthesis from Messaging Strategist, Conversion/Editorial Critic, UX/IA Critic, and Front-End Systems Architect. Overrides Codex's "defer" recommendation per CEO direction: PreText is a frontier signifier, not optional plumbing.

---

## Executive Summary

The council unanimously agrees on two things:

1. **The site has structural problems that PreText alone won't fix.** The homepage has 8 sections when it needs 5. Products are buried at position 6. Three sections (Featured, Infrastructure, How it Works) say the same thing in different card formats. The messaging hierarchy is flat.

2. **PreText is the right tool for 3 specific signature moments** -- the homepage hero obstacle flow, card height normalization, and editorial pull-quotes on the About page. These are moments where CSS genuinely cannot deliver what PreText offers, and where the technical sophistication signals the lab's identity.

The plan below addresses both: structural fixes first (messaging, IA, conversion), then PreText integration at the points of maximum impact.

---

## Part 1: Structural Fixes (No PreText Required)

### 1.1 Replace the Hero Headline

**Problem:** "Tools for AI-native developers" describes a category, not a value. "AI-native" is VC-speak. "Tools" flattens the range (agents, art, orchestration, knowledge systems) into commodity territory.

**Recommended alternatives (pick one):**

**Option A -- Statement of practice:**
```
Ship agents,
not slide decks.
```

**Option B -- Identity claim:**
```
One person.
Full stack.
Always on.
```

**Option C -- Domain range:**
```
Agents, art,
and infrastructure
that ships.
```

**Subtitle rewrite (for any option):**
```
Autonomous trading agents. Knowledge pipelines. Generative art for pen plotters.
Everything open source. Everything running in production.
```

### 1.2 Cut 3 Homepage Sections

| Cut | Reason | Where it goes |
|-----|--------|---------------|
| Infrastructure (Capabilities) | Redundant with Featured -- same code snippets in different cards | Move to /about as "How I build" |
| How it Works (StackFlow) | Internal documentation, not persuasion | Move to /about as architecture footnote |
| Subscribe CTA | "Follow on GitHub" is a dead-end close; GitHub already appears 2 other times | Absorb into footer |

**New homepage (5 sections):**
1. Hero
2. Featured Work (merge Featured Projects + Lab experiments, 4-5 items, mixed)
3. Products (ALL 4 products, not just the free one)
4. About blurb
5. Footer

### 1.3 Fix CTA Hierarchy

**Current problem:** 28 clickable CTAs on the homepage. "View Products" in the hero but products are 6 sections away. "Browse projects" duplicates "All projects" link two scrolls below. GitHub appears 3 times.

**Fix:**
- Hero primary: "Browse the work" -> /projects (show capability first)
- Hero secondary: "Get the free memory kit" -> GitHub repo (highest-converting free offer)
- Hero tertiary: "GitHub" (keep)
- Kill "All projects" link in Featured header (redundant with hero)
- Products section: each card is its own CTA to Gumroad/GitHub
- Footer absorbs the closing GitHub CTA

### 1.4 Fix Product Visibility

**Current:** Homepage shows 1 product card (the free Claude Memory Kit). The $29 products are invisible until /products.

**Fix:** Show all 4 products on homepage. Flagship ($29 Memory Kit Pro) gets visual emphasis -- either larger card or "Recommended" badge. Free kit gets "Start here" label. This moves the revenue opportunity from scroll position 6 to position 3.

### 1.5 Break the Monospace Monotony

Every section header is 12px uppercase mono. This creates a flat reading experience where every section reads as equal weight.

**Fix:** Add editorial subheads below section labels:

| Section | Subhead |
|---------|---------|
| Featured Work | "Production systems, not prototypes." |
| Products | "Built from the systems above. Ready to use today." |
| About | (keep as-is -- the large pull-quote treatment is the subhead) |

### 1.6 Merge Projects + Lab Navigation

**Current:** Projects and Lab are separate nav items and separate pages. But they share items (Pen Plotter Art appears in both). First-time visitors don't understand the distinction.

**Fix:** Single "Work" page with category filters (Agents, Infrastructure, Generative, Data). Keep `/projects/[slug]` and `/lab/[slug]` as separate detail templates, but unify the index. Nav becomes: **Work | Products | Blog | About | GitHub**

---

## Part 2: PreText Integration

### 2.1 Technical Foundation

**Package:** `@chenglou/pretext` v0.0.3 (15KB gzipped, zero dependencies)
**Font:** Geist (named font, compatible with PreText -- no system-ui issues on macOS)
**SSR strategy:** Dynamic import, renders plain text as SSR fallback, PreText takes over after hydration
**Performance:** Sub-microsecond per `layout()` call. `prepare()` is ~1ms for short strings. Total bundle impact is less than a hero image.

**New files to create:**
- `src/hooks/use-pretext.ts` -- hook handling font readiness + lazy loading
- `src/components/ui/pretext-block.tsx` -- reusable measured-text component
- `src/lib/pretext-fonts.ts` -- font constants + loading helpers

### 2.2 Integration Point 1: Homepage Hero Obstacle Flow (THE SIGNATURE MOMENT)

**What:** The hero subtitle text reflows live around the animated DotBackground orbs. As the indigo and green orbs pulse and scale, the text parts around them. Nobody else on the web does this.

**Why this is the PreText play:** CSS cannot flow text around arbitrarily positioned, animated elements. CSS Shapes only works with floats and static shapes. PreText's `layoutNextLine()` gives each line a different maxWidth based on obstacle positions -- this is exactly the obstacle-aware layout that makes the library unique.

**Implementation approach:**
1. Calculate orb positions mathematically from CSS keyframe cycle (10s indigo, 12s green)
2. Pass orb bounding rects as obstacles to `<PreTextBlock>`
3. Text reflows on each animation frame (using `requestAnimationFrame` + the math, not DOM measurement)
4. SSR fallback: plain subtitle text without obstacle flow (orb animation also only starts after hydration)

**Files modified:**
- `src/components/home-client.tsx` (HeroSection)
- `src/components/ui/dot-background.tsx` (expose orb position calculation)

**Effort:** 3-4 hours

### 2.3 Integration Point 2: Card Height Normalization

**What:** Use `layout()` to predict exact pixel heights for card description text, then set all cards in a grid to `max(predictedHeights)`. Eliminates the current `min-h-[120px]`/`min-h-[80px]` hacks.

**Why:** The featured grid has a spanning card (Pamela, 2x2) alongside two smaller cards. The smaller cards rarely align horizontally because their title + description heights vary. On the products page, the 4th card (Excalidraw Kit) sits orphaned in a second row. Normalized heights fix both issues.

**Files modified:**
- `src/components/home-client.tsx` (FeaturedGrid)
- `src/app/products/page.tsx` (product cards)

**Effort:** 1-2 hours

### 2.4 Integration Point 3: About Page Editorial Pull-Quotes

**What:** The Philosophy section on /about has strong sentences buried in paragraphs ("Most AI companies are building demos. This lab builds infrastructure that runs 24/7."). Pull these out as large-type accent blocks with text flowing around them.

**Why:** The About page is currently a flat text stack. It's the page that sells the person behind the lab -- it should feel editorial, like a magazine profile opener, not like a README. Text flowing around a pull-quote or workspace image breaks the monotony and demonstrates the lab's design sophistication.

**Files modified:**
- `src/components/about-client.tsx` (Philosophy section)

**Effort:** 2-3 hours

### 2.5 Integration Point 4: Blog Knuth-Plass Justification (Future)

**What:** Mathematically optimal line breaks for blog prose, eliminating rivers of whitespace.

**Why:** The `prose-custom` class at 15px/1.8 line-height within a ~680px container is a perfect candidate for justified text. But this requires building a Knuth-Plass wrapper on top of PreText's `walkLineRanges` -- higher effort than the other integration points.

**Priority:** After hero and cards are proven. Phase 2.

### 2.6 Where NOT to Use PreText

| Element | Why CSS is sufficient |
|---------|----------------------|
| H1 headline | Hard `<br>` breaks, no reflow needed. AnimatedText stagger is the effect. |
| Section headers | Single-line, small text. `text-wrap: balance` is fine. |
| Nav and footer | Static, short text. |
| Tag pills | `flex-wrap` works correctly. |
| Code blocks | Pre-formatted, author-controlled line breaks. |
| "Shipping daily" chip | Single-line decorative micro-copy. |

---

## Part 3: Implementation Phases

### Phase 0: Baseline CSS (no PreText, immediate)
- Add `text-wrap: balance` to all `<h1>`, `<h2>` elements
- Add `text-wrap: pretty` to all body/description text
- Add `line-clamp` to card descriptions where needed
- These are free wins that improve the site today

### Phase 1: Homepage Hero with PreText (the brand statement)
- Install `@chenglou/pretext`
- Create `usePreText` hook + `PreTextBlock` component
- Implement obstacle-aware subtitle in HeroSection
- Ship and verify across breakpoints

### Phase 2: Card + Editorial Improvements
- Card height normalization for Featured and Products grids
- About page pull-quote editorial layout
- Structural fixes from Part 1 (section cuts, CTA hierarchy, product visibility)

### Phase 3: Blog + Experimental
- Knuth-Plass justification for blog prose
- Lab page masonry with PreText height prediction
- Inline chips in flowing text (if warranted)

---

## Part 4: Council Members and Contributions

| Role | Contribution |
|------|-------------|
| **Messaging Strategist** | Headline audit, copy rewrites, narrative flow analysis, section transition copy |
| **Conversion/Editorial Critic** | CTA mapping (28 CTAs identified), information scent analysis, section pacing, product visibility fix |
| **UX/IA Critic** | Navigation restructure, vertical attention mapping, responsive IA, detail page improvements, reading rhythm analysis |
| **Front-End Systems Architect** | PreText component architecture, integration point design, font loading strategy, SSR boundary plan, performance budget |
| **Codex (prior pass)** | Recommended CSS-first approach -- overridden by CEO direction but baseline CSS recommendations (Phase 0) incorporated |

---

## Top 5 Recommended Changes (Priority Order)

1. **Cut 3 homepage sections** (Infrastructure, How it Works, Subscribe) -- reduces 8 sections to 5, fixes the attention plateau
2. **Show all 4 products on homepage** -- moves revenue from scroll position 6 to position 3
3. **Ship the PreText hero obstacle flow** -- the signature moment that signals "this lab is at the frontier"
4. **Replace the headline** -- "Tools for AI-native developers" is generic; any of the 3 alternatives is stronger
5. **Merge Projects + Lab into Work** -- eliminates a false distinction that confuses first-time visitors

---

*Generated 2026-03-31 by council of 4 subagents + synthesis. Overrides Codex "defer" recommendation per CEO direction.*
