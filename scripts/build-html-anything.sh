#!/bin/bash
set -e

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
HTML_ANYTHING_NEXT_DIR="$PROJECT_DIR/../github-repos/html-anything/next"
OUTPUT_DIR="$PROJECT_DIR/out/html-anything"

echo "Building html-anything..."
cd "$HTML_ANYTHING_NEXT_DIR"

# Backup existing next.config.ts if present
if [ -f next.config.ts ]; then
  cp next.config.ts next.config.ts.bak
fi

# Write temporary next.config.ts with export settings
cat > next.config.ts <<'EOE'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
EOE

# Build the app (this will produce an 'out' directory due to output: 'export')
pnpm run build

# Copy the output to the edgeless lab's out directory
rm -rf "$OUTPUT_DIR"
cp -r out "$OUTPUT_DIR"

# Restore the original next.config.ts if we backed it up
if [ -f next.config.ts.bak ]; then
  mv next.config.ts.bak next.config.ts
fi

echo "html-anything built and copied to $OUTPUT_DIR"