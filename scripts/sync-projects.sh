#!/bin/bash
#
# sync-projects.sh - Agent script to sync project data to website
#
# Usage: ./scripts/sync-projects.sh [options]
#
# This script is called by agents (Beau, Scribe, Kilo) to update
# the projects showcase with latest shipped work.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ENDPOINT="${PROJECTS_API_ENDPOINT:-http://localhost:3456/api/projects/live}"
API_SECRET="${PROJECTS_API_SECRET:-}"

echo "[sync-projects] Starting project sync..."
echo "[sync-projects] API endpoint: $API_ENDPOINT"

# Gather data from sources
echo "[sync-projects] Gathering project data..."

# 1. Get latest Paperclip shipped issues (requires local API)
if command -v curl &> /dev/null; then
    SHIPPED_ISSUES=$(curl -s "http://127.0.0.1:3100/api/companies/c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712/issues?status=done&limit=10" 2>/dev/null || echo "[]")
    echo "[sync-projects] Fetched $(echo "$SHIPPED_ISSUES" | jq -r 'length // 0') shipped issues from Paperclip"
fi

# 2. Get GitHub repo stats (if gh CLI available)
if command -v gh &> /dev/null; then
    echo "[sync-projects] GitHub CLI detected, could fetch repo stats"
    # gh repo list edgeless-ai --json name,updatedAt,pushedAt
fi

# 3. Build update payload
cat > /tmp/projects-update.json << 'EOF'
{
  "source": "agent-sync",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent": "$(whoami)@$(hostname)",
  "projects": [
    {
      "slug": "safety-hooks",
      "status": "Live",
      "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "notes": "Auto-synced from agent script"
    },
    {
      "slug": "mcp-servers",
      "status": "Live",
      "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "notes": "Auto-synced from agent script"
    },
    {
      "slug": "pen-plotter-art",
      "status": "Active",
      "lastActivity": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "notes": "Auto-synced from agent script"
    }
  ]
}
EOF

# 4. Send to API (if running)
if curl -s --head "$API_ENDPOINT" &> /dev/null; then
    echo "[sync-projects] Sending update to API..."
    curl -s -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d @/tmp/projects-update.json | jq -r '.success // false'
    echo "[sync-projects] API update complete"
else
    echo "[sync-projects] API not reachable at $API_ENDPOINT (site may not be running)"
    echo "[sync-projects] Update payload prepared at /tmp/projects-update.json"
fi

echo "[sync-projects] Sync complete at $(date)"

# Usage notes for agents
cat << 'USAGE'

AGENT USAGE NOTES:
=================

To update projects from Paperclip work:

1. Query shipped issues:
   curl -s "http://127.0.0.1:3100/api/companies/c5ea22fb.../issues?status=done"

2. Map issues to projects:
   - EDGA-18XX series -> website improvements
   - EDGA-147 -> The Clapper
   - EDGA-145 -> YouTube pipeline
   - etc.

3. Trigger sync (when site deployed):
   curl -X POST "https://edgelesslab.com/api/projects/live" \
        -H "Content-Type: application/json" \
        -d '{"source":"paperclip","projects":[...]}'

USAGE
