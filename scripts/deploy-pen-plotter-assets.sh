#!/bin/bash
#
# Deploy pen-plotter assets to Cloudflare R2 (task-306)
#
# Prerequisites:
#   brew install rclone
#   rclone config (set up "r2" remote, see ~/.config/rclone/rclone.conf)
#
# Usage:
#   ./scripts/deploy-pen-plotter-assets.sh          # sync all assets
#   ./scripts/deploy-pen-plotter-assets.sh --dry-run # preview changes

set -euo pipefail

BUCKET="edgeless-assets"
REMOTE="r2"
LOCAL="public/pen-plotter/assets/"
DEST="${REMOTE}:${BUCKET}/pen-plotter/assets/"

cd "$(dirname "$0")/.."

if [ ! -d "$LOCAL" ]; then
    echo "ERROR: $LOCAL not found. Are you in the edgeless-website directory?"
    exit 1
fi

ARGS=("--progress" "--transfers=32" "--checksum")

if [[ "${1:-}" == "--dry-run" ]]; then
    ARGS+=("--dry-run")
    echo "[DRY RUN] Would sync $LOCAL -> $DEST"
fi

echo "Syncing pen-plotter assets to Cloudflare R2..."
rclone sync "$LOCAL" "$DEST" "${ARGS[@]}"

echo "Done. Assets live at https://assets.edgelesslab.com/pen-plotter/assets/"
