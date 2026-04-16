#!/usr/bin/env python3
"""
Template: Stop Gate
Conditionally blocks session exit until a condition is met.

Register in settings.json under hooks.Stop. No matcher needed.

Exit codes:
  0 -- Allow session exit
  2 -- Block session exit (session continues)

Use stderr for messages that appear in the Claude Code UI.

Example registration (settings.json):
  {
    "hooks": {
      "Stop": [
        {
          "hooks": [{"type": "command", "command": ".claude/hooks/my-gate.py"}]
        }
      ]
    }
  }
"""

import json
import sys
from pathlib import Path

# -----------------------------------------------------------------------
# CUSTOMIZE: Define your exit condition
# -----------------------------------------------------------------------


def should_block_exit():
    """Check if session exit should be blocked.

    Returns:
        (block, reason) tuple. block=True to prevent exit.

    Examples of conditions you might check:
      - A "work in progress" marker file exists
      - Uncommitted git changes are present
      - A required report has not been generated
      - A task list has unchecked items
    """
    # Example: block exit if a WIP marker exists
    wip_marker = Path(".claude/.wip")
    if wip_marker.exists():
        try:
            task = wip_marker.read_text().strip()
        except Exception:
            task = "unknown task"
        return True, f"Work in progress: {task}. Complete or remove .claude/.wip to exit."

    # Example: block exit if a required file is missing
    required_file = Path("CHANGELOG.md")
    if not required_file.exists():
        return True, "CHANGELOG.md is missing. Create it before ending the session."

    return False, ""


def main():
    # Read stdin (may contain conversation context)
    try:
        hook_input = json.loads(sys.stdin.read(100_000))
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    block, reason = should_block_exit()

    if block:
        print(f"\nSESSION EXIT BLOCKED", file=sys.stderr)
        print(f"   {reason}\n", file=sys.stderr)
        sys.exit(2)  # Block exit
    else:
        sys.exit(0)  # Allow exit


if __name__ == "__main__":
    main()
