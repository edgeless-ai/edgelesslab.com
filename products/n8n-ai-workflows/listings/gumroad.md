# Gumroad Listing: n8n AI Workflow Templates

## Short Description
5 production n8n workflows that automate content ingestion, RSS digests, and YouTube monitoring — importable JSON files with Docker setup.

## Full Description

### The pain
n8n is powerful but starting from a blank canvas is slow. The AI integration nodes (LLM chains, vector stores, output parsers) have sharp edges that aren't obvious until you've wired them wrong three times. These workflows skip the discovery phase.

### The credential
These 5 workflows run daily on a personal knowledge infrastructure processing YouTube channels, RSS feeds, and email newsletters. They've ingested 7,000+ articles and 400+ video transcripts over 4 months without manual intervention.

### What's inside
- **5 production workflow JSONs** — import directly into n8n, configure your API keys, and run
- **Docker Compose setup** — one-command n8n + Postgres stack with health checks
- **The full guide** (~5,000 words) — architecture overview, per-workflow breakdown, troubleshooting, customization patterns
- **Environment configuration** — documented .env.example with every required variable

### The 5 workflows
1. **YouTube Channel Monitor** — watches channels for new uploads, fetches transcripts, summarizes with Claude, routes to your knowledge base
2. **RSS Feed Ingestion** — polls RSS feeds, scores articles by relevance, archives low-value items, enriches high-value ones with AI summaries
3. **RSS Digest Generator** — weekly digest email from your RSS pipeline, grouped by topic, with one-line AI summaries
4. **Content Enrichment Pipeline** — takes raw articles/transcripts, extracts key concepts, generates metadata, writes structured markdown
5. **Newsletter Processor** — parses email newsletters, extracts links and summaries, deduplicates against existing content

### Who it's for
- Developers using n8n who want AI-powered automation templates
- Knowledge workers building personal content pipelines
- Anyone who wants to automate the "read, summarize, file" loop

### Who it's NOT for
- People who don't use n8n (these are n8n-specific JSON workflows)
- Enterprises needing SOC2-compliant workflow orchestration

### What you get
- 5 workflow JSON files (drag-and-drop import)
- Docker Compose stack (n8n + Postgres)
- .env.example with all required variables
- Start script (one command to launch)
- 1 comprehensive guide (PDF + Markdown)
- README with < 5 minute setup

## Price
$24

## Permalink
n8n-ai-workflows

## Category
Software & Development

## Cross-sell
- Production MCP Server Kit ($29)
- Digital Product Launch Toolkit ($24)
