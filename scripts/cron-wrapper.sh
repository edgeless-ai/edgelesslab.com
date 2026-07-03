#!/usr/bin/env bash
# cron-wrapper.sh — Hermes cron wrapper with state and failure alerting
# Usage:
#   ./cron-wrapper.sh "job_name" -- command arg1 arg2 ...
#   next_run=$(tail -n1 path/to/manifest); ./cron-wrapper.sh build_job echo ok next_run="$next_run"
#
# Behavior:
# - Writes state to /Users/djm/claude-projects/logs/state/<job_name>.json
# - Prints a single stdout status line for cron systems: ok|failed exit=<code>|killed
# - On failure, invokes cron_failure_alerter.py --state-notify <job> <exit>
set -u
set -o pipefail

# NOTE: "--" is optional (see shift logic below), so 2 args (JOB_NAME + command)
# is a valid invocation. A -lt 3 gate here silently killed 10 two-arg crontab
# entries for 18 days (2026-06-13 → 2026-07-01) because the usage-exit fires
# before any state write or failure alert.
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 JOB_NAME [--] command [args...]" >&2
  exit 2
fi

JOB_NAME="$1"; shift
if [[ "${1:-}" == "--" ]]; then
  shift
fi
CMD=("$@")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$PROJECT_ROOT/logs/state"
mkdir -p "$STATE_DIR"

log() {
  echo "[cron-wrapper] $*" >&2 || true
}

started_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
next_run="${CRON_NEXT_RUN:-${next_run:-}}"

_start_ts="$(date +%s)"
_raw_rc=0
_output="$( "${CMD[@]}" )" || _raw_rc=$?
rc=$((_raw_rc != 0 ? _raw_rc : 0))
_end_ts="$(date +%s)"
wall=$(( _end_ts - _start_ts ))
completed_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

status="ok"
if [[ "$rc" -ne 0 ]]; then
  status="failed"
elif [[ -n "${_output:-}" ]]; then
  if echo "$_output" | grep -qi "ERROR:"; then
    status="failed"
    rc=1
  fi
fi

stderr_path="$STATE_DIR/${JOB_NAME}.stderr"
log_path=""
if [[ -f "$stderr_path" ]]; then
  log_path="$stderr_path"
else
  # Match hermess-style log files when available.
  for candidate in \
    "$STATE_DIR/${JOB_NAME}.log" \
    "$STATE_DIR/${JOB_NAME}.log"; do
    if [[ -f "$candidate" ]]; then
      log_path="$candidate"
      break
    fi
  done
fi

python3 - "$STATE_DIR/${JOB_NAME}.json" "$JOB_NAME" "$started_at" "$completed_at" "$wall" "$status" "$rc" "$log_path" "$next_run" "$_output" <<'PY' >/dev/null 2>&1 || true
import json, sys, pathlib, textwrap
state_path = pathlib.Path(sys.argv[1])
job_name = sys.argv[2]
started_at = sys.argv[3]
completed_at = sys.argv[4]
wall = sys.argv[5]
status = sys.argv[6]
exit_code = int(sys.argv[7])
log_path = sys.argv[8]
next_run = sys.argv[9]
output = sys.argv[10] if len(sys.argv) > 10 else ''

data = {}
if state_path.exists():
    try:
        data = json.loads(state_path.read_text())
    except Exception:
        data = {}

data.setdefault('job', job_name)
data['started_at'] = started_at
data['last_heartbeat_at'] = completed_at
data['status'] = status
data['wall_seconds'] = int(wall)
data['exit_code'] = exit_code
if next_run:
    data['next_expected_run'] = next_run
else:
    data.pop('next_expected_run', None)

stderr_tail = None
if log_path and pathlib.Path(log_path).exists():
    try:
        text = pathlib.Path(log_path).read_text(errors='ignore')
        lines = text.splitlines()
        if lines:
            stderr_tail = "\n".join(lines[-120:])
    except Exception:
        stderr_tail = None

error = None
if status != 'ok':
    error = f'{status}: exit {exit_code}'
    snippet = output.strip().splitlines()[-5:] if output.strip() else []
    if snippet:
        error += '\n' + textwrap.shorten('\n'.join(snippet), width=500, placeholder=' ...')
    if stderr_tail:
        error += '\nStderr tail:\n' + stderr_tail[-800:]

data['error'] = error

state_path.write_text(json.dumps(data, indent=2, default=str) + "\n")
PY

if [[ "$rc" -ne 0 ]]; then
  log "Job failed: rc=${rc}"
  python3 "$SCRIPT_DIR/cron_failure_alerter.py" --state-notify "$JOB_NAME" "$rc" || true
  echo "status=failed exit=${rc}"
  exit "$rc"
fi

echo "status=ok"
