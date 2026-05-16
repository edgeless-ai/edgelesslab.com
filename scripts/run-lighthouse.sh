#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/run-lighthouse.sh [url]
# Defaults to production.

URL="${1:-https://edgelesslab.com/}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/docs/audits"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$OUT_DIR"

OUT_JSON="$OUT_DIR/lighthouse-${TS}.json"
OUT_HTML="$OUT_DIR/lighthouse-${TS}.html"
LATEST_JSON="$OUT_DIR/lighthouse-latest.json"
LATEST_HTML="$OUT_DIR/lighthouse-latest.html"

# Lighthouse needs Chrome; on macOS this generally works without --no-sandbox.
# We keep flags conservative for CI/headless environments.

# lighthouse CLI cannot write multiple output types to two distinct --output-path values in one invocation.
# Run twice (json + html) to keep paths explicit.

npx -y lighthouse "$URL" \
  --quiet \
  --output=json --output-path="$OUT_JSON" \
  --chrome-flags="--headless --disable-gpu"

npx -y lighthouse "$URL" \
  --quiet \
  --output=html --output-path="$OUT_HTML" \
  --chrome-flags="--headless --disable-gpu"

cp -f "$OUT_JSON" "$LATEST_JSON"
cp -f "$OUT_HTML" "$LATEST_HTML"

python3 - <<PY
import json
p = "${OUT_JSON}"
d = json.load(open(p))
cat = d.get('categories', {})

def pct(k):
    v = cat.get(k, {}).get('score')
    return None if v is None else int(round(v * 100))

print("URL:", d.get('finalUrl') or "${URL}")
for k in ['performance','accessibility','best-practices','seo']:
    v = pct(k)
    if v is not None:
        print(f"{k}: {v}")

a = d.get('audits', {})
print("LCP(ms):", a.get('largest-contentful-paint', {}).get('numericValue'))
print("TBT(ms):", a.get('total-blocking-time', {}).get('numericValue'))
print("Latest JSON:", "${LATEST_JSON}")
print("Latest HTML:", "${LATEST_HTML}")
PY
