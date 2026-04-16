#!/bin/bash
# Health check test — starts an MCP server and verifies it responds.
#
# Usage: bash tests/health-check.sh [server-dir]
# Example: bash tests/health-check.sh servers/template
#
# Exit code 0 = healthy, 1 = failed

set -e

SERVER_DIR="${1:-servers/template}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Testing health check for ${SERVER_DIR}..."

# Start the server as a background process
cd "$SCRIPT_DIR"
bun run "${SERVER_DIR}/index.ts" &
SERVER_PID=$!

# Give it a moment to initialize
sleep 1

# Send a tools/list request via stdin
RESPONSE=$(echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}' | timeout 5 bun run "${SERVER_DIR}/index.ts" 2>/dev/null || true)

# Kill the background server
kill "$SERVER_PID" 2>/dev/null || true

# Check the response contains tools
if echo "$RESPONSE" | grep -q '"tools"'; then
  echo "PASS: Server responded with tool list"
  # Check for health_check tool specifically
  if echo "$RESPONSE" | grep -q 'health_check'; then
    echo "PASS: health_check tool present"
  else
    echo "WARN: no health_check tool found (optional but recommended)"
  fi
  exit 0
else
  echo "FAIL: Server did not respond with valid tool list"
  echo "Response: $RESPONSE"
  exit 1
fi
