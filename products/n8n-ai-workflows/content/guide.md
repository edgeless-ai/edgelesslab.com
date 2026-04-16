# n8n AI Workflow Templates: The Full Guide

## Why n8n for AI Pipelines

n8n is a visual workflow automation tool. You connect nodes in a browser UI, each node does one thing (fetch RSS, call an API, write a file), and the data flows through. No code unless you want it.

For AI-powered content pipelines, n8n solves the scheduling and orchestration problem. You do not need to write a cron job, manage a queue, or handle retries. n8n does all of that. You focus on the AI logic: what to fetch, how to score it, what to generate.

The five workflows in this kit are extracted from a production system that has been running since March 2026. They handle YouTube monitoring, RSS ingestion, AI-powered digest generation, newsletter delivery, and image style transfer. Each workflow is a standalone JSON file you can import into n8n and activate.

## Setup

### Docker (Recommended)

The `docker/` directory contains everything you need.

```bash
cd docker
cp .env.example .env
# Edit .env with your API keys
bash start.sh
```

This starts n8n on port 5678 with a Postgres backend for persistence. Your workflow data survives container restarts.

### Manual Install

If you already have n8n running, skip Docker. Import the workflow JSON files directly through the n8n UI: Settings > Import > paste or upload the JSON.

### API Keys

At minimum, you need a Google Gemini API key (free tier at aistudio.google.com/apikey). The digest generation and style transfer workflows use Gemini for content analysis. You can substitute OpenAI by swapping the AI node in the workflow editor.

## Workflow 1: YouTube Newsletter

**File:** `workflows/youtube-newsletter.json`
**Trigger:** Schedule (configurable, default: daily at 8am)
**Purpose:** Monitor YouTube channels, extract new video metadata, generate a newsletter-style digest.

### How it works

The workflow runs on a schedule. It queries the YouTube Data API for recent uploads from your configured channel list. For each new video, it extracts the title, description, thumbnail, and publish date. It batches these into a single payload and sends it to a Gemini node that generates a newsletter-style summary.

The output is an HTML email body. You can route it to an email node (SMTP), a webhook, or write it to a file.

### Configuration

After import, edit these nodes:

1. **Schedule Trigger**: Set your preferred frequency. Daily is a good default.
2. **YouTube API**: Add your YouTube Data API key as a credential. Set the channel IDs in the node parameters.
3. **Gemini AI**: Add your Gemini API key as a credential. The prompt template is editable in the node.
4. **Output**: Connect to your preferred destination (email, webhook, file write).

### Customization

The Gemini prompt controls the newsletter style. The default produces a concise digest with one paragraph per video. Edit the system prompt in the Gemini node to change the tone, length, or format.

To add channels, edit the YouTube API node's channel ID list. To filter by topic, add a Filter node between the YouTube API and the Gemini node.

## Workflow 2: YouTube Smoke Test

**File:** `workflows/youtube-newsletter-smoke.json`
**Trigger:** Manual
**Purpose:** Test the YouTube newsletter pipeline without waiting for the schedule trigger.

This is a stripped-down version of the full newsletter workflow. It fetches from a single hardcoded channel and runs the full pipeline once. Use it to verify your API keys and credentials are working before activating the scheduled version.

## Workflow 3: RSS Ingestion

**File:** `workflows/rss-ingestion.json`
**Trigger:** Schedule (configurable, default: every hour)
**Purpose:** Poll RSS feeds, score articles by relevance, route to different destinations based on score.

### How it works

The workflow polls a list of RSS feed URLs on schedule. For each new item (deduped by URL), it extracts the title, summary, link, and publication date. A scoring function node evaluates each item against keyword lists and source reputation.

Items are routed based on score:
- **Score 7+**: Written to a "knowledge base" output (file, database, or webhook)
- **Score 3-6**: Written to a "review queue" for manual triage
- **Score 0-2**: Archived silently

### Configuration

1. **Schedule Trigger**: Hourly is aggressive. Every 4 hours works for most use cases.
2. **RSS Feed Read**: Edit the URLs list in the node. Add one URL per line.
3. **Scoring Function**: The JavaScript function node contains keyword lists and scoring logic. Edit `TECHNICAL_KEYWORDS` and `SIGNAL_PATTERNS` to match your interests.
4. **Output nodes**: Connect high-score, medium-score, and low-score branches to your destinations.

