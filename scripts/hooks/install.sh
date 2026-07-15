#!/bin/bash
# Install the version-controlled pre-commit gate into this repo/worktree's .git/hooks.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
echo "installed pre-commit gate -> $(git rev-parse --show-toplevel)/.git/hooks/pre-commit"
