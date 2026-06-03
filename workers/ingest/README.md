# Edgeless Ingest Worker

First-party event collector for Edgeless Lab.

## What it does

- Accepts `POST /ingest?e=event_name` from the static site.
- Forwards events to PostHog `/capture/`.
- Keeps the PostHog project API key out of the static bundle.
- Gives `trackPurchase()` and service CTAs a real endpoint once routed.

## Deploy

```bash
npm run worker:ingest:deploy
```

Set the secret before deploy:

```bash
npx wrangler secret put POSTHOG_PROJECT_API_KEY --config workers/ingest/wrangler.toml
```

## Site wiring

The static site reads `NEXT_PUBLIC_INGEST_URL`. Until `edgelesslab.com` is routed
through Cloudflare, set it to:

```text
https://edgeless-ingest.djm-claude-assistant.workers.dev
```

## Domain routing

`edgelesslab.com` is not currently in Cloudflare. To use `https://edgelesslab.com/ingest`,
move DNS to Cloudflare or add an equivalent reverse proxy route to this Worker.
