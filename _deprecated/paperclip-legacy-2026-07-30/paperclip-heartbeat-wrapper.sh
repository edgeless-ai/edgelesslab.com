#!/usr/bin/env bash
# paperclip-heartbeat-wrapper.sh
# Polls Paperclip heartbeat runs and posts results to Discord.
# Run as a cron job every 5 minutes to catch completed runs.
#
# Cron: */5 * * * * /Users/djm/claude-projects/scripts/cron-wrapper.sh "paperclip_discord" /Users/djm/claude-projects/scripts/paperclip-heartbeat-wrapper.sh

set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/Users/djm/.nvm/versions/node/v22.16.0/bin:${PATH:-}"

PAPERCLIP_URL="http://127.0.0.1:3100"
COMPANY_ID="c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"
STATE_FILE="/Users/djm/claude-projects/.runtime/paperclip/.paperclip-discord-state.json"
POST_SCRIPT="/Users/djm/claude-projects/scripts/paperclip-post-heartbeat.sh"
LOG="/Users/djm/claude-projects/logs/paperclip-discord.log"

mkdir -p "$(dirname "$LOG")"

# Initialize state file if missing
if [[ ! -f "$STATE_FILE" ]]; then
  echo '{"last_seen_ids":[]}' > "$STATE_FILE"
fi

# Fetch runs and state, write to temp files to avoid quoting issues
RUNS_FILE=$(mktemp)
curl -s "${PAPERCLIP_URL}/api/companies/${COMPANY_ID}/heartbeat-runs" > "$RUNS_FILE" 2>/dev/null || echo "[]" > "$RUNS_FILE"

# Process new completed runs
python3 - "$RUNS_FILE" "$STATE_FILE" <<'PYEOF'
import sys, json

runs_file = sys.argv[1]
state_file = sys.argv[2]

with open(runs_file) as f:
    try:
        runs = json.load(f)
    except:
        sys.exit(0)

with open(state_file) as f:
    try:
        seen = json.load(f)
    except:
        seen = {"last_seen_ids": []}

seen_ids = set(seen.get("last_seen_ids", []))
new_runs = []

for r in runs[:20]:
    run_id = r.get("id", "")
    status = r.get("status", "")
    if status not in ("succeeded", "failed", "timed_out"):
        continue
    if run_id in seen_ids:
        continue
    agent_id = r.get("agentId", "unknown")
    new_runs.append(run_id)
    print(f"{run_id}|{agent_id}|{status}")

# Update seen list (keep last 100)
all_seen = list(seen_ids | set(new_runs))[-100:]
with open(state_file, "w") as f:
    json.dump({"last_seen_ids": all_seen}, f)
PYEOF

# Re-read the output by running again (python already updated state)
python3 - "$RUNS_FILE" <<'PYEOF2' | while IFS='|' read -r run_id agent_id status; do
import sys, json

runs_file = sys.argv[1]
state_file = "/Users/djm/claude-projects/.runtime/paperclip/.paperclip-discord-state.json"

with open(runs_file) as f:
    runs = json.load(f)

# Load the PREVIOUS state (before this script updated it)
# Actually we need the new runs - re-derive them
with open(state_file) as f:
    current = json.load(f)

current_ids = set(current.get("last_seen_ids", []))

for r in runs[:20]:
    run_id = r.get("id", "")
    status = r.get("status", "")
    if status not in ("succeeded", "failed", "timed_out"):
        continue
    if run_id in current_ids:
        agent_id = r.get("agentId", "unknown")
        print(f"{run_id}|{agent_id}|{status}")
PYEOF2

  # Resolve agent name
  agent_name=$(curl -s "${PAPERCLIP_URL}/api/agents/${agent_id}" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','unknown'))" 2>/dev/null || echo "unknown")

  bash "$POST_SCRIPT" "$agent_name" "$run_id"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Posted ${agent_name} run ${run_id:0:8} (${status})" >> "$LOG"
done

rm -f "$RUNS_FILE"
