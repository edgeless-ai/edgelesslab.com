#!/bin/bash
# Taxonomy check (WARN-ONLY) — surfaces canonical-location drift without blocking.
# The linter exists (taxonomy-triage.py --check) but was unscheduled + defanged to
# warn-only. This runs it on a schedule and logs the violation count so drift is
# visible. Warn-only by design: there are pre-existing violations; enforcing (exit 1)
# in pre-commit/CI would block all commits. Flip to enforce only after David triages
# the existing 24 (then set TAXONOMY_STRICT=1 in the pre-commit gate).
set -uo pipefail
cd /Users/djm/claude-projects || exit 1
PY=/opt/homebrew/opt/python@3.11/bin/python3.11
mkdir -p logs
LOG="logs/taxonomy-check-$(date +%Y%m%d_%H%M%S).log"
"$PY" scripts/cron/taxonomy-triage.py --check > "$LOG" 2>&1 || true
tail -1 "$LOG"
find logs -name 'taxonomy-check-*.log' -mtime +14 -delete 2>/dev/null || true
