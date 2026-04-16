# n8n AI Workflow Templates

Production-ready n8n workflows for AI-powered content pipelines. YouTube monitoring, RSS digestion, newsletter generation, and content processing, all running on Docker with one command.

## What's Inside

```
content/
├── README.md              ← you are here
├── CHANGELOG.md
├── guide.md               ← full setup + customization guide (5,000 words)
├── workflows/
│   ├── youtube-newsletter.json        ← YouTube channel monitor + digest
│   ├── youtube-newsletter-smoke.json  ← smoke test variant
│   ├── rss-ingestion.json             ← RSS feed processing + routing
│   ├── digest-generator.json          ← AI-powered content digest
│   └── style-transfer.json            ← image style transfer pipeline
├── docker/
│   ├── docker-compose.yml   ← n8n + Postgres, ready to run
│   ├── .env.example         ← all required environment variables
│   └── start.sh             ← one-command startup script
```

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- API keys: Google Gemini (free tier works), optionally OpenAI
- 10 minutes

## Quick Start

```bash
# 1. Copy environment template
cp docker/.env.example docker/.env

# 2. Add your API keys to .env
nano docker/.env

# 3. Start n8n
cd docker && bash start.sh

# 4. Open http://localhost:5678
# 5. Import any workflow JSON from workflows/
```

n8n runs at `localhost:5678`. Import a workflow, configure your credentials, activate it.

## The 5 Workflows

| Workflow | Trigger | What It Does |
|----------|---------|-------------|
| YouTube Newsletter | Schedule (daily) | Monitors YouTube channels, extracts transcripts, generates newsletter digest |
| YouTube Smoke Test | Manual | Stripped-down version for testing the pipeline without waiting for schedule |
| RSS Ingestion | Schedule (hourly) | Polls RSS feeds, scores articles by relevance, routes to vault or archive |
| Digest Generator | Webhook | Takes a batch of content items, generates an AI-written digest email |
| Style Transfer | Webhook | Sends images through Gemini for style analysis and transfer |

## Support

Built from infrastructure running 24/7 since March 2026. If a workflow breaks after import, check the troubleshooting section in guide.md.
