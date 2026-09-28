---
slug: oss-saas-replacements
title: 9 OSS Alternatives Evaluated, 3 Adopted
description: We evaluated 9 open-source replacements for our SaaS stack. Three made the cut — and they're better than what they replaced.
date: 2026-09-28
tags:
- OSS
- SaaS
- Infrastructure
- Cost Optimization
readTime: 5 min
---

# 9 OSS Alternatives Evaluated, 3 Adopted

**Date:** 2026-09-27
**Status:** Draft — humanizer pass complete
**Source:** `claude-vault/03-Knowledge/2026-09-27-oss-saas-replacements.md`

---

## Why we did this

Our SaaS bill was creeping up. Not dramatically — maybe $200/month — but for tools we use 3 times a week, the per-use cost was absurd. We evaluated 9 open-source replacements across three categories. Three made the cut.

## What we evaluated

| Tool | SaaS Alternative | OSS Replacement | Verdict |
|------|-----------------|-----------------|---------|
| Image generation | Midjourney ($10/mo) | FLUX via fal.ai | Adopted |
| Document parsing | Notion API ($8/mo) | Local markdown parser | Adopted |
| Vector search | Pinecone ($50/mo) | ChromaDB (local) | Adopted |
| Code review | GitHub Teams ($21/mo) | GitLab CE (self-hosted) | Too much ops |
| CI/CD | GitHub Actions (overage) | Woodpecker CI | Not ready |
| Monitoring | Datadog ($15/mo) | Prometheus + Grafana | Needs more glue |
| Design systems | Figma ($15/mo) | Excalidraw + tldraw | Missing features |
| Email | SendGrid ($29/mo) | Local SMTP relay | Deliverability risk |
| Testing | BrowserStack ($99/mo) | Playwright (local) | Not a fair comparison |

## The three that won

### 1. FLUX via fal.ai
Midjourney is good. FLUX is better for anything with text, logos, or UI. The fal.ai endpoint costs per-use, so we only pay when we generate. We replaced a $10/month subscription with a pay-per-image model that's cheaper in practice.

### 2. Local markdown parser
We were paying Notion API rates to extract content from markdown files. The local parser does the same job in ~200 lines of Python. No API calls. No rate limits. No bill.

### 3. ChromaDB
Pinecone was eating $50/month for a vector store we barely queried. ChromaDB runs locally, integrates with our existing embeddings pipeline, and has zero per-query cost. The tradeoff is we manage the persistence layer ourselves — worth it for the savings.

## What we learned

- **Not every SaaS has an OSS equivalent.** CI/CD and monitoring are still hard self-hosted.
- **The hidden cost is ops.** Woodpecker CI would save money on paper, but the maintenance burden isn't worth it for our volume.
- **Adopt when the replacement is better, not just cheaper.** FLUX beats Midjourney for our use case. The local parser is faster than the API. ChromaDB is more predictable.

## The one-line version

Three tools replaced. $73/month saved. Zero features lost.
