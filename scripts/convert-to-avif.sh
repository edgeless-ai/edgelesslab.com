#!/bin/bash
# Convert WebP files to AVIF format for pen-plotter gallery
# Target: Generate AVIF fallbacks for all 6,761 gallery images

set -euo pipefail

MEDIUM_DIR="/Users/djm/claude-projects/edgeless-website/pen-plotter/assets/medium"
LOG_FILE="/Users/djm/claude-projects/edgeless-website/scripts/avif-conversion.log"
PID_FILE="/Users/djm/claude-projects/edgeless-website/scripts/avif-conversion.pid"
BATCH_SIZE=50

# Quality settings for AVIF (target: maintain 85%+ perceptual similarity)
AVIF_QUALITY=80
AVIF_SPEED=2  # Slower = better compression

# Ensure only one instance runs
if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
        echo "Conversion already running (PID $pid)"
        exit 1
    fi
fi
echo $$ > "$PID_FILE"

# Cleanup on exit
trap 'rm -f "$PID_FILE"' EXIT

cd "$MEDIUM_DIR"

# Count total work
total_webp=$(ls -1 *.webp 2>/dev/null | wc -l | tr -d ' ')
existing_avif=$(ls -1 *.avif 2>/dev/null | wc -l | tr -d ' ')
remaining=$((total_webp - existing_avif))

echo "=== AVIF Conversion Status $(date) ===" | tee "$LOG_FILE"
echo "Total WebP files: $total_webp" | tee -a "$LOG_FILE"
echo "Existing AVIF files: $existing_avif" | tee -a "$LOG_FILE"
echo "Remaining to convert: $remaining" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$remaining" -eq 0 ]; then
    echo "All files already converted!" | tee -a "$LOG_FILE"
    exit 0
fi

# Convert remaining files
converted=0
errors=0
start_time=$(date +%s)

for webp_file in *.webp; do
    base="${webp_file%.webp}"
    avif_file="${base}.avif"
    
    # Skip if AVIF already exists
    if [ -f "$avif_file" ]; then
        continue
    fi
    
    # Convert WebP -> PNG -> AVIF
    temp_png="/tmp/avif_conv_${base}.png"
    
    if dwebp "$webp_file" -o "$temp_png" 2>/dev/null; then
        if avifenc -q $AVIF_QUALITY -s $AVIF_SPEED "$temp_png" "$avif_file" 2>/dev/null; then
            converted=$((converted + 1))
            rm -f "$temp_png"
            
            # Progress report every 50 files
            if [ $((converted % 50)) -eq 0 ]; then
                elapsed=$(($(date +%s) - start_time))
                rate=$(echo "scale=2; $converted / $elapsed" | bc 2>/dev/null || echo "N/A")
                echo "[$converted/$remaining] ${rate} files/sec - Converted: $webp_file" | tee -a "$LOG_FILE"
            fi
            
            # Batch checkpoint every 100 files
            if [ $((converted % 100)) -eq 0 ]; then
                echo "=== Checkpoint: $converted files converted ===" | tee -a "$LOG_FILE"
            fi
        else
            echo "ERROR: avifenc failed for $webp_file" | tee -a "$LOG_FILE"
            errors=$((errors + 1))
            rm -f "$temp_png" "$avif_file"
        fi
    else
        echo "ERROR: dwebp failed for $webp_file" | tee -a "$LOG_FILE"
        errors=$((errors + 1))
    fi
    
    # Clean temp file if still exists
    rm -f "$temp_png"
done

# Final stats
elapsed=$(($(date +%s) - start_time))
final_avif=$(ls -1 *.avif 2>/dev/null | wc -l | tr -d ' ')

echo "" | tee -a "$LOG_FILE"
echo "=== Conversion Complete $(date) ===" | tee -a "$LOG_FILE"
echo "Duration: ${elapsed}s" | tee -a "$LOG_FILE"
echo "Converted: $converted" | tee -a "$LOG_FILE"
echo "Errors: $errors" | tee -a "$LOG_FILE"
echo "Total AVIF files now: $final_avif" | tee -a "$LOG_FILE"

# Calculate size stats
echo "" | tee -a "$LOG_FILE"
echo "Size stats:" | tee -a "$LOG_FILE"
du -sh . | awk '{print "Directory total: " $1}' | tee -a "$LOG_FILE"

# Sample comparison
echo "" | tee -a "$LOG_FILE"
echo "Sample size comparison (first 5 files):" | tee -a "$LOG_FILE"
for f in *.avif | head -5; do
    if [ -f "$f" ]; then
        base="${f%.avif}"
        webp_size=$(stat -f%z "${base}.webp" 2>/dev/null || echo "0")
        avif_size=$(stat -f%z "$f" 2>/dev/null || echo "0")
        echo "$base: ${webp_size}b WebP -> ${avif_size}b AVIF" | tee -a "$LOG_FILE"
    fi
done