#!/usr/bin/env python3
"""
Template: PostToolUse Logger
Logs tool call events after they complete.

Register in settings.json under hooks.PostToolUse. Use no matcher
to capture all tool calls, or add a matcher for specific tools.

Stdout JSON:
  {"continue": true}

Example registration (settings.json):
  {
    "hooks": {
      "PostToolUse": [
        {
          "hooks": [{"type": "command", "command": ".claude/hooks/my-logger.py"}]
        }
      ]
    }
  }
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Where to write the log file (relative to this script)
LOG_PATH = Path(__file__).parent / "tool_events.log"

# Basic secrets scrubbing: add patterns for your environment
SECRET_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"ghp_[A-Za-z0-9]{36,}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"AKIA[A-Z0-9]{16}"), "[REDACTED_AWS_KEY]"),
]


def scrub(text):
    """Remove secrets from text before logging."""
    if not isinstance(text, str):
        text = str(text)
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def main():
    try:
        raw = sys.stdin.read(100_000)
        hook_input = json.loads(raw)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    # PostToolUse uses "tool" and "input" keys
    tool_name = hook_input.get("tool", hook_input.get("tool_name", "unknown"))
    tool_input = hook_input.get("input", hook_input.get("tool_input", {}))
    tool_output = hook_input.get("output", hook_input.get("result", ""))

    # Determine success
    success = True
    if isinstance(tool_output, dict) and tool_output.get("error"):
        success = False
    elif isinstance(tool_output, str) and "error" in tool_output.lower():
        success = False

    # Build log entry
    entry = {
        "timestamp": datetime.now().isoformat(),
        "tool": tool_name,
        "input_summary": scrub(json.dumps(tool_input)[:500]),
        "success": success,
        "session_id": os.environ.get("CLAUDE_SESSION_ID", ""),
    }

    # Append to log file
    try:
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass  # Never fail the hook on log error

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
