---
slug: shipped-7-products-in-7-days
title: I Shipped 7 Digital Products in 7 Days. The Exact Process.
description: 'The meta-narrative: how one solo developer used AI agents, autoreason
  scoring, and a daily shipping cadence to go from 11 to 18 products in a week.'
date: '2026-04-09'
tags:
- Solo Dev
- Products
- Process
readTime: 6 min
productSlug: launch-toolkit
isLaunch: true
editorial: true
ctaHook: The exact templates, pricing model, and launch checklist from this 7-day
  sprint.
---

# I Shipped 7 Digital Products in 7 Days. The Exact Process.

One week ago, Edgeless Lab had 11 products on Gumroad. Today it has 18. Each product has a companion blog post. Each was built from existing infrastructure, not invented from scratch. This is the process.

## The Pipeline

Three research agents ran in parallel: one searched the market for gaps, one brainstormed from existing expertise, one validated against real demand data. Between them they generated 70 product ideas.

An adversarial scoring process narrowed 70 ideas to a ranked list of 50. Five simulated judges scored each product on six dimensions: demand signal, buildability, leverage (does it use infrastructure we already have?), differentiation, revenue potential, and content synergy.

The top 7 became the week's shipping list. One product per day, each with a blog post that teaches 20% of the product's value.

:::flow Daily Shipping Pipeline
Ideation (70) -> Scoring (50) -> Top 7 -> Build -> Blog Post -> Deploy -> Gumroad
:::

:::metric
70 | Ideas generated
50 | Scored & ranked
7 | Shipped in 7 days
18 | Total products live
:::

## The Daily Rhythm

Morning: build the product. Every product in this batch is a digital download, not software. Guides, templates, frameworks, reference materials. The content exists in my head and my infrastructure already. The build step is extracting, organizing, and packaging it.

Afternoon: write the blog post. Each post follows a formula: open with a real problem or incident, explain the insight, give readers something actionable, link to the product for the complete version. The blog post is simultaneously content marketing, SEO, and proof that the product author knows what they're talking about.

Evening: update the website, deploy, push to Gumroad. The website is a Next.js static export to GitHub Pages. Adding a product means adding an object to a TypeScript array. Adding a blog post means adding another object to another array. Build, copy, push. Under 5 minutes.

## What Worked

**Building from existing infrastructure.** Every product leverages something that already runs in production. The agent safety guide exists because an agent actually lost $252. The MCP server kit exists because we actually run 4+ MCP servers. The generative art kit exists because we've actually run 105+ experiments. Production experience is the moat. Nobody can replicate it from docs alone.

**One product per day, no exceptions.** Scope expands to fill time. A week per product would produce a marginally better product. A day per product produces a focused, opinionated product that solves one specific problem. The constraint is the feature.

**Blog as distribution.** No paid advertising. No social media campaigns. Each blog post targets a specific search query: "MCP server production," "multi-agent orchestration," "generative art pen plotter." The posts are genuinely useful independent of the product, which means people share them. Shared content outperforms ads for developer tools every time.

:::bar-chart Pricing Tiers
Flagship blueprints | $39
Comprehensive guides | $29
Workflow kits | $24
Deep dives | $19
Starter templates | $14
Reference materials | $9
:::

**Pricing by complexity.** Each tier has a clear value proposition. Customers self-select into the tier that matches their need.

## What I'd Change

**Start with the flagship.** I shipped the $19 products first and the $39 flagship on day 5. If I did it again, I'd ship the most expensive product first. It anchors the perceived value of everything that follows.

**Fewer "New" badges.** I had to rotate badges mid-week because four products with "New" made none of them stand out. Two at most.

**More cross-linking.** Each product description should explicitly reference its natural companion. The Hooks Library ($14) should say "For advanced patterns, see Hooks Deep Dive ($19)." The MCP Starter Kit ($24) should say "Ready for production? See the Production MCP Kit ($29)." I added some of this but not enough.

## The Numbers

18 products live. 14 blog posts. Product prices from Free to $39. The catalog spans AI agents, developer tools, automation workflows, and generative art. Total catalog value (if someone bought everything): $423.

The important metric isn't week-one revenue. It's surface area. Each product is an entry point. Each blog post is a search result. Each has cross-links to related products. The compounding happens when someone finds one post, buys one product, and discovers the rest exist.

## The Process as Product

The last product of the week is the [Digital Product Launch Toolkit](/products): the process itself, packaged. The exact Gumroad templates, pricing logic, launch checklist, and daily cadence documented in a format someone else can use.

This is the most meta product I've shipped: selling the process of selling products. But it's also the most honest. The process works. The results are visible on this website. The proof is the catalog itself.

Everything on the [products page](/products).