#!/bin/bash
# Deploy pen-plotter assets to Cloudflare R2
# Usage: ./deploy-pen-plotter-assets.sh [--dry-run]

set -euo pipefail

ASSETS_DIR="/Users/djm/claude-projects/edgeless-website/public/pen-plotter/assets"
R2_BUCKET="r2:edgeless-assets/pen-plotter/assets"
RCLONE_FLAGS="--progress --transfers=32 --checksum"

if [[ "${1:-}" == "--dry-run" ]]; then
    echo "[DRY RUN] Would sync: $ASSETS_DIR -> $R2_BUCKET"
    rclone check "$ASSETS_DIR" "$R2_BUCKET" 2>/dev/null || true
    exit 0
fi

echo "Syncing pen-plotter assets to Cloudflare R2..."
echo "Source: $ASSETS_DIR"
echo "Destination: $R2_BUCKET"
echo ""

# Sync to R2 (files only, preserving structure)
rclone sync \
    "$ASSETS_DIR" \
    "$R2_BUCKET" \
    $RCLONE_FLAGS \
    --exclude ".DS_Store" \
    --exclude "*.tmp"

echo ""
echo "✓ Assets deployed to R2"
echo "  Public URL: https://assets.edgelesslab.com/pen-plotter/assets/"
