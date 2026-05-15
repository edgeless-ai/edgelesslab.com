#!/bin/bash
# Gallery optimization script: PNG→WebP→AVIF
# Creates multiple format variants for best compression with fallbacks

set -e

PEN_PLOTTER_DIR="/Users/djm/claude-projects/edgeless-website/pen-plotter/assets"
WEBP_QUALITY=85
AVIF_QUALITY=80
LOG_FILE="/tmp/gallery-optimization-$(date +%Y%m%d-%H%M%S).log"

# Stats
PNG_TO_WEBP=0
PNG_TO_AVIF=0
WEBP_TO_AVIF=0
TOTAL_ORIGINAL_SIZE=0
TOTAL_NEW_SIZE=0

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check tools
for tool in cwebp avifenc; do
    if ! command -v $tool &> /dev/null; then
        echo "Error: $tool not found. Install with: brew install webp libavif"
        exit 1
    fi
done

# Function: convert PNG to WebP
png_to_webp() {
    local input="$1"
    local output="${input%.png}.webp"
    
    if [[ ! -f "$output" ]] || [[ "$input" -nt "$output" ]]; then
        cwebp -q $WEBP_QUALITY -mt "$input" -o "$output" 2>/dev/null
        echo "$(basename "$input") → WebP"
        return 0
    fi
    return 1
}

# Function: create AVIF from any image
create_avif() {
    local input="$1"
    local output="${input%.*}.avif"
    
    if [[ ! -f "$output" ]] || [[ "$input" -nt "$output" ]]; then
        # Use avifenc with quality settings optimized for artwork
        avifenc --min 0 --max 63 -q $AVIF_QUALITY \
                -a end-usage=q -a tune=ssim \
                "$input" "$output" 2>/dev/null || true
        if [[ -f "$output" ]]; then
            echo "$(basename "$input") → AVIF"
            return 0
        fi
    fi
    return 1
}

log "=== Gallery Optimization Started ==="
log "Source: $PEN_PLOTTER_DIR"

# 1. Convert remaining PNGs to WebP and AVIF
log "Phase 1: Converting remaining PNGs..."
find "$PEN_PLOTTER_DIR" -type f -name "*.png" | while read -r png; do
    if png_to_webp "$png"; then
        PNG_TO_WEBP=$((PNG_TO_WEBP + 1))
    fi
    if create_avif "$png"; then
        PNG_TO_AVIF=$((PNG_TO_AVIF + 1))
    fi
done
log "Phase 1 complete: $PNG_TO_WEBP PNG→WebP, $PNG_TO_AVIF PNG→AVIF"

# 2. Create AVIF versions of medium/ gallery (priority for size reduction)
log "Phase 2: Creating AVIF for medium/ gallery..."
MEDIUM_DIR="$PEN_PLOTTER_DIR/medium"
BATCH_COUNT=0
BATCH_SIZE=100

find "$MEDIUM_DIR" -type f -name "*.webp" | head -1000 | while read -r webp; do
    if create_avif "$webp"; then
        WEBP_TO_AVIF=$((WEBP_TO_AVIF + 1))
        BATCH_COUNT=$((BATCH_COUNT + 1))
        
        if [[ $((BATCH_COUNT % BATCH_SIZE)) -eq 0 ]]; then
            log "  Batch: $BATCH_COUNT AVIF created..."
        fi
    fi
done

log "Phase 2 complete: $WEBP_TO_AVIF WebP→AVIF"

# Summary
log "=== Optimization Summary ==="
log "PNG→WebP:  $PNG_TO_WEBP"
log "PNG→AVIF:  $PNG_TO_AVIF"
log "WebP→AVIF: $WEBP_TO_AVIF (demo batch)"
log ""
log "Next steps for full deployment:"
log "- Run full conversion: find $MEDIUM_DIR -name '*.webp' -exec avifenc..."
log "- Update HTML to use <picture> with srcset"
log "- Verify AVIF fallbacks in browsers"
