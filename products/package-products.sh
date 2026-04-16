#!/bin/bash
# Package all product content directories into Gumroad-ready ZIPs
# Usage: bash products/package-products.sh [product-slug]
# Without arguments, packages all 7 new products.

set -e

PRODUCTS_DIR="$(cd "$(dirname "$0")" && pwd)"
COVERS_DIR="/Users/djm/claude-projects/products/covers"

PRODUCTS=(
  "hooks-deep-dive"
  "agent-safety-patterns"
  "n8n-ai-workflows"
  "production-mcp-kit"
  "multi-agent-blueprint"
  "gen-art-starter"
  "launch-toolkit"
)

# If a specific product is given, only package that one
if [ -n "$1" ]; then
  PRODUCTS=("$1")
fi

for slug in "${PRODUCTS[@]}"; do
  content_dir="${PRODUCTS_DIR}/${slug}/content"
  zip_path="${PRODUCTS_DIR}/${slug}/${slug}.zip"
  cover_path="${COVERS_DIR}/${slug}-cover.png"

  if [ ! -d "$content_dir" ]; then
    echo "SKIP: $slug (no content/ directory)"
    continue
  fi

  echo "Packaging: $slug"

  # Remove old ZIP if exists
  rm -f "$zip_path"

  # Create ZIP from content directory
  cd "$content_dir"
  zip -r "$zip_path" . -x "*.DS_Store" -x "__MACOSX/*" > /dev/null

  # Add cover image if it exists
  if [ -f "$cover_path" ]; then
    cd "$(dirname "$zip_path")"
    zip -j "$zip_path" "$cover_path" > /dev/null
    echo "  + cover image"
  fi

  size=$(stat -f%z "$zip_path" 2>/dev/null || stat --printf="%s" "$zip_path")
  size_kb=$((size / 1024))
  file_count=$(cd "$content_dir" && find . -type f | wc -l | tr -d ' ')
  echo "  -> ${slug}.zip (${size_kb}KB, ${file_count} files)"
done

echo ""
echo "Done! ZIPs ready for Gumroad upload."
