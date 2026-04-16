#!/usr/bin/env bash
#
# verify-links.sh -- Check that Gumroad product URLs return HTTP 200.
#
# Usage:
#   ./verify-links.sh urls.txt
#   echo "https://example.gumroad.com/l/product" | ./verify-links.sh
#
# Input: one URL per line (file argument or stdin)
# Output: PASS/FAIL for each URL with HTTP status code

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass=0
fail=0

check_url() {
    local url="$1"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$status" = "200" ]; then
        printf "${GREEN}PASS${NC} [%s] %s\n" "$status" "$url"
        ((pass++))
    else
        printf "${RED}FAIL${NC} [%s] %s\n" "$status" "$url"
        ((fail++))
    fi
}

# Read from file argument or stdin
input="${1:--}"

while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" == \#* ]] && continue
    check_url "$line"
done < "$input"

echo ""
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
    exit 1
fi
