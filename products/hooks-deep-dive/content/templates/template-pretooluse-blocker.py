#!/usr/bin/env python3
"""
Template: PreToolUse Blocker
Blocks specific tool operations based on your rules.

Register in settings.json under hooks.PreToolUse with a matcher
for the tool(s) you want to intercept.

Exit codes:
  0 -- Allow the tool call
  2 -- Block the tool call

Example registration (settings.json):
  {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Bash",
          "hooks": [{"type": "command", "command": ".claude/hooks/my-blocker.py"}]
        }
      ]
    }
  }
"""

import json
import sys


def should_block(tool_name, tool_input):
    """Determine if this tool call should be blocked.

    Args:
        tool_name: The tool being called (Bash, Write, Edit, Read, etc.)
        tool_input: Dict of tool parameters. For Bash: {"command": "..."}.
                    For Write/Edit: {"file_path": "..."}.

    Returns:
        A block reason string, or None to allow.
    """
    # Example: block any Bash command containing "sudo"
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if "sudo" in command:
            return f"BLOCKED: sudo commands are not allowed. Command: {command[:80]}"

    # Example: block writes to specific directories
    if tool_name in ("Write", "Edit"):
        file_path = tool_input.get("file_path", "")
        blocked_paths = ["/etc/", "/usr/", "/var/"]
        for bp in blocked_paths:
            if file_path.startswith(bp):
                return f"BLOCKED: Cannot write to {bp}"

    return None  # Allow


def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)  # Fail open on parse error

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    reason = should_block(tool_name, tool_input)

    if reason:
        print(reason, file=sys.stderr)
        sys.exit(2)  # Block

    sys.exit(0)  # Allow


if __name__ == "__main__":
    main()
