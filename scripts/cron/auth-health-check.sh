#!/usr/bin/env bash
# auth-health-check.sh — Daily provider auth health probe + fallback validation
# Schedule: 0 8 * * * (daily 8am)
# Issue: EDGA-4259
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/Users/djm/claude-projects"
PROBE="$PROJECT_DIR/scripts/lib/provider_health_probe.py"
LOG_DIR="/Users/djm/claude-projects/logs"
LOG_FILE="$LOG_DIR/auth-health-daily.jsonl"
WEBHOOK="$PROJECT_DIR/scripts/discord-post-webhook.sh"

PY="/opt/homebrew/opt/python@3.11/bin/python3.11"

mkdir -p "$LOG_DIR"

# Run deep probe and capture JSON + exit code
JSON_OUT=$("$PY" "$PROBE" --deep --json 2>/dev/null) || true
EXIT_CODE=$?

# Append to JSONL log
echo "$JSON_OUT" >> "$LOG_FILE"

# Parse for alerting
if [ -n "$JSON_OUT" ]; then
    # Down-count for severity: exclude expected-dead (nous), expected_absent
    # (anthropic — key intentionally absent), and expected_optional (openrouter —
    # valid key, credit-gated 402). Keeps the >=3 pool-exhaustion alert truthful.
    DOWN_COUNT=$(echo "$JSON_OUT" | "$PY" -c "import sys,json;d=json.load(sys.stdin);print(len([p for p in d['providers'] if not p['healthy'] and 'confirmed dead' not in (p.get('error') or '') and not p.get('expected_absent') and not p.get('expected_optional')]))")
    FB_VALID=$(echo "$JSON_OUT" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['fallback_validation']['valid'])")
    ELAPSED=$(echo "$JSON_OUT" | "$PY" -c "import sys,json;print(json.load(sys.stdin)['elapsed_ms'])")
else
    DOWN_COUNT=5
    FB_VALID="false"
    ELAPSED=0
fi

ALERTS=()

if [ "$DOWN_COUNT" -ge 3 ]; then
    ALERTS+=("CRITICAL: $DOWN_COUNT providers down — credential pool exhaustion detected")
fi

if [ "$DOWN_COUNT" -ge 1 ] && [ "$DOWN_COUNT" -lt 3 ]; then
    ALERTS+=("WARNING: $DOWN_COUNT provider(s) unhealthy")
fi

if [ "$FB_VALID" != "True" ]; then
    ALERTS+=("CRITICAL: fallback model resolves to SAME provider as primary — no cross-provider failover")
fi

if [ ${#ALERTS[@]} -gt 0 ]; then
    MSG="[AUTH HEALTH] Daily probe failed — ${ELAPSED}ms
$(printf '%s\n' "${ALERTS[@]}")"
    if [ -x "$WEBHOOK" ]; then
        "$WEBHOOK" alerts "AuthHealth" "$MSG" || true
    fi
    echo "$MSG"
    exit 2
else
    echo "[AUTH HEALTH] All providers healthy — ${ELAPSED}ms"
    exit 0
fi
