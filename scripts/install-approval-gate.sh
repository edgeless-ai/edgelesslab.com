#!/bin/bash
# Install the approval gate into .git/hooks/pre-commit
# Usage: ./scripts/install-approval-gate.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_PATH="$PROJECT_ROOT/.git/hooks/pre-commit"
GATE_REF='GATE_PATH="/Users/djm/claude-projects/scripts/approval-gate.py"'

if [ ! -f "$HOOK_PATH" ]; then
    echo "Creating pre-commit hook..."
    cat > "$HOOK_PATH" << 'EOF'
#!/bin/bash
set -e
EOF
    chmod +x "$HOOK_PATH"
fi

# Check if gate is already installed
if grep -q "approval-gate.py" "$HOOK_PATH"; then
    echo "✅ Approval gate already installed in pre-commit hook"
    exit 0
fi

# Append the approval gate section
cat >> "$HOOK_PATH" << 'EOF'

# Run approval gate for all staged changes
# This ensures tiered review for code touches and data mutations
GATE_PATH="/Users/djm/claude-projects/scripts/approval-gate.py"
if [ -f "$GATE_PATH" ]; then
  echo "🔒 Running approval gate..."
  if python3 "$GATE_PATH"; then
    echo "✅ Approval gate passed"
  else
    GATE_EXIT=$?
    if [ "$GATE_EXIT" = 2 ]; then
      echo "⚠️  Approval gate bypassed (emergency)"
    else
      echo ""
      echo "❌ APPROVAL GATE BLOCKED"
      echo ""
      echo "This commit touches files that require review before landing."
      echo "See instructions above to record approvals."
      echo ""
      exit $GATE_EXIT
    fi
  fi
else
  echo "⚠️  Approval gate not found at $GATE_PATH"
fi
EOF

echo "✅ Approval gate installed to $HOOK_PATH"
echo "   The gate will run on every commit, requiring approvals for code changes."
