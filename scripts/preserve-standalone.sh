#!/bin/bash
#
# Preserve standalone content directories across Next.js builds.
#
# These directories contain non-Next.js content (editorial pages, apps,
# static experiments) that live alongside the Next.js output. The Next.js
# build does not know about them, so any "git add -A" after a build will
# mark them as deleted if they were removed from the working tree.
#
# This script:
# 1. As "save": copies standalone dirs to a temp location before build
# 2. As "restore": copies them back after build
#
# Usage in package.json:
#   "prebuild": "./scripts/preserve-standalone.sh save",
#   "postbuild": "./scripts/preserve-standalone.sh restore"
#
# Created: 2026-04-15 (after tartanism/ was deleted twice by rebuild commits)

set -uo pipefail
# NOTE: not using -e because cp on large dirs (pen-plotter 25K+ files)
# can fail on individual files without meaning the whole operation failed.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STASH_DIR="$PROJECT_DIR/.standalone-stash"

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
    echo "[preserve] Saving standalone directories..."
    rm -rf "$STASH_DIR"
    mkdir -p "$STASH_DIR"
    for dir in "${STANDALONE_DIRS[@]}"; do
      if [ -d "$PROJECT_DIR/$dir" ]; then
        if rsync -a "$PROJECT_DIR/$dir/" "$STASH_DIR/$dir/" 2>/dev/null; then
          echo "  saved $dir"
        else
          # Fallback: tar preserves everything even with many files
          tar cf - -C "$PROJECT_DIR" "$dir" | tar xf - -C "$STASH_DIR" 2>/dev/null
          echo "  saved $dir (via tar fallback)"
        fi
      fi
    done
    echo "[preserve] Done."
    ;;

  restore)
    echo "[preserve] Restoring standalone directories..."
    if [ ! -d "$STASH_DIR" ]; then
      echo "[preserve] No stash found. Nothing to restore."
      exit 0
    fi
    for dir in "${STANDALONE_DIRS[@]}"; do
      if [ -d "$STASH_DIR/$dir" ]; then
        rm -rf "$PROJECT_DIR/$dir"
        if rsync -a "$STASH_DIR/$dir/" "$PROJECT_DIR/$dir/" 2>/dev/null; then
          echo "  restored $dir"
        else
          tar cf - -C "$STASH_DIR" "$dir" | tar xf - -C "$PROJECT_DIR" 2>/dev/null
          echo "  restored $dir (via tar fallback)"
        fi
      fi
    done
    rm -rf "$STASH_DIR"
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
      echo "Run: ./scripts/preserve-standalone.sh restore"
      exit 1
    fi
    ;;

  *)
    echo "Usage: $0 {save|restore|check}"
    exit 1
    ;;
esac
