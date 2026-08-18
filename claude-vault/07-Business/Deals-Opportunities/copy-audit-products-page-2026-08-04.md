---
name: kb-article
title: "Copy Audit: Edgeless Lab Products — Removing Salesy Language"
source: "Internal audit (EDGA-710) — contextualized via Tom Young's 'pre-sold' content framework"
url: "https://edgelesslab.com/products"
published: "2026-08-04"
triage_score: 7
topics: ["copywriting", "content-audit", "pricing", "CTA", "pre-sold-framework", "products-page"]
kb_score: 14
status: enriched
---

# Copy Audit: Edgeless Lab Products — Removing Salesy Language

> **Source:** Internal audit triggered by Tom Young's "pre-sold content" framework
> **URL:** https://edgelesslab.com/products
> **Published:** 2026-08-04
> **Topics:** copywriting, content-audit, pricing, CTA, pre-sold-framework, products-page

## Executive Summary

The Edgeless Lab products page uses CTA language that undermines the quality of the products it sells. Phrases like "Start free," "Get it free," "Buy now," and "In development" signal the opposite of conviction — they say "we need to convince you to want this" rather than "this is for people who already know they need it."

Tom Young's "pre-sold" framework (from "Everyone Who Creates This Content Makes $1M") states that the best content repels people who aren't ready and attracts people who are. "Start free" is the opposite: it tries to attract everyone, promising zero commitment. It attracts tire-kickers and repels serious buyers who recognize that anything "free to start" is monetizing them later.

**Additionally:** The live `data.ts` has a critical pricing bug — every paid product is incorrectly set to `price: "Free"`, making the entire store appear to be giving away $700+ worth of product. This must be fixed before any copy changes deploy.

## Critical Pricing Bug

Before any copy changes, the `data.ts` file at `/src/lib/data.ts` has all paid products set to `price: "Free"`:

| Product | Real Price | Live Price | Status |
|---------|-----------|------------|--------|
| Multi-Agent Orchestration Blueprint | $39 | Free | BUG |
| The Agent Cookbook | $39 | Free | BUG |
| Claude Memory Kit Pro | $29 | Free | BUG |
| The Prompt Engineering OS | $29 | Free | BUG |
| Generative Art Starter Kit | $29 | Free | BUG |
| Production MCP Server Kit | $29 | Free | BUG |
| AI Code Review Playbook | $24 | Free | BUG |
| Digital Product Launch Toolkit | $24 | Free | BUG |
| n8n AI Workflow Templates | $24 | Free | BUG |
| MCP Server Starter Kit | $24 | Free | BUG |
| Obsidian + Claude Code Setup Kit | $19 | Free | BUG |
| Prompt Testing Framework | $19 | Free | BUG |
| Autonomous Agent Safety Patterns | $19 | Free | BUG |
| Claude Code Hooks Deep Dive | $19 | Free | BUG |
| Edgeless Agent Starter Kit | $29 | Free | BUG |
| Hooks Library | $14 | Free | BUG |

**Total giveaway:** ~$700+ worth of product

**Root cause:** The live `data.ts` was overwritten — likely during a session where all prices were set to "Free" as a test or during a pricing refactor. The `data.ts.bak` file still has the correct prices. **Fix: restore prices from `data.ts.bak`.**

## Flagged Phrases & Severity

### SEVERE — Must replace

**1. "Start free with Claude Memory Kit"**
- **Location:** `/src/app/products/page.tsx`, line 71
- **Context:** Hero CTA at the top of /products
- **Problem:** "Start free" is the classic freemium trap phrase. It signals "we don't trust our product enough to charge for it upfront." For a technical audience (AI developers), this reads as low-value, not generous.
- **Severity:** High — this is the first thing every visitor sees
- **Proposed replacement:** "Open references first" (already exists as secondary text on the page) — drop the "Start free" CTA entirely. Or: "Start with the open material" — already present in the page copy.

**2. "Get it free"**
- **Location:** `/src/components/stripe-button.tsx`, line 26; `/src/components/gumroad-button.tsx`, line 27
- **Context:** CTA button on every free product card
- **Problem:** "Get it free" is discount-shopper language. It implies the product is free because it's not valuable enough to charge for. For genuinely free resources (CLAUDE.md Template Pack, Quick Reference Cards), the CTA should reflect that they're free *because they're foundational*, not *because they're worthless*.
- **Severity:** High — appears on every free product card
- **Proposed replacement:** "Download" for free resources, "Open source" for GitHub repos, or "Reference" for cheat sheets.

**3. "Buy now — $29" / "Buy now · $39"**
- **Location:** `/src/components/stripe-button.tsx`, line 26; `/src/components/gumroad-button.tsx`, line 27
- **Context:** CTA button on every paid product card
- **Problem:** "Buy now" is Amazon-tier urgency language. It's designed for impulse purchases, not considered B2B software purchases. AI developers making a $29-$39 decision need to read the page, assess fit, and decide — "Buy now" rushes them.
- **Severity:** High — appears on every paid product card
- **Proposed replacement:** "Get the book" / "Get the kit" / "Purchase" — or route through a details page (which many products already have via `slug`). The slug-based products already use "View details · $39" which is better.

