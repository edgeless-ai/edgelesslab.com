#!/bin/bash
set -uo pipefail

# TRADER — Daily Market Scan
# Dispatches the Trader Hermes profile to scan for opportunities.
# Creates Paperclip issues for actionable signals.
#
# Runs: Weekdays 7:00 AM PST
# Owner: Trader agent
# Cron: 0 7 * * 1-5 $CRON_WRAPPER "trader_daily_scan" $CLAUDE_PROJECTS_ROOT/scripts/cron/trader-daily-scan.sh

CLAUDE_PROJECTS_ROOT="${CLAUDE_PROJECTS_ROOT:-/Users/djm/claude-projects}"
LOG_DIR="$CLAUDE_PROJECTS_ROOT/logs/trader"
LOG_FILE="$LOG_DIR/scan-$(date +%Y%m%d).log"

set +e
source "$CLAUDE_PROJECTS_ROOT/.env" 2>/dev/null
set -e

mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Trader: Daily Market Scan ==="

# --- Dispatch Hermes trader profile for market scan ---
PROMPT="Run your daily market scan routine:
1. Check Polymarket for new high-volume markets and mispriced contracts
2. Identify opportunities with >10% edge (model price vs market price)
3. Check any open positions for exit signals
4. Summarize findings in a concise report

Output format:
- OPPORTUNITIES: List any actionable trades (market, direction, edge %, confidence)
- POSITIONS: Status of any open positions
- ALERTS: Any risk warnings

Keep it brief. If nothing actionable, say so in one line."

if command -v hermes &>/dev/null; then
    log "Dispatching Hermes (trader profile)..."
    RESULT=$(hermes --profile trader -m "$PROMPT" 2>/dev/null | tail -50)
    log "Hermes response received (${#RESULT} chars)"

    # Log the result
    echo "$RESULT" >> "$LOG_FILE"

    # Send summary to Telegram
    TELEGRAM_SCRIPT="$HOME/.claude/skills/telegram-message/scripts/send_telegram.py"
    if [ -f "$TELEGRAM_SCRIPT" ] && [ ${#RESULT} -gt 10 ]; then
        SUMMARY=$(echo "$RESULT" | head -10)
        python3.11 "$TELEGRAM_SCRIPT" "Trader Daily Scan: $SUMMARY" 2>/dev/null || true
    fi
else
    log "WARN: hermes CLI not found. Skipping market scan."
fi

log "=== Scan complete ==="
