#!/usr/bin/env python3
"""
loop-stop-hook.py -- Stop Hook
Prevents Claude from exiting prematurely during active autonomous loops.

Checks for an active loop state file and blocks session exit if a loop is
in progress. Respects safety limits: max iterations (50), max duration (8h),
and explicit completion signals in the conversation context.

Exit codes:
  0 -- Allow session exit (no active loop or safety limit reached)
  2 -- Block session exit (loop active, keep working)

Stdin JSON (Stop):
  {}  -- or may contain conversation context

Integration:
  - Create a marker file at LOOP_MARKER_PATH to indicate a loop is active
  - Delete the marker or emit a completion signal to allow exit
  - Safety limits prevent runaway loops
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# -----------------------------------------------------------------------
# CUSTOMIZE THESE for your project
# -----------------------------------------------------------------------

PROJECT_DIR = Path(
    os.environ.get("CLAUDE_PROJECT_DIR", Path(__file__).parent.parent.parent)
)

# Marker file that indicates a loop is active.
# Create this file to activate loop blocking; delete it to allow exit.
LOOP_MARKER_PATH = PROJECT_DIR / ".claude" / ".loop-active.md"

# Legacy JSON state file (optional, for richer loop metadata)
STATE_FILE = PROJECT_DIR / ".claude" / "loops" / "state.json"

# Safety limits
MAX_ITERATIONS = 50
MAX_SESSION_DURATION_HOURS = 8

# Strings that signal loop completion (checked against stdin JSON)
COMPLETION_SIGNALS = [
    "COMPLETE",
    "ALL PROJECTS COMPLETE",
    "task completed and verified",
]

# -----------------------------------------------------------------------


def load_state():
    """Load loop state from JSON file."""
    if not STATE_FILE.exists():
        return {}
    try:
        with open(STATE_FILE) as f:
            state = json.load(f)
            return state if isinstance(state, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def is_loop_active(state):
    """Determine if a loop is currently active."""
    has_marker = LOOP_MARKER_PATH.exists()
    has_project = bool(state.get("current_project"))
    return has_marker or has_project


def check_iteration_limit(state):
    """Check if iteration limit exceeded. Returns (exceeded, message)."""
    iteration = state.get("iteration", 0)
    if iteration >= MAX_ITERATIONS:
        return True, f"Max iterations ({MAX_ITERATIONS}) reached."
    return False, ""


def check_session_duration(state):
    """Check if session has exceeded duration limit. Returns (exceeded, message)."""
    session_start = state.get("session_start")
    if not session_start:
        return False, ""
    try:
        start = datetime.fromisoformat(session_start.replace("Z", "+00:00"))
        hours = (datetime.now().astimezone() - start.astimezone()).total_seconds() / 3600
        if hours >= MAX_SESSION_DURATION_HOURS:
            return True, f"Session duration ({hours:.1f}h) exceeded limit ({MAX_SESSION_DURATION_HOURS}h)."
    except (ValueError, TypeError):
        pass
    return False, ""


def check_completion_signal(hook_input):
    """Check if a completion signal is present in the hook input."""
    input_str = json.dumps(hook_input).lower()
    for signal in COMPLETION_SIGNALS:
        if signal.lower() in input_str:
            return True
    return False


def should_block_exit(hook_input):
    """Determine if session exit should be blocked. Returns (block, reason)."""
    state = load_state()

    if not is_loop_active(state):
        return False, "No active loop detected"

    if check_completion_signal(hook_input):
        return False, "Completion signal detected"

    exceeded, msg = check_iteration_limit(state)
    if exceeded:
        return False, msg

    exceeded, msg = check_session_duration(state)
    if exceeded:
        return False, msg

    # Loop is active, no exit condition met
    iteration = state.get("iteration", 0)
    current_project = state.get("current_project", "unknown")
    return True, (
        f"Loop active (iteration {iteration}), project: {current_project}.\n"
        f"   Complete the task or delete {LOOP_MARKER_PATH} to exit."
    )


def main():
    """Main hook entry point."""
    try:
        raw_input = sys.stdin.read(100_000)
        hook_input = json.loads(raw_input)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    block, reason = should_block_exit(hook_input)

    if block:
        print(f"\nSESSION EXIT BLOCKED - Loop Active", file=sys.stderr)
        print(f"   {reason}\n", file=sys.stderr)
        sys.exit(2)
    else:
        if "No active loop" not in reason:
            print(f"\nLoop exit allowed: {reason}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
