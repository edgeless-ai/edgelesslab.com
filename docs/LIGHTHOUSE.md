# Lighthouse auditing (edgelesslab.com)

Goal: make performance regressions trackable and keep a reproducible baseline.

## Quick run (production)

From repo root:

  bash scripts/run-lighthouse.sh

This generates timestamped reports and updates "latest" pointers:

- docs/audits/lighthouse-<timestamp>.json
- docs/audits/lighthouse-<timestamp>.html
- docs/audits/lighthouse-latest.json
- docs/audits/lighthouse-latest.html

The script also prints a small summary (Perf/Access/Best/SEO + LCP + TBT).

## Run against a local server

Example:

  python3 -m http.server 8089 --bind 127.0.0.1
  bash scripts/run-lighthouse.sh http://127.0.0.1:8089/

## What to watch

1) Performance score (target 100)
2) LCP (target < 2500ms)
3) TBT (target < 200ms)
4) "unused-javascript" audit (often the fastest path to Perf 100)

## Baseline policy

- Keep at least one recent production audit committed so we can diff over time.
- Prefer committing the timestamped JSON+HTML and updating lighthouse-latest.* in the same PR.
