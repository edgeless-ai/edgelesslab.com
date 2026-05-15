#!/bin/bash
# Parallel AVIF conversion using xargs for speed
# Usage: ./parallel-avif-convert.sh [jobs]

MEDIUM_DIR="/Users/djm/claude-projects/edgeless-website/pen-plotter/assets/medium"
JOBS="${1:-4}"
LOG_DIR="/tmp/avif-logs"

mkdir -p "$LOG_DIR"

# Function to convert single file
convert_one() {
    local webp="$1"
    local avif="${webp%.webp}.avif"
    local log="$LOG_DIR/$(basename "$webp" .webp).log"
    
    if [[ -f "$avif" && "$avif" -nt "$webp" ]]; then
        echo "SKIP: $webp"
        return 0
    fi
    
    if ffmpeg -i "$webp" -c:v libsvtav1 -crf 30 -preset 6 "$avif" -y 2>/dev/null; then
        local webp_size=$(stat -f%z "$webp" 2>/dev/null)
        local avif_size=$(stat -f%z "$avif" 2>/dev/null)
        local savings=$(( (webp_size - avif_size) * 100 / webp_size ))
        echo "OK: $(basename "$webp") -> ${savings}% smaller"
    else
        echo "ERR: $(basename "$webp")" >&2
    fi
}

export -f convert_one
export LOG_DIR

echo "=== Parallel AVIF Conversion ($JOBS jobs) ==="
echo "Source: $MEDIUM_DIR"
echo ""

# Count and convert
TOTAL=$(find "$MEDIUM_DIR" -name "*.webp" | wc -l)
echo "Total WebP files: $TOTAL"
echo "Starting conversion with $JOBS parallel jobs..."
echo ""

# Run parallel conversion
find "$MEDIUM_DIR" -name "*.webp" -type f | xargs -P "$JOBS" -I {} bash -c 'convert_one "$@"' _ {}

echo ""
echo "=== Complete ==="
AVIF_COUNT=$(find "$MEDIUM_DIR" -name "*.avif" | wc -l)
echo "AVIF files: $AVIF_COUNT / $TOTAL"
