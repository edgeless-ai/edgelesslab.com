#!/bin/bash
# Flip comingSoon flags in src/lib/data.ts ONLY for products whose Gumroad URL returns 200.
# Per feedback_no_dead_links.md: never flip a product until its URL is live.
#
# Usage: ./scripts/flip-coming-soon.sh
#
# Edits data.ts in place. Review with `git diff` before committing.

set -euo pipefail

DATA_FILE="$(dirname "$0")/../src/lib/data.ts"

# slug -> product display name
SLUGS=(
  "agent-safety-patterns"
  "hooks-deep-dive"
  "production-mcp-kit"
  "n8n-ai-workflows"
  "multi-agent-blueprint"
  "gen-art-starter"
  "launch-toolkit"
)

flipped=0
skipped=0

for slug in "${SLUGS[@]}"; do
  url="https://edgelessai.gumroad.com/l/$slug"
  status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")

  if [ "$status" = "200" ]; then
    # Find the line with this slug's href, then flip the next 2 lines (badge + comingSoon)
    if grep -q "l/$slug?" "$DATA_FILE"; then
      # Use perl for in-place edit (BSD sed -i is awkward on macOS)
      perl -i -pe "
        if (/l\/$slug\?/) { \$found = 1; }
        if (\$found && /badge: \"Coming Soon\"/) { s/\"Coming Soon\"/\"New\"/; }
        if (\$found && /comingSoon: true/) { s/comingSoon: true/comingSoon: false/; \$found = 0; }
      " "$DATA_FILE"
      echo "FLIPPED: $slug ($url -> 200)"
      flipped=$((flipped + 1))
    else
      echo "WARN: $slug not found in data.ts"
    fi
  else
    echo "SKIP: $slug (status $status, NOT live)"
    skipped=$((skipped + 1))
  fi
done

echo ""
echo "Flipped: $flipped | Skipped: $skipped"
echo ""
echo "Review with: git diff src/lib/data.ts"
echo "Then build:  npx next build && rm -rf _next && cp -r out/* ."
