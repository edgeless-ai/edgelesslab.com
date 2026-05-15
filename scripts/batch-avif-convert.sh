#!/bin/bash
# Batch convert WebP gallery to AVIF using ffmpeg
# Creates AVIF alongside WebP for browser fallback

set -e

MEDIUM_DIR="/Users/djm/claude-projects/edgeless-website/pen-plotter/assets/medium"
LOG_FILE="/tmp/avif-batch-$(date +%Y%m%d-%H%M%S).log"

# Progress tracking
TOTAL=$(find "$MEDIUM_DIR" -name "*.webp" | wc -l)
DONE=0
CREATED=0
SKIPPED=0
ERRORS=0
START_TIME=$(date +%s)

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Convert single file
convert_file() {
    local webp="$1"
    local avif="${webp%.webp}.avif"
    
    # Skip if already exists and is newer
    if [[ -f "$avif" && "$avif" -nt "$webp" ]]; then
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
    
    # Convert with ffmpeg (libsvtav1 for speed, crf 30 for quality/size balance)
    if ffmpeg -i "$webp" -c:v libsvtav1 -crf 30 -preset 6 "$avif" -y 2>/dev/null; then
        CREATED=$((CREATED + 1))
        
        # Show progress every 100 files
        if [[ $((CREATED % 100)) -eq 0 ]]; then
            local elapsed=$(( $(date +%s) - START_TIME ))
            local rate=$(( CREATED / (elapsed + 1) ))
            local remaining=$(( (TOTAL - DONE) / (rate + 1) ))
            log "Progress: $CREATED created, $SKIPPED skipped ($rate files/sec, ~${remaining}s remaining)"
        fi
        return 0
    else
        ERRORS=$((ERRORS + 1))
        log "ERROR: Failed to convert $(basename "$webp")"
        return 1
    fi
}

# Main conversion
log "=== AVIF Batch Conversion ==="
log "Source: $MEDIUM_DIR"
log "Total WebP files: $TOTAL"
log ""

# Process all WebP files
find "$MEDIUM_DIR" -name "*.webp" -type f | while read -r webp; do
    convert_file "$webp"
    DONE=$((DONE + 1))
done

# Calculate savings
log ""
log "=== Summary ==="
log "Total WebP files: $TOTAL"
log "AVIF created:    $CREATED"
log "Skipped (exist): $SKIPPED"
log "Errors:          $ERRORS"

# Calculate size savings sample
SAMPLE_SIZE=100
SAMPLE_WEBP=$(find "$MEDIUM_DIR" -name "*.webp" | head -$SAMPLE_SIZE | xargs stat -f%z 2>/dev/null | awk '{sum+=$1} END {print sum}')
SAMPLE_AVIF=$(find "$MEDIUM_DIR" -name "*.avif" | head -$SAMPLE_SIZE | xargs stat -f%z 2>/dev/null | awk '{sum+=$1} END {print sum}')

if [[ -n "$SAMPLE_WEBP" && -n "$SAMPLE_AVIF" && "$SAMPLE_WEBP" -gt 0 ]]; then
    SAVINGS=$(( (SAMPLE_WEBP - SAMPLE_AVIF) * 100 / SAMPLE_WEBP ))
    log "Sample size savings (first $SAMPLE_SIZE files): ${SAVINGS}%"
fi

log "Log file: $LOG_FILE"
