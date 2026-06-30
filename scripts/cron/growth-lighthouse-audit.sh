#!/usr/bin/env bash
# growth-lighthouse-audit.sh — Daily Lighthouse audit for edgelesslab.com
# Growth Engineer (Anomaly) cron job.
# Compares scores against thresholds, creates Paperclip issues on regression,
# sends Telegram alerts, and appends aggregate + page-level results to JSONL history.
set -euo pipefail

PROJECT_ROOT="/Users/djm/claude-projects"
LOG_DIR="$PROJECT_ROOT/logs/growth"
HISTORY_FILE="$LOG_DIR/lighthouse-history.jsonl"
RUN_LOG="$LOG_DIR/lighthouse-audit.log"
ENV_FILE="$PROJECT_ROOT/.env"
SEND_TELEGRAM="python3.11 /Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py"
PY="/opt/homebrew/opt/python@3.11/bin/python3.11"

BASE_URL="https://edgelesslab.com"
PAPERCLIP_URL="http://127.0.0.1:3100/api"
PAPERCLIP_COMPANY="c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"
PAPERCLIP_PROJECT="11266317-404f-4933-9e21-5a390de38d56"
PAPERCLIP_AGENT="0b779ab3-ff29-425c-93c1-1fe4471ce3a0"

PAGES=("/" "/blog" "/products" "/about" "/lab" "/pen-plotter" "/tartanism")

THRESHOLD_PERFORMANCE=90
THRESHOLD_ACCESSIBILITY=95
THRESHOLD_BEST_PRACTICES=90
THRESHOLD_SEO=90

mkdir -p "$LOG_DIR"
echo "=== growth-lighthouse-audit $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="

[[ -f "$ENV_FILE" ]] && set -o allexport && source "$ENV_FILE" && set +o allexport || true

LIGHTHOUSE_BIN=""
for candidate in \
    "$(command -v lighthouse 2>/dev/null || true)" \
    "/Users/djm/.npm-global/bin/lighthouse" \
    "/Users/djm/.nvm/versions/node/v22.16.0/bin/lighthouse" \
    "/usr/local/bin/lighthouse" \
    "/opt/homebrew/bin/lighthouse"; do
    if [[ -n "${candidate:-}" && -x "$candidate" ]]; then
        LIGHTHOUSE_BIN="$candidate"
        break
    fi
done
# Export so growth-lighthouse-pages.py (which shells out to lighthouse) resolves the
# absolute binary under cron's minimal PATH, which excludes ~/.npm-global/bin.
export LIGHTHOUSE_BIN

NOW_ISO=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
NOW_DATE=$(date -u '+%Y-%m-%d')
LIGHTHOUSE_AVAILABLE=true

if [[ -z "$LIGHTHOUSE_BIN" ]]; then
    echo "WARNING: lighthouse CLI not found — logging stub entry"
    LIGHTHOUSE_AVAILABLE=false
fi

# Reap orphaned Chrome processes spawned by lighthouse's chrome-launcher.
# Targets ONLY Chrome whose --user-data-dir points at a lighthouse temp profile
# (e.g. /var/folders/.../T/lighthouse.XXXXXXX). The user's real Chrome uses
# ~/Library/Application Support/Google/Chrome and is never matched. Run on exit
# so any Chrome left after all lighthouse passes complete (or after an
# interrupted run) is cleaned up instead of accumulating across days.
reap_lighthouse_chrome() {
    pkill -f 'user-data-dir=[^ ]*lighthouse' 2>/dev/null || true
}

run_lighthouse() {
    local run_dir="$1"
    local page_results_file="$2"
    local page_scores_file="$3"
    local transient_flag="$4"

    if $LIGHTHOUSE_AVAILABLE; then
        "$PY" "$PROJECT_ROOT/scripts/cron/growth-lighthouse-pages.py" \
            "$BASE_URL" "${PAGES[@]}" "$run_dir" "$page_results_file" "$page_scores_file"
    else
        echo "[]" > "$page_results_file"
        echo "{}" > "$page_scores_file"
    fi

    # Append to history immediately so we always have a record
    "$PY" - "$HISTORY_FILE" "$NOW_ISO" "$NOW_DATE" "$BASE_URL" "$transient_flag" "$(cat "$page_scores_file")" <<'PYEOF'
import json, sys
from pathlib import Path

history_file, ts, date, url, transient, scores_raw = sys.argv[1:]
entry = {
    "date": date,
    "timestamp": ts,
    "url": url,
    "transient": transient == "true",
    "scores": json.loads(scores_raw),
}
Path(history_file).parent.mkdir(parents=True, exist_ok=True)
with open(history_file, "a") as f:
    f.write(json.dumps(entry) + "\n")
print(f"Appended entry to {history_file}, transient={transient}")
PYEOF
}

