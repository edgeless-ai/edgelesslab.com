# Edgeless Cloudflare + PostHog Handoff

**Date:** 2026-06-03  
**Scope:** finish analytics, first-party ingest, and Cloudflare routing for Edgeless Lab  
**Audience:** the next Claude session, ideally one with Chrome access

## Goal

Make Edgeless analytics actually work in production, with a first-party ingest path and a clean path to route `edgelesslab.com/ingest` through Cloudflare when the zone is available.

This is the current target:

1. PostHog should initialize on the live site when a project key exists.
2. CTA and purchase-intent events should land on a first-party ingest endpoint.
3. The ingest endpoint should forward to PostHog.
4. If possible, route `edgelesslab.com/ingest` to that worker.
5. Use Chrome and Cloudflare where that is the shortest reliable path.

## What Is Already Done

### Site wiring

- The homepage and service pages now have analytics hooks in the code.
- The service page for private AI systems exists at:
  - `/services/private-ai-systems/`
- Service CTAs now emit intent events.
- `trackPurchase()` now uses `NEXT_PUBLIC_INGEST_URL` instead of hardcoding `/ingest`.

### Cloudflare worker

- A Cloudflare Worker exists in:
  - [workers/ingest/worker.js](/Users/djm/claude-projects/edgeless-website/workers/ingest/worker.js)
- The worker is deployed and healthy at:
  - `https://edgeless-ingest.djm-claude-assistant.workers.dev/health`
- The worker currently forwards events to PostHog if a project API key secret is set.

### GitHub Actions

- The Pages deploy workflow now passes these build-time variables:
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`
  - `NEXT_PUBLIC_INGEST_URL`
- The repo has GitHub variables set for:
  - `NEXT_PUBLIC_INGEST_URL`
  - `NEXT_PUBLIC_POSTHOG_HOST`

### Commit state

- Most recent local commit for this work:
  - `f8bcb2827 Wire PostHog ingest worker`

## Current Reality Check

The important part: this is not fully finished yet.

- The Cloudflare worker is deployed.
- The Edgeless site is still hosted on GitHub Pages.
- `edgelesslab.com` is not currently a Cloudflare zone.
- The Cloudflare API token used here does not have permission to create a zone.
- The browser session I have here is not signed into Cloudflare.
- No PostHog project API key is configured yet.
- The site can send event beacons to the worker URL, but PostHog forwarding will not work until that secret exists.

## Open Questions

These are the questions the next Claude should answer in Chrome or in the relevant dashboard:

1. Is the Codex Chrome extension actually connected, or still disconnected?
2. Is the Cloudflare dashboard logged in on the browser session that has access to `ae4279904a9110de9f5bd770c41718da`?
3. Does that Cloudflare account have permission to add a zone for `edgelesslab.com`?
4. Can `edgelesslab.com` be added as a full zone in Cloudflare from the dashboard?
5. Can the nameservers for `edgelesslab.com` be moved from Google Domains to Cloudflare?
6. Is there already a PostHog project API key available anywhere safe to use?
7. If there is no zone move yet, should the site keep using the worker.dev ingest URL for now?
8. Is the intent to proxy only `/ingest`, or also put the whole site behind Cloudflare later?

## What To Go After

The next Claude should work this in order:

1. Get a working browser connection if the Chrome extension is disconnected.
2. Sign into Cloudflare in Chrome.
3. Confirm whether `edgelesslab.com` can be added to Cloudflare.
4. If yes, add the zone and route `/ingest` to the worker.
5. If no, keep the worker.dev endpoint and finish the PostHog secret setup.
6. Add the PostHog project API key as a Worker secret.
7. Push the repo changes and let GitHub Pages rebuild.
8. Verify the deployed site loads, the service page renders, and analytics calls hit the ingest path.

## Exact Implementation Plan

### Path A: Cloudflare zone available

If the domain can be added to Cloudflare:

1. Add `edgelesslab.com` as a Cloudflare zone.
2. Change nameservers at the registrar to Cloudflare nameservers.
3. Bind the worker to `edgelesslab.com/ingest`.
4. Add the PostHog project API key as a worker secret.
5. Verify `POST /ingest?e=...` reaches the worker and forwards to PostHog.

### Path B: Cloudflare zone not available yet

If the zone cannot be moved yet:

1. Keep `NEXT_PUBLIC_INGEST_URL` pointed at the worker.dev URL.
2. Add the PostHog project API key as a worker secret.
3. Verify event forwarding directly against worker.dev.
4. Leave the site on GitHub Pages until the zone move is possible.

## Files In Play

- [src/app/services/private-ai-systems/page.tsx](/Users/djm/claude-projects/edgeless-website/src/app/services/private-ai-systems/page.tsx)
- [src/components/service-cta-link.tsx](/Users/djm/claude-projects/edgeless-website/src/components/service-cta-link.tsx)
- [src/lib/analytics.ts](/Users/djm/claude-projects/edgeless-website/src/lib/analytics.ts)
- [src/components/posthog-provider.tsx](/Users/djm/claude-projects/edgeless-website/src/components/posthog-provider.tsx)
- [.github/workflows/deploy.yml](/Users/djm/claude-projects/edgeless-website/.github/workflows/deploy.yml)
- [workers/ingest/wrangler.toml](/Users/djm/claude-projects/edgeless-website/workers/ingest/wrangler.toml)
- [workers/ingest/worker.js](/Users/djm/claude-projects/edgeless-website/workers/ingest/worker.js)
- [workers/ingest/README.md](/Users/djm/claude-projects/edgeless-website/workers/ingest/README.md)

## Verification Checklist

The work is done when all of these are true:

- [ ] The Chrome extension is connected, or a usable browser path exists.
- [ ] Cloudflare can see `edgelesslab.com` as a zone.
- [ ] The worker is bound to the domain or the worker.dev fallback is documented.
- [ ] `POSTHOG_PROJECT_API_KEY` exists as a secret.
- [ ] The live site initializes PostHog in production.
- [ ] CTA clicks and purchase-intent events reach the ingest endpoint.
- [ ] The deployed page at `/services/private-ai-systems/` remains live.
- [ ] The repo changes are pushed and the GitHub Pages deploy succeeds.

## Notes For The Next Claude

- Do not assume the Chrome extension is connected just because it is installed.
- Do not assume Cloudflare access just because the dashboard opens.
- If the zone permission is missing, do not waste time retrying the same action.
- Keep the worker.dev path working as the fallback.
- Do not revert unrelated generated files in the repo.

## Short Version

The site is wired for analytics, the worker exists, and the remaining blockers are:

- Cloudflare zone access
- Cloudflare nameserver routing
- PostHog project API key
- Browser connection status

Once those are in place, the system should be able to record pageviews and CTA/purchase intent without going through a third-party path from the static site.
