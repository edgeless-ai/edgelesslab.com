#!/usr/bin/env bash
# paperclip-preempt-restart.sh — workaround for recurring plugin-job-scheduler wedge.
# Restarts Paperclip every 4 hours before it can wedge under burst-write load.
# Root cause: still under investigation; likely DB lock contention between
# heartbeat recovery and the scheduler tick query under heavy issue creation.
set -euo pipefail
LOG="/Users/djm/claude-projects/logs/paperclip-preempt-restart.log"
NODE_BIN="/Users/djm/.nvm/versions/node/v22.22.2/bin/node"
PAPERCLIP_ENTRY="/Users/djm/.nvm/versions/node/v22.22.2/lib/node_modules/paperclipai/dist/index.js"
{
  echo "=== $(date -Iseconds) preempt restart ==="
  # Paperclip auto-increments to 3101/3102 when 3100 is occupied. Killing only
  # the 3100 listener leaves split-brain runners behind, so stop every runner
  # for this instance before starting the canonical one.
  PIDS=$(ps aux | grep "$PAPERCLIP_ENTRY run --instance default" | grep -v grep | awk '{print $2}' || true)
  if [ -n "$PIDS" ]; then
    echo "Killing Paperclip runner PIDs: $PIDS"
    kill -TERM $PIDS 2>/dev/null || true
    for i in 1 2 3 4 5; do
      STILL_RUNNING=""
      for PID in $PIDS; do
        ps -p "$PID" >/dev/null 2>&1 && STILL_RUNNING="$STILL_RUNNING $PID"
      done
      [ -z "$STILL_RUNNING" ] && break
      sleep 2
    done
    for PID in $PIDS; do
      ps -p "$PID" >/dev/null 2>&1 && kill -KILL "$PID" 2>/dev/null || true
    done
  fi
  sleep 3
  # --- DB maintenance while the app is stopped (no query contention) ---
  # The recurring "wedge" is really issues-table index bloat: the GIN
  # description search index re-bloats (seen at 62MB / total 75MB for ~7.4k
  # rows), making the list query seq-scan and pile up under polling. Restarting
  # node alone never fixes it because the bloat lives in the *persistent*
  # embedded Postgres (port 54329), which this script reuses across restarts.
  # VACUUM every run (cheap); REINDEX only when indexes exceed 40MB. See
  # memory feedback-paperclip-scheduler-wedge + EDGA-7415.
  PSQL="/opt/homebrew/bin/psql"
  PGCONN="-h 127.0.0.1 -p 54329 -d paperclip -U paperclip"
  if [ -x "$PSQL" ]; then
    "$PSQL" $PGCONN -c "VACUUM (ANALYZE) issues;" >/dev/null 2>&1 \
      && echo "DB maintenance: VACUUM ANALYZE issues OK" \
      || echo "WARN: VACUUM failed (embedded PG unreachable?)"
    IDX_BYTES=$("$PSQL" $PGCONN -t -A -c "SELECT pg_indexes_size('issues');" 2>/dev/null || echo 0)
    IDX_BYTES=${IDX_BYTES:-0}
    if [ "$IDX_BYTES" -gt 41943040 ] 2>/dev/null; then
      echo "issues indexes ${IDX_BYTES}B > 40MB — REINDEX TABLE issues"
      "$PSQL" $PGCONN -c "REINDEX TABLE issues;" >/dev/null 2>&1 \
        && echo "REINDEX OK" || echo "WARN: REINDEX failed"
    else
      echo "issues indexes ${IDX_BYTES}B within bounds — skip reindex"
    fi
  else
    echo "WARN: psql not found at $PSQL — skipping DB maintenance"
  fi
  cd /Users/djm/claude-projects
  nohup "$NODE_BIN" --experimental-require-module "$PAPERCLIP_ENTRY" run --instance default > /dev/null 2>&1 < /dev/null &
  disown
  echo "Started new instance"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    curl -sf -m 3 'http://127.0.0.1:3100/api/companies/c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712/issues?limit=1' > /dev/null 2>&1 && {
      EXTRA_PORTS=$(lsof -Pan -iTCP -sTCP:LISTEN 2>/dev/null | grep -E '127\.0\.0\.1:310[1-9]' || true)
      if [ -n "$EXTRA_PORTS" ]; then
        echo "WARN: extra Paperclip-like listeners detected after restart:"
        echo "$EXTRA_PORTS"
      fi
      echo "API ready after ${i} attempts"
      # Renice postgres workers to +10 so they don't starve Discord gateway heartbeats
      for pgpid in $(ps aux | grep "postgres.*paperclip" | grep -v grep | awk '{print $2}'); do
        renice 10 "$pgpid" >/dev/null 2>&1
      done
      echo "Postgres workers reniced to +10"
      exit 0
    }
    sleep 3
  done
  echo "WARN: API not responsive after 30s"
  exit 1
} >> "$LOG" 2>&1
