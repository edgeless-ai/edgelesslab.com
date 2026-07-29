#!/bin/bash
#
# Verify standalone content directories across Next.js builds.
#
# These directories contain non-Next.js source material. They live outside
# the generated out/ directory, so Next.js does not modify them during a build.
#
# This script:
# 1. Verifies the source directories exist before the build
# 2. Verifies they still exist after the build
#
# Usage in package.json:
#   "prebuild": "./scripts/preserve-standalone.sh save",
#   "postbuild": "./scripts/preserve-standalone.sh restore"
#
# The earlier implementation copied hundreds of megabytes into a temporary
# stash, deleted the tracked source, and rebuilt it from that stash. A partial
# copy could therefore destroy clean source files. Verification is sufficient.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Standalone directories to preserve (add new ones here)
# NOTE: flow-viz is served from public/flow-viz/ (copied into out/ by the Next
# build), so the redundant root copy was removed and is no longer preserved here.
STANDALONE_DIRS=(
  "pen-plotter"
  "tartanism"
  "total-serialism"
)

case "${1:-}" in
  save)
    echo "[preserve] Verifying standalone source before build..."
    for dir in "${STANDALONE_DIRS[@]}"; do
      test -d "$PROJECT_DIR/$dir"
      echo "  verified $dir"
    done
    echo "[preserve] Done."
    ;;

  restore)
    echo "[preserve] Verifying standalone source after build..."
    for dir in "${STANDALONE_DIRS[@]}"; do
      test -d "$PROJECT_DIR/$dir"
      echo "  verified $dir"
    done
    echo "[preserve] Done."
    ;;

  check)
    # Verify all standalone dirs exist (for CI or pre-commit)
    missing=0
    for dir in "${STANDALONE_DIRS[@]}"; do
      if [ ! -d "$PROJECT_DIR/$dir" ]; then
        echo "MISSING: $dir/"
        missing=$((missing + 1))
      else
        echo "OK: $dir/ ($(find "$PROJECT_DIR/$dir" -type f | wc -l | tr -d ' ') files)"
      fi
    done
    if [ "$missing" -gt 0 ]; then
      echo ""
      echo "ERROR: $missing standalone directory(s) missing!"
      exit 1
    fi
    ;;

  *)
    echo "Usage: $0 {save|restore|check}"
    exit 1
    ;;
esac