evaluate_scores() {
    "$PY" - "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}" "${11}" <<'PYEOF'
import json, sys, subprocess, urllib.request

_args = sys.argv[1:]
_EXPECTED = 11
if len(_args) != _EXPECTED:
    # Degrade gracefully on positional-arg drift rather than raising
    # ValueError: not enough values to unpack. Pad/trim to the expected shape.
    sys.stderr.write(
        f"WARNING: expected {_EXPECTED} args, got {len(_args)}: {_args!r}\n"
    )
    _args = (_args + [""] * _EXPECTED)[:_EXPECTED]
(page_results_raw, send_telegram, paperclip_url, paperclip_company,
 paperclip_project, paperclip_agent, ts,
 thresh_perf, thresh_a11y, thresh_bp, thresh_seo) = _args

def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

page_results = json.loads(page_results_raw) if page_results_raw else []
thresholds = {
    "performance": _int(thresh_perf),
    "accessibility": _int(thresh_a11y),
    "best_practices": _int(thresh_bp),
    "seo": _int(thresh_seo),
}
labels = {
    "performance": "Performance",
    "accessibility": "Accessibility",
    "best_practices": "Best Practices",
    "seo": "SEO",
}

failed_pages = []
regression_summary_lines = []
for res in page_results:
    page = res.get("page", "")
    url = res.get("url", "")
    report = res.get("report")
    error = res.get("error")
    scores = res.get("scores") or report or {}
    if error:
        failed_pages.append({"page": page, "url": url, "error": error})
    else:
        regressions = []
        for key, threshold in thresholds.items():
            score = scores.get(key, -1)
            if score >= 0 and score < threshold:
                regressions.append({
                    "key": key,
                    "label": labels[key],
                    "score": score,
                    "threshold": threshold,
                    "gap": threshold - score,
                })
        if regressions:
            failed_pages.append({
                "page": page,
                "url": url,
                "regressions": regressions,
            })
            regression_summary_lines.append(f"- {page} ({url})")
            for r in regressions:
                regression_summary_lines.append(f"  - {r['label']}: {r['score']} (threshold: {r['threshold']}, gap: -{r['gap']})")

print(json.dumps({
    "failed_pages": failed_pages,
    "regression_summary_lines": regression_summary_lines,
}))
PYEOF
}

