#!/bin/bash
# Start the message bus: hub first, then the MCP client.
# Usage: bash start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting message bus hub on port ${AGENT_BUS_PORT:-9800}..."
bun run hub.ts &
HUB_PID=$!

# Wait for hub to be ready
for i in {1..10}; do
  if curl -sf http://127.0.0.1:${AGENT_BUS_PORT:-9800}/health > /dev/null 2>&1; then
    echo "Hub ready."
    break
  fi
  sleep 0.5
done

echo "Hub PID: $HUB_PID"
echo "To start an MCP client: bun run index.ts"
echo "To stop: kill $HUB_PID"

wait $HUB_PID
