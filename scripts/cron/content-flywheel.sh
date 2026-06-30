#!/bin/bash
# shellcheck shell=bash
# Content Flywheel - Weekly KB-to-Blog Pipeline
# Scans vault KB articles for high-value content, generates blog draft candidates,
# and logs what's available for the content-to-revenue loop.
#
# Usage:
#   scripts/cron/content-flywheel.sh              # scan + report
#   DRAFT=1 scripts/cron/content-flywheel.sh      # also generate draft stubs
#
# Cron: Mondays at 9:17 AM PST
set -euo pipefail

PROJECT_DIR="/Users/djm/claude-projects"
LOG_DIR="$PROJECT_DIR/logs/content-flywheel"
LOG_FILE="$LOG_DIR/flywheel-$(date +%Y%m%d_%H%M%S).log"
PYTHON="/opt/homebrew/opt/python@3.11/bin/python3.11"
DRAFTS_DIR="$PROJECT_DIR/edgeless-website/drafts"
KB_YOUTUBE="$PROJECT_DIR/claude-vault/03-Knowledge/YouTube"
KB_RSS="$PROJECT_DIR/claude-vault/03-Knowledge/RSS"

mkdir -p "$LOG_DIR" "$DRAFTS_DIR"
cd "$PROJECT_DIR"

exec > >(tee -a "$LOG_FILE") 2>&1
echo "=== Content Flywheel $(date) ==="

# Count KB articles by age
WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
echo ""
echo "--- KB Articles (last 7 days) ---"

NEW_YT=0
NEW_RSS=0

if [ -d "$KB_YOUTUBE" ]; then
    NEW_YT=$(find "$KB_YOUTUBE" -name "*.md" -newer "$LOG_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "YouTube KB: $NEW_YT new articles"
fi

if [ -d "$KB_RSS" ]; then
    NEW_RSS=$(find "$KB_RSS" -name "*.md" -newer "$LOG_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "RSS KB: $NEW_RSS new articles"
fi

TOTAL=$((NEW_YT + NEW_RSS))
echo "Total new KB: $TOTAL"

# Check existing drafts
DRAFT_COUNT=$(find "$DRAFTS_DIR" -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "--- Existing Drafts ---"
echo "Drafts pending: $DRAFT_COUNT"
if [ "$DRAFT_COUNT" -gt 0 ]; then
    ls -1 "$DRAFTS_DIR"/*.md 2>/dev/null | while read f; do
        title=$(head -5 "$f" | grep "^title:" | sed 's/title: *"//;s/"$//')
        status=$(head -10 "$f" | grep "^status:" | sed 's/status: *//')
        echo "  - $title [$status]"
    done
fi

# Check blog posts with product links
echo ""
echo "--- Product Cross-Links ---"
BLOG_DIR="$PROJECT_DIR/edgeless-website/src/lib"
if [ -f "$BLOG_DIR/blog.ts" ]; then
    LINKED=$(grep -c "productSlug" "$BLOG_DIR/blog.ts" 2>/dev/null || echo 0)
    echo "Blog posts with product links: $LINKED"
fi

# Summary
echo ""
echo "=== Summary ==="
echo "New KB articles: $TOTAL"
echo "Pending drafts: $DRAFT_COUNT"
echo "Action: $([ "$TOTAL" -gt 0 ] && echo 'New content available for blog drafts' || echo 'No new KB content this week')"

# Touch a marker so next run can compare
touch "$LOG_DIR/.last-run"

echo ""
echo "=== Done $(date) ==="
