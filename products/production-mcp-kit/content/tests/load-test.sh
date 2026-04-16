#!/bin/bash
# Load test — sends N concurrent requests to an MCP server via stdio.
#
# Usage: bash tests/load-test.sh [count] [server-dir]
# Example: bash tests/load-test.sh 50 servers/template
#
# Measures total time and per-request latency.

COUNT="${1:-20}"
SERVER_DIR="${2:-servers/template}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Load test: $COUNT requests to $SERVER_DIR"
echo "---"

# Build the JSON-RPC payload
PAYLOAD='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

TOTAL_START=$(date +%s%N)
PASS=0
FAIL=0

for i in $(seq 1 "$COUNT"); do
  START=$(date +%s%N)

  RESPONSE=$(echo "$PAYLOAD" | timeout 10 bun run "$SCRIPT_DIR/$SERVER_DIR/index.ts" 2>/dev/null)

  END=$(date +%s%N)
  ELAPSED=$(( (END - START) / 1000000 ))

  if echo "$RESPONSE" | grep -q '"tools"'; then
    PASS=$((PASS + 1))
    if [ "$COUNT" -le 10 ]; then
      echo "  Request $i: ${ELAPSED}ms (ok)"
    fi
  else
    FAIL=$((FAIL + 1))
    if [ "$COUNT" -le 10 ]; then
      echo "  Request $i: ${ELAPSED}ms (FAIL)"
    fi
  fi
done

TOTAL_END=$(date +%s%N)
TOTAL_MS=$(( (TOTAL_END - TOTAL_START) / 1000000 ))
AVG_MS=$((TOTAL_MS / COUNT))

echo "---"
echo "Results:"
echo "  Total time: ${TOTAL_MS}ms"
echo "  Avg per request: ${AVG_MS}ms"
echo "  Passed: $PASS / $COUNT"
echo "  Failed: $FAIL / $COUNT"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
