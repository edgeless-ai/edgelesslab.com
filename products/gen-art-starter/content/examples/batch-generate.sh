#!/usr/bin/env bash
# batch-generate.sh
# Runs every generator with default parameters.
# Output lands in output/ relative to the content root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$ROOT_DIR/output"
GEN_DIR="$ROOT_DIR/generators"

mkdir -p "$OUTPUT_DIR"

echo "=== Generative Art Starter Kit: Batch Generate ==="
echo "Output directory: $OUTPUT_DIR"
echo ""

echo "[1/6] Flow field..."
python3 "$GEN_DIR/flow_field.py" --output "$OUTPUT_DIR/flow_field.svg"

echo "[2/6] Reaction-diffusion..."
python3 "$GEN_DIR/reaction_diffusion.py" --output "$OUTPUT_DIR/reaction_diffusion.svg"

echo "[3/6] Circle packing..."
python3 "$GEN_DIR/circle_packing.py" --output "$OUTPUT_DIR/circle_packing.svg"

echo "[4/6] Moire pattern..."
python3 "$GEN_DIR/moire.py" --output "$OUTPUT_DIR/moire.svg"

echo "[5/6] L-system (plant preset)..."
python3 "$GEN_DIR/l_system.py" --output "$OUTPUT_DIR/l_system.svg"

echo "[6/6] Recursive subdivision..."
python3 "$GEN_DIR/subdivide.py" --output "$OUTPUT_DIR/subdivide.svg"

echo ""
echo "Done. Generated 6 SVGs in $OUTPUT_DIR/"
echo ""
echo "Score them:"
echo "  for f in $OUTPUT_DIR/*.svg; do python3 $ROOT_DIR/scoring/score.py \"\$f\"; done"