### Customization

The scoring function is the most important node to customize. The default keywords are tuned for AI/ML, developer tools, and generative art. Replace them with your domain's keywords.

To add a new RSS feed, edit the RSS Feed Read node. No code change needed. To change the score thresholds, edit the Switch node that routes items by score.

## Workflow 4: Digest Generator

**File:** `workflows/digest-generator.json`
**Trigger:** Webhook (receives a POST with content items)
**Purpose:** Take a batch of content items and generate an AI-written digest.

### How it works

This workflow receives a JSON payload via webhook containing an array of content items (title, summary, url, score). It batches them, sends the batch to Gemini with a digest-generation prompt, and returns the generated HTML.

This is designed to be called by other workflows or external scripts. The YouTube Newsletter workflow can call this as a sub-workflow, or you can POST to it from a cron job, a Python script, or any HTTP client.

### Configuration

1. **Webhook**: The URL is generated when you activate the workflow. Copy it from the webhook node.
2. **Gemini AI**: Same credential as other workflows. The prompt template controls digest style.
3. **Response**: The workflow returns the generated HTML in the webhook response.

### Payload format

```json
{
  "items": [
    {
      "title": "Article Title",
      "summary": "Brief description",
      "url": "https://example.com/article",
      "score": 8
    }
  ],
  "digest_title": "Weekly AI Digest"
}
```

## Workflow 5: Style Transfer

**File:** `workflows/style-transfer.json`
**Trigger:** Webhook (receives image URL or base64)
**Purpose:** Send images through Gemini for style analysis and transfer suggestions.

### How it works

The workflow receives an image (URL or base64-encoded) via webhook. It sends the image to Gemini's vision API with a prompt requesting style analysis: dominant colors, composition style, art movement references, and suggested parameter adjustments for reproducing the style programmatically.

This is useful for generative art pipelines where you want to analyze reference images and extract style parameters automatically.

### Configuration

1. **Webhook**: Activate to get the URL.
2. **Gemini AI**: Uses the vision endpoint. Same API key credential.
3. **Response**: Returns JSON with style analysis.

## Troubleshooting

### n8n won't start

Check Docker is running: `docker info`. If the port is taken: edit `docker-compose.yml` to change `5678` to another port.

### Workflow import fails

n8n versions before 1.0 used a different JSON schema. These workflows require n8n 1.0+. The Docker setup uses `n8nio/n8n:latest` which is always current.

### API key errors

Gemini: verify your key at `https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY`. If it returns a model list, the key works.

YouTube: the Data API v3 key needs the "YouTube Data API v3" enabled in Google Cloud Console.

### Workflow runs but produces no output

Check the execution log in n8n (click the workflow, then "Executions" tab). Each node shows its input/output. Find the node that produced empty output and check its configuration.

### Schedule trigger not firing

n8n must be running continuously for schedules to fire. If you stop and restart Docker, missed executions are not replayed. Use `docker compose up -d` and `restart: unless-stopped` (already set in the provided docker-compose.yml).

### Postgres connection errors

The health check in docker-compose.yml ensures n8n waits for Postgres. If you still see connection errors, run `docker compose down -v` to remove volumes and start fresh. Warning: this deletes all n8n data.

## Adapting Workflows

Every workflow is a starting point. The most common adaptations:

**Swap LLM provider**: Replace the Gemini node with an OpenAI, Anthropic, or Ollama node. The prompt stays the same; only the credential and API format change.

**Add persistence**: Connect output nodes to a database (Postgres, SQLite) or file system. n8n has native nodes for most databases.

**Chain workflows**: Use the "Execute Workflow" node to call one workflow from another. The Digest Generator is designed for this pattern.

**Add error handling**: Wrap any node group in an "Error Trigger" node. Route errors to a notification (email, Slack, webhook) so you know when a pipeline breaks.

**Scale**: For high-volume RSS ingestion (100+ feeds), split feeds across multiple RSS Ingestion workflow instances, each with a different feed list. n8n handles concurrent executions natively.
