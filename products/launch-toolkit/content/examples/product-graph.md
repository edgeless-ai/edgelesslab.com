# Example Product Graph

This example shows how 7 products cross-reference each other to form a self-reinforcing catalog. The theme is "Full-stack TypeScript tooling for solo developers."

## Products

| # | Product | Price | Tier |
|---|---------|-------|------|
| 1 | API Boilerplate Kit | $19 | Entry |
| 2 | TypeScript Config Pack | $19 | Entry |
| 3 | Auth Starter Kit | $24 | Entry |
| 4 | Testing Toolkit | $29 | Mid |
| 5 | Deploy Bundle (AWS) | $29 | Mid |
| 6 | Monitoring & Alerts Pack | $29 | Mid |
| 7 | Production Readiness Kit | $39 | Premium |

## Cross-Sell Map

Each product links to 2-3 others inside its README and listing.

| Product | Links to | Reasoning |
|---------|----------|-----------|
| API Boilerplate Kit | Testing Toolkit, Deploy Bundle | Buyer built the API, next step is testing it and shipping it |
| TypeScript Config Pack | API Boilerplate Kit, Testing Toolkit | Config is foundational, leads naturally to project scaffolding or testing |
| Auth Starter Kit | API Boilerplate Kit, Monitoring & Alerts Pack | Auth pairs with API structure; monitoring catches auth failures |
| Testing Toolkit | API Boilerplate Kit, Deploy Bundle, Production Readiness Kit | Testing is the bridge between building and shipping |
| Deploy Bundle | Monitoring & Alerts Pack, Production Readiness Kit | Post-deploy needs are monitoring and hardening |
| Monitoring & Alerts Pack | Deploy Bundle, Production Readiness Kit | Monitoring pairs with deployment; premium kit is the natural upgrade |
| Production Readiness Kit | Testing Toolkit, Deploy Bundle, Monitoring & Alerts Pack | Premium product references the mid-tier products it builds on |

## Graph Flow

```
Entry ($19)              Mid ($29)                Premium ($39)
-----------              ---------                -------------

API Boilerplate -------> Testing Toolkit -------> Production
    |                        |                    Readiness Kit
    +----------------------> Deploy Bundle -------->  ^
                                 |                    |
TypeScript Config -----> Testing Toolkit              |
                                                      |
Auth Starter ----------> Monitoring Pack ------------>+
                             ^
                             |
                     Deploy Bundle
```

## Entry Points

Most buyers enter through one of the three $19 products. The most common paths:

1. **API-first path:** API Boilerplate ($19) -> Testing Toolkit ($29) -> Deploy Bundle ($29) -> Production Readiness Kit ($39)
2. **Config-first path:** TypeScript Config ($19) -> API Boilerplate ($19) -> Testing Toolkit ($29)
3. **Auth-first path:** Auth Starter ($24) -> API Boilerplate ($19) -> Monitoring Pack ($29)

## Bundle

**The Full Stack Bundle** -- All 7 products.

- Individual sum: $19 + $19 + $24 + $29 + $29 + $29 + $39 = **$188**
- Bundle price: **$129** (31% off)
- Created after: 3 weeks of individual sales data confirmed Testing Toolkit and API Boilerplate as top sellers

Bundle listing leads with the two best sellers and frames the bundle as "everything you need to go from empty repo to production-ready TypeScript API."

## Key Metrics to Track

| Metric | Where to find it | What it tells you |
|--------|-------------------|-------------------|
| Which product has the highest conversion rate | Gumroad analytics per product | Your strongest entry point |
| Which cross-sell link gets the most clicks | UTM params or Gumroad referral data | Which product pairings resonate |
| Bundle vs individual revenue split | Gumroad dashboard | Whether to promote the bundle more or less |
| Refund rate per product | Gumroad dashboard | Which product has an expectation mismatch |

## Lessons from This Graph

1. **Every product has at least 2 outbound links.** No dead ends in the catalog.
2. **The premium product receives links from 3 mid-tier products.** It is the convergence point, not a standalone offering.
3. **Entry products link across tiers, not just upward.** API Boilerplate links to both a $29 product (Testing Toolkit) and another $29 product (Deploy Bundle). Buyers choose their own path.
4. **The bundle was created last**, after the individual products proved demand. Never bundle before you have data.