create_paperclip_issues_and_alert() {
    "$PY" - "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}" "${11}" <<'PYEOF'
import json, sys, subprocess, urllib.request

_args = sys.argv[1:]
_EXPECTED = 11
if len(_args) != _EXPECTED:
    # Degrade gracefully on positional-arg drift rather than raising
    # ValueError: not enough values to unpack. Pad/trim to the expected shape.
    sys.stderr.write(
        f"WARNING: expected {_EXPECTED} args, got {len(_args)}: {_args!r}\n"
    )
    _args = (_args + [""] * _EXPECTED)[:_EXPECTED]
(page_results_raw, send_telegram, paperclip_url, paperclip_company,
 paperclip_project, paperclip_agent, ts,
 thresh_perf, thresh_a11y, thresh_bp, thresh_seo) = _args

def _int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

page_results = json.loads(page_results_raw) if page_results_raw else []
thresholds = {
    "performance": _int(thresh_perf),
    "accessibility": _int(thresh_a11y),
    "best_practices": _int(thresh_bp),
    "seo": _int(thresh_seo),
}
labels = {
    "performance": "Performance",
    "accessibility": "Accessibility",
    "best_practices": "Best Practices",
    "seo": "SEO",
}

failed_pages = []
regression_summary_lines = []
for res in page_results:
    page = res.get("page", "")
    url = res.get("url", "")
    report = res.get("report")
    error = res.get("error")
    scores = res.get("scores") or report or {}
    if error:
        failed_pages.append({"page": page, "url": url, "error": error})
    else:
        regressions = []
        for key, threshold in thresholds.items():
            score = scores.get(key, -1)
            if score >= 0 and score < threshold:
                regressions.append({
                    "key": key,
                    "label": labels[key],
                    "score": score,
                    "threshold": threshold,
                    "gap": threshold - score,
                })
        if regressions:
            failed_pages.append({
                "page": page,
                "url": url,
                "regressions": regressions,
            })
            regression_summary_lines.append(f"- {page} ({url})")
            for r in regressions:
                regression_summary_lines.append(f"  - {r['label']}: {r['score']} (threshold: {r['threshold']}, gap: -{r['gap']})")

if not failed_pages:
    print("All inspected pages meet thresholds on second run. No Paperclip issues created.")
    sys.exit(0)

lines = ["Confirmed Lighthouse regression (2nd run)", f"Timestamp: {ts}", ""]
if regression_summary_lines:
    lines.extend(regression_summary_lines)
else:
    lines.append("Failed pages due to audit errors: see details")
lines.append("")
print("\n".join(lines))

try:
    telegram_lines = ["[Growth] Confirmed Lighthouse regression (2nd run)", "", "Detected on "+url, "Timestamp: "+ts, ""]
    if regression_summary_lines:
        telegram_lines.extend(regression_summary_lines)
    else:
        telegram_lines.append("See audit log for page-level failures.")
    telegram_msg = "\n".join(telegram_lines)
    subprocess.run(
        ["python3.11", "/Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py", telegram_msg],
        capture_output=True,
        timeout=30,
    )
    print("Telegram alert sent")
except Exception as e:
    print(f"Telegram alert failed: {e}", file=sys.stderr)

for item in failed_pages:
    page = item.get("page", "")
    url = item.get("url", "")
    regressions = item.get("regressions", [])
    error = item.get("error")
    if error:
        title = f"[Growth] Lighthouse audit error: {page or url}"
        details = [
            f"Automated Lighthouse audit failed for `{url}` (confirmed on 2nd run).",
            "",
            f"**Error:** {error}",
            "",
            f"**Timestamp:** {ts}",
            "",
            "**Next steps:**",
            "1. Re-run Lighthouse with `--view` for this page",
            "2. Check site availability and network constraints",
            "3. Close once audit succeeds and scores are green",
            "",
            "_Auto-created by `scripts/cron/growth-lighthouse-audit.sh`_",
        ]
    else:
        regression_labels = ", ".join(r["label"] for r in regressions)
        title = f"[Growth] Lighthouse regression on `{page or url}`: {regression_labels}"
        details = [
            f"Automated Lighthouse audit detected score regression(s) on `{url}` (confirmed on 2nd run).",
            "",
            f"**Timestamp:** {ts}",
            "",
            "**Regressions:**",
        ]
        for r in regressions:
            details.append(f"- **{r['label']}:** {r['score']} (threshold: {r['threshold']}, gap: -{r['gap']})")
        details += [
            "",
            "**Next steps:**",
            f"1. Run Lighthouse manually: `lighthouse {url} --view`",
            "2. Check recent deploys for regressions",
            "3. Close once all scores recover above thresholds",
            "",
            "_Auto-created by `scripts/cron/growth-lighthouse-audit.sh`_",
        ]
    description = "\n".join(details)
    req_data = json.dumps({
        "title": title,
        "description": description,
        "status": "todo",
        "projectId": paperclip_project,
        "assigneeAgentId": paperclip_agent,
    }).encode()
    req = urllib.request.Request(
        f"{paperclip_url}/companies/{paperclip_company}/issues",
        data=req_data,
        method="POST",
        headers={
            "Authorization": "Bearer local_trusted",
            "X-Company-Id": paperclip_company,
            "Content-Type": "application/json",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        print(f"Created Paperclip issue: {resp.status}")
    except Exception as e:
        print(f"Failed to create Paperclip issue: {e}", file=sys.stderr)
PYEOF
}

# --- First run ---
RUN_DIR_1="$(mktemp -d)"
trap 'rm -rf "$RUN_DIR_1"; reap_lighthouse_chrome' EXIT INT TERM
PAGE_RESULTS_1="$RUN_DIR_1/page-results.json"
PAGE_SCORES_1="$RUN_DIR_1/page-scores.json"

echo "Running Lighthouse first pass for ${#PAGES[@]} pages from base: $BASE_URL"
run_lighthouse "$RUN_DIR_1" "$PAGE_RESULTS_1" "$PAGE_SCORES_1" "true"
SCORES_JSON_1=$(cat "$PAGE_SCORES_1")
echo "First pass scores: $SCORES_JSON_1"

EVAL_1=$(evaluate_scores "$(cat "$PAGE_RESULTS_1")" "$SEND_TELEGRAM" "$PAPERCLIP_URL" "$PAPERCLIP_COMPANY" "$PAPERCLIP_PROJECT" "$PAPERCLIP_AGENT" "$NOW_ISO" "$THRESHOLD_PERFORMANCE" "$THRESHOLD_ACCESSIBILITY" "$THRESHOLD_BEST_PRACTICES" "$THRESHOLD_SEO")
echo "$EVAL_1" | "$PY" -c "import sys,json;d=json.loads(sys.stdin.read());print('Transient flags:', d.get('transient_flags', []))"

if ! $LIGHTHOUSE_AVAILABLE; then
    echo "Lighthouse unavailable — no regression possible. Exiting."
    exit 0
fi

if echo "$EVAL_1" | "$PY" -c "import sys,json;d=json.loads(sys.stdin.read());print(len(d.get('failed_pages',[])))" | grep -q '^0$'; then
    echo "All pages green on first pass. Exiting."
    exit 0
fi

# --- Second run (confirmation) ---
echo "Score below threshold on first pass. Waiting 10 minutes before confirmation run..."
sleep 600

RUN_DIR_2="$(mktemp -d)"
trap 'rm -rf "$RUN_DIR_2"; rm -rf "$RUN_DIR_1"; reap_lighthouse_chrome' EXIT INT TERM
PAGE_RESULTS_2="$RUN_DIR_2/page-results.json"
PAGE_SCORES_2="$RUN_DIR_2/page-scores.json"
NOW_ISO=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

echo "Running Lighthouse second pass for ${#PAGES[@]} pages from base: $BASE_URL"
run_lighthouse "$RUN_DIR_2" "$PAGE_RESULTS_2" "$PAGE_SCORES_2" "false"
SCORES_JSON_2=$(cat "$PAGE_SCORES_2")
echo "Second pass scores: $SCORES_JSON_2"

EVAL_2=$(evaluate_scores "$(cat "$PAGE_RESULTS_2")" "$SEND_TELEGRAM" "$PAPERCLIP_URL" "$PAPERCLIP_COMPANY" "$PAPERCLIP_PROJECT" "$PAPERCLIP_AGENT" "$NOW_ISO" "$THRESHOLD_PERFORMANCE" "$THRESHOLD_ACCESSIBILITY" "$THRESHOLD_BEST_PRACTICES" "$THRESHOLD_SEO")

echo "$EVAL_2" | "$PY" -c "import sys,json;d=json.loads(sys.stdin.read());print(len(d.get('failed_pages',[])), 'confirmed failures on second run')"
echo "RESULT_SUMMARY: $(echo "$EVAL_2" | "$PY" -c 'import sys,json;d=json.loads(sys.stdin.read());print(",".join((r.get("page","") + ("[ERR]" if r.get("error") else "[REG]")) for r in d.get("failed_pages",[])))')"

create_paperclip_issues_and_alert "$(cat "$PAGE_RESULTS_2")" "$SEND_TELEGRAM" "$PAPERCLIP_URL" "$PAPERCLIP_COMPANY" "$PAPERCLIP_PROJECT" "$PAPERCLIP_AGENT" "$NOW_ISO" "$THRESHOLD_PERFORMANCE" "$THRESHOLD_ACCESSIBILITY" "$THRESHOLD_BEST_PRACTICES" "$THRESHOLD_SEO"