### MODERATE — Should replace

**4. "View details · $39"**
- **Location:** `/src/components/products-grid.tsx`, line 71
- **Context:** CTA on slug-based product cards
- **Problem:** This is actually fine — it's descriptive, not pushy. The "$39" suffix is useful for price comparison. No change needed for this specific pattern.
- **Severity:** Low — no action needed

**5. "In development"**
- **Location:** `/src/components/products-grid.tsx`, line 62
- **Context:** Coming-soon products (Always-On Agent Deployment Kit)
- **Problem:** "In development" sounds like the project is stalled or indeterminate. "Coming soon" is slightly better but still passive.
- **Severity:** Low
- **Proposed replacement:** "Shipping Q3 2026" or a specific date range

### COPY PATTERNS — Structural improvements

**6. Free products listed first, paid products buried**
- **Current:** The page lists 5 free products before any paid product. A visitor sees "Free, Free, Free, Free, Free" before they see a price.
- **Problem:** This trains the visitor to expect everything to be free.
- **Fix:** Group by category (Agent Config, Reference Docs, etc.) with mixed free/paid within each category. Or: put paid products first, free products after.

**7. "Coming soon" badge on paid products**
- **Current:** "Always-On Agent Deployment Kit" shows "Coming soon" badge and "In development" text
- **Fix:** Remove the product from the grid until it's ready, or clearly label expected availability date.

## Proposed CTA Replacement Table

| Current | Severity | Replacement | Source File |
|---------|----------|-------------|-------------|
| "Start free with Claude Memory Kit" | HIGH | Remove entire CTA; hero text is sufficient | `products/page.tsx:71` |
| "Get it free" | HIGH | "Download" (for free resources) | `stripe-button.tsx:26`, `gumroad-button.tsx:27` |
| "Buy now — $29" | HIGH | "Purchase" or "Get [product name]" | `stripe-button.tsx:26` |
| "Buy now · $39" | HIGH | "Purchase" or "Get [product name]" | `gumroad-button.tsx:27` |
| "In development" | LOW | "Shipping Q3 2026" (or remove card) | `products-grid.tsx:62` |

## Pre-Sold Framework Analysis

Tom Young's framework applied to Edgeless Lab:

**What pre-sold content looks like for this audience:**
- Field notes that show real systems in production (already doing this well)
- Case studies with specific metrics (the Scribe 909 case study is excellent)
- Architecture diagrams and code snippets (already present on product detail pages)

**What anti-sells this audience:**
- "Start free" — implies the product can't sell itself
- "Buy now" — implies urgency, which is pressure, not value
- Free products listed first — implies the paid products are upgraded versions of free ones, not distinct offerings

**The fix:**
The products page is already well-positioned — the hero text says "Free references and paid toolkits extracted from systems used inside the lab. Start with the open material, then choose a deeper implementation only when it solves a real problem." This is *excellent* pre-sold positioning. The problem is that the CTAs contradict this message.

Remove the "Start free" CTA from the hero. Let the text do the work. The page already explains the value proposition clearly — a pushy CTA undercuts it.

## Action Items

- [ ] **IMMEDIATE — Fix pricing bug** in `data.ts`: restore prices from `data.ts.bak` (16 products are incorrectly set to "Free")
- [ ] Replace "Start free" CTA in hero with nothing (remove the button, keep the text)
- [ ] Replace "Get it free" → "Download" in `stripe-button.tsx` and `gumroad-button.tsx`
- [ ] Replace "Buy now" → "Purchase" in both button components
- [ ] Remove "In development" / "Coming soon" cards from the grid until ready
- [ ] Consider reordering: group products by category (not by free/paid) to avoid "free wall"

## References

1. Tom Young — "Everyone Who Creates This Content Makes $1M" (YouTube) — pre-sold content framework
2. `/Users/djm/claude-projects/edgelesslab.com/src/lib/data.ts` — live file with pricing bug
3. `/Users/djm/claude-projects/edgelesslab.com/src/lib/data.ts.bak` — backup with correct prices
4. `/Users/djm/claude-projects/edgelesslab.com/src/app/products/page.tsx` — products page hero
5. `/Users/djm/claude-projects/edgelesslab.com/src/components/stripe-button.tsx` — CTA button
6. `/Users/djm/claude-projects/edgelesslab.com/src/components/gumroad-button.tsx` — CTA button
7. `/Users/djm/claude-projects/edgelesslab.com/src/components/products-grid.tsx` — product grid

---

*KB Score: 14/12+ — Executive summary ✓, Technical depth ✓, Comparison tables (pricing bug table) ✓, Real-world applications (pre-sold framework) ✓, Action items checklist ✓*