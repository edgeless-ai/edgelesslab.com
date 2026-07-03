---
slug: n8n-workflows-ai-business
title: 5 n8n Workflows That Run My AI Business
description: Visual automation for solo developers. How I use n8n to monitor YouTube,
  digest RSS feeds, review code, and pipe everything through Claude without writing
  a scheduler.
date: '2026-04-06'
tags:
- n8n
- Automation
- Workflows
readTime: 5 min
productSlug: n8n-ai-workflows
isLaunch: true
editorial: true
ctaHook: Importable JSON workflows, env configs, and setup guides for all 5 automations.
---

# 5 n8n Workflows That Run My AI Business

I run an AI tool business solo. That means every recurring task either gets automated or doesn't happen. Cron jobs work for simple scripts, but anything that involves multiple services, conditional logic, and error handling becomes a maintenance burden as raw bash.

n8n fills the gap. It's a self-hosted visual workflow builder. You connect nodes, wire data between them, and deploy. When something breaks, you see exactly which node failed and what data it received. No log archaeology.

Five workflows that actually run my business.

:::flow Core Automation Stack
RSS/YouTube -> n8n Workflows -> Claude Analysis -> Telegram/Email/GitHub
:::

## 1. YouTube Channel Monitor

**Trigger**: Schedule, every 6 hours
**Flow**: RSS feed -> filter new videos -> Claude summarization -> email digest

YouTube doesn't have a great notification system for following specific topics across channels. This workflow monitors 15 channels in my niche (AI tools, developer productivity, generative art), detects new uploads via RSS, sends the titles and descriptions to Claude for relevance scoring, and emails me a digest of anything scoring above 7/10.

The key node: a Claude API call that receives the video title and description, returns a JSON object with a relevance score and a one-sentence summary. The prompt is simple but specific: "Score 1-10 for relevance to an AI developer tools business. Return JSON."

## 2. RSS Intelligence Pipeline

**Trigger**: Schedule, daily at 3pm UTC
**Flow**: 40 RSS feeds -> dedup -> Claude analysis -> Telegram notification

Substack newsletters, tech blogs, and research feeds. The workflow fetches all feeds, deduplicates against a seen-URLs list stored in a database node, sends new articles to Claude in batches of 5 for analysis, and pushes a formatted digest to Telegram.

The analysis prompt asks for three things: a one-line summary, the key takeaway, and whether this relates to any of my products. That last part is where it pays for itself: "This article about MCP server security gaps is directly relevant to your Production MCP Server Kit."

## 3. AI-Assisted Code Review

**Trigger**: GitHub webhook on PR creation
**Flow**: Fetch PR diff -> Claude review -> GitHub comment

When a PR is opened on any of my repos, this workflow fetches the diff, sends it to Claude with a code review prompt, and posts the review as a GitHub comment. The prompt focuses on security issues, performance problems, and API misuse.

This runs on my own repos, so the review is a second pair of eyes, not a replacement for understanding the code. The most useful catches: dependency version issues, missing error handling on external API calls, and accidental inclusion of debug logging.

## 4. Content Embedding Pipeline

**Trigger**: Webhook from content creation workflow
**Flow**: New document -> chunk -> embed -> store in ChromaDB

When I publish a blog post or create a new product description, this workflow receives the text, chunks it into ~500 token segments, generates embeddings via an API, and stores them in ChromaDB. This keeps my knowledge base current without manual indexing.

The chunking strategy matters: split on paragraph boundaries, preserve headers as context, overlap chunks by one sentence. Bad chunking creates bad retrieval. The n8n workflow makes it easy to experiment with chunking parameters without touching code.

## 5. Health Check and Alert

**Trigger**: Schedule, every 6 hours
**Flow**: Ping endpoints -> check responses -> alert on failure

A simple but essential workflow. It hits health endpoints on my VPS services (Hermes agent, Mastra orchestrator, PM2 processes), checks response codes and latency, and sends a Telegram alert if anything is down or slow.

The useful addition: a Claude node that receives the last 24 hours of health data and identifies trends. "Hermes response time has increased 3x over the past 12 hours" is more useful than a binary up/down check.

## Why n8n Instead of Code

I could write all of this as Python scripts with cron. I have. The difference: when a workflow breaks at 3am, n8n shows me the exact node, the exact input, and the exact error. I fix it in the visual editor and redeploy in seconds.

For solo developers, the debugging experience matters more than the abstraction. Code is more flexible. n8n is more debuggable. When you're the only person who fixes things, debuggable wins.

The full workflow JSON files, setup guides, and customization instructions are in the [n8n AI Workflow Templates](/products) on the products page.