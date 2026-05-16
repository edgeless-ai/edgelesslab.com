#!/usr/bin/env bash
set -euo pipefail

URL="${1:-https://edgelesslab.com/}"
OUT_DIR="${OUT_DIR:-reports/lighthouse}"
CHROME_FLAGS="${CHROME_FLAGS:---no-sandbox --headless}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT_DIR"

JSON_PATH="$OUT_DIR/${TS}.json"
HTML_PATH="$OUT_DIR/${TS}.html"
LATEST_JSON="$OUT_DIR/latest.json"
LATEST_HTML="$OUT_DIR/latest.html"
SUMMARY_PATH="$OUT_DIR/${TS}.summary.json"
LATEST_SUMMARY="$OUT_DIR/latest.summary.json"

# Note: uses npx so callers do NOT need a global lighthouse install.
# If you're running on macOS with a normal Chrome install, this should just work.
# If you run into sandbox errors, override CHROME_FLAGS.

echo "[INFO] lighthouse URL=$URL"
echo "[INFO] output dir=$OUT_DIR"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

npx --yes lighthouse@12 "$URL" \
  --chrome-flags="$CHROME_FLAGS" \
  --output=json --output=html \
  --output-path="$tmpdir/report" \
  --quiet

# lighthouse writes report.{json,html} at the output-path prefix
cp "$tmpdir/report.report.json" "$JSON_PATH"
cp "$tmpdir/report.report.html" "$HTML_PATH"

# lightweight summary for diffing/regression tracking
python3 - <<'PY' "$JSON_PATH" > "$SUMMARY_PATH"
import json,sys
p=sys.argv[1]
with open(p,'r',encoding='utf-8') as f:
    r=json.load(f)
cat=r.get('categories',{})
aud=r.get('audits',{})

def score(key):
    v=cat.get(key,{}).get('score',None)
    return None if v is None else float(v)

def num_audit(audit_id, field='numericValue'):
    v=aud.get(audit_id,{}).get(field,None)
    return None if v is None else float(v)

out={
  'url': r.get('finalUrl'),
  'fetchTime': r.get('fetchTime'),
  'lighthouseVersion': r.get('lighthouseVersion'),
  'scores': {
    'performance': score('performance'),
    'accessibility': score('accessibility'),
    'bestPractices': score('best-practices'),
    'seo': score('seo'),
  },
  'timings_ms': {
    'lcp': num_audit('largest-contentful-paint'),
    'tbt': num_audit('total-blocking-time'),
    'cls': num_audit('cumulative-layout-shift'),
    'tti': num_audit('interactive'),
  },
}
print(json.dumps(out, indent=2, sort_keys=True))
PY

cp "$JSON_PATH" "$LATEST_JSON"
cp "$HTML_PATH" "$LATEST_HTML"
cp "$SUMMARY_PATH" "$LATEST_SUMMARY"

echo "[OK] wrote: $JSON_PATH"
echo "[OK] wrote: $HTML_PATH"
echo "[OK] wrote: $SUMMARY_PATH"