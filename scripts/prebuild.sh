#!/bin/bash
# prebuild.sh — chained prebuild for edgeless-website
# Runs before next build: activity feed generation + standalone preserve
set -e

# Execute all scripts relative to project root (where package.json lives)
cd "$(dirname "$0")/.."

mkdir -p .cache

# 1. Generate ship-log / site-activity.json
echo "[prebuild] Generating ship-log feed..."
python3 scripts/generate-activity-feed.py

# 2. Original standalone.sh preserve (renders/encrypts assets)
echo "[prebuild] Preserving standalone render output..."
./scripts/preserve-standalone.sh save

echo "[prebuild] Done."
