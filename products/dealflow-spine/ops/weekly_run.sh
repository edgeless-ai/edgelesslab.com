#!/bin/bash
# weekly_run.sh — dealflow-spine weekly live run + Telegram digest
#
# Invoked by launchd: ~/Library/LaunchAgents/com.edgeless.dealflow-weekly.plist
# (Monday 09:00 local). launchd is used instead of cron because macOS cron
# silently skips fires while the Mac sleeps; launchd StartCalendarInterval
# coalesces and fires on wake.
#
# Notification contract (spam guard): exactly ONE Telegram message per run —
# digest head on success OR one short failure note. No retries, no re-sends.
#
# All paths absolute: launchd runs with a bare PATH.

set -u

PRODUCT_DIR="/Users/djm/claude-projects/products/dealflow-spine"
VENV_PY="${PRODUCT_DIR}/.venv/bin/python"
CLI="${PRODUCT_DIR}/cli.py"
DIGEST="${PRODUCT_DIR}/data/digest-latest.md"
LOG_DIR="${PRODUCT_DIR}/ops/logs"
LOCK_DIR="${PRODUCT_DIR}/ops/.weekly_run.lock"
TELEGRAM="/opt/homebrew/opt/python@3.11/bin/python3.11 /Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py"

mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/weekly-$(/bin/date +%Y%m%d).log"

# --- prune logs older than 90 days ---
/usr/bin/find "${LOG_DIR}" -name 'weekly-*.log' -type f -mtime +90 -delete 2>/dev/null

# --- overlap guard (macOS has no flock; atomic mkdir lock w/ PID staleness) ---
if ! /bin/mkdir "${LOCK_DIR}" 2>/dev/null; then
    OLD_PID="$(cat "${LOCK_DIR}/pid" 2>/dev/null || echo '')"
    if [ -n "${OLD_PID}" ] && /bin/kill -0 "${OLD_PID}" 2>/dev/null; then
        echo "$(/bin/date '+%F %T') SKIP: run already in progress (pid ${OLD_PID})" >> "${LOG_FILE}"
        exit 0   # overlap is not a failure; no telegram
    fi
    # stale lock (owner dead) — reclaim
    /bin/rm -rf "${LOCK_DIR}"
    /bin/mkdir "${LOCK_DIR}" || exit 0
fi
echo $$ > "${LOCK_DIR}/pid"
trap '/bin/rm -rf "${LOCK_DIR}"' EXIT

# --- the run (all output tee'd to the dated log) ---
run_pipeline() {
    echo "=== dealflow-spine weekly live run: $(/bin/date '+%F %T %Z') ==="
    cd "${PRODUCT_DIR}" && "${VENV_PY}" "${CLI}" run --live
}
set -o pipefail
run_pipeline 2>&1 | /usr/bin/tee -a "${LOG_FILE}"
RUN_STATUS=$?
set +o pipefail
echo "=== run exit status: ${RUN_STATUS} ===" >> "${LOG_FILE}"

# --- exactly ONE telegram per run ---
if [ "${RUN_STATUS}" -eq 0 ] && [ -f "${DIGEST}" ]; then
    MSG="📊 dealflow-spine weekly digest ($(/bin/date '+%F'))

$(/usr/bin/head -40 "${DIGEST}")

(full digest: ${DIGEST})"
    ${TELEGRAM} "${MSG}" >> "${LOG_FILE}" 2>&1 \
        || echo "$(/bin/date '+%F %T') WARN: telegram send failed (not retrying)" >> "${LOG_FILE}"
    exit 0
else
    TAIL5="$(/usr/bin/tail -5 "${LOG_FILE}")"
    ${TELEGRAM} "⚠️ dealflow-spine weekly run FAILED (exit ${RUN_STATUS}) on $(/bin/date '+%F %T'). Last log lines:
${TAIL5}
Log: ${LOG_FILE}" >> "${LOG_FILE}" 2>&1 \
        || echo "$(/bin/date '+%F %T') WARN: failure telegram send failed (not retrying)" >> "${LOG_FILE}"
    exit 1
fi
