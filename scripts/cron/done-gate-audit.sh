#!/bin/bash
# Done-gate audit (WARN-ONLY) — the deterministic backbone the swarm was missing.
# Scans recent 'done' kanban tasks with .claude/hooks/verify-completion.py and logs
# how many are hollow/unproven. Warn-only: never blocks, never enforces here.
# To ENFORCE (block bad completions), set DONE_GATE_ENFORCE=1 and wire verify-completion
# into the completion path — a deliberate flip after David's review.
set -uo pipefail
cd /Users/djm/claude-projects || exit 1
PY=/opt/homebrew/opt/python@3.11/bin/python3.11
mkdir -p logs
LOG="logs/done-gate-audit-$(date +%Y%m%d_%H%M%S).log"
"$PY" .claude/hooks/verify-completion.py --audit-recent 60 > "$LOG" 2>&1
cat "$LOG"
# Rotate old audit logs (>14d)
find logs -name 'done-gate-audit-*.log' -mtime +14 -delete 2>/dev/null || true
