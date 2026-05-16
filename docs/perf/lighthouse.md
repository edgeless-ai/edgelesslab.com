# Lighthouse perf baseline (edgelesslab.com)

This repo deploys to GitHub Pages (see `.github/workflows/deploy.yml`). The deploy workflow **does not build** the site; it publishes the pre-built static output committed into the repo.

To track perf regressions against the live site, we keep timestamped Lighthouse reports under:

- `reports/lighthouse/` (JSON + HTML)
- `reports/lighthouse/*.summary.json` (small, diff-friendly summary)

## Run

From repo root:

```bash
bash scripts/lighthouse.sh https://edgelesslab.com/
```

Outputs:

- `reports/lighthouse/<timestamp>.json`
- `reports/lighthouse/<timestamp>.html`
- `reports/lighthouse/<timestamp>.summary.json`
- `reports/lighthouse/latest.{json,html,summary.json}`

## Notes / troubleshooting

- Uses `npx lighthouse@12` so no global install required.
- If Chrome sandboxing fails in your environment, override:

```bash
CHROME_FLAGS="--no-sandbox --headless" bash scripts/lighthouse.sh https://edgelesslab.com/
```

## Intended workflow

1. Run the script to generate a baseline.
2. Commit the `*.summary.json` (and optionally the full JSON/HTML if needed).
3. When perf changes, re-run and diff the summaries.
