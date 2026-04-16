#!/usr/bin/env python3
"""
Scope Limiter PreToolUse Hook

Maintains an allowlist of permitted tools and commands. Everything not
explicitly allowed is blocked. This inverts the typical security model:
instead of listing what's dangerous, you list what's safe.

Exit codes:
  0 - Allow the tool execution
  2 - Block the tool execution (returns error message to agent)

Environment variables:
  SAFETY_ALLOWLIST_PATH - Path to scope allowlist YAML (default: ./scope-allowlist.yaml)
  SCOPE_LIMITER_STRICT  - Set to "true" for strict mode (no fallback to permissive).
                          Default is "false": if no allowlist file is found, all operations
                          are allowed. In strict mode, a missing allowlist blocks everything.

Usage:
  Register as a PreToolUse hook matching "*" (all tools).

  Test manually:
    echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | python scope-limiter.py
    # Allowed if "ls" is on the allowlist, blocked otherwise
"""

import sys
import json
import re
import os
from pathlib import Path


def load_allowlist():
    """
    Load the scope allowlist from YAML without requiring pyyaml.

    Expected YAML structure:
      allowed_tools:
        - "Read"
        - "Glob"
        - "Grep"

      allowed_bash_commands:
        - "ls"
        - "git status"
        - "python3"

      allowed_bash_patterns:
        - "^git\\s+(status|log|diff|branch)"
        - "^python3?\\s+"
        - "^npm\\s+(test|run)"

      blocked_tools:
        - "mcp__dangerous__tool"

    Returns None if the file does not exist.
    """
    allowlist_path = os.environ.get(
        "SAFETY_ALLOWLIST_PATH",
        str(Path(__file__).parent / "scope-allowlist.yaml")
    )

    if not os.path.exists(allowlist_path):
        return None

    with open(allowlist_path, "r") as f:
        content = f.read()

    allowlist = {
        "allowed_tools": [],
        "allowed_bash_commands": [],
        "allowed_bash_patterns": [],
        "blocked_tools": [],
    }

    current_section = None

    for line in content.split("\n"):
        stripped = line.strip()

        if not stripped or stripped.startswith("#"):
            continue

        # Detect section headers
        if stripped.rstrip(":") in allowlist and stripped.endswith(":"):
            current_section = stripped.rstrip(":")
            continue

        # Parse list items
        if stripped.startswith("- ") and current_section in allowlist:
            match = re.match(r'-\s*["\'](.+?)["\']', stripped)
            if match:
                allowlist[current_section].append(match.group(1))
            else:
                # Unquoted value
                value = stripped[2:].strip()
                if value:
                    allowlist[current_section].append(value)

    return allowlist


def is_tool_allowed(tool_name, allowlist):
    """
    Check if a tool is on the allowed list.

    If blocked_tools is populated, those take precedence (block even if
    the tool would otherwise be allowed by a wildcard).
    """
    # Check explicit blocks first
    for blocked in allowlist.get("blocked_tools", []):
        if re.match(blocked, tool_name):
            return False, f"Tool '{tool_name}' is explicitly blocked (matched '{blocked}')"

    # Check allowed tools
    allowed = allowlist.get("allowed_tools", [])
    if not allowed:
        # No allowed_tools section means no tool-level filtering
        return True, None

    for pattern in allowed:
        if pattern == "*":
            return True, None
        if pattern == tool_name:
            return True, None
        try:
            if re.match(pattern, tool_name):
                return True, None
        except re.error:
            continue

    return False, f"Tool '{tool_name}' is not on the allowed tools list"


def is_bash_command_allowed(command, allowlist):
    """
    Check if a bash command matches the allowed commands or patterns.

    Two levels of matching:
    1. Exact command prefix matching (allowed_bash_commands)
    2. Regex pattern matching (allowed_bash_patterns)

    If neither list has entries, bash commands are not filtered
    (tool-level filtering still applies).
    """
    allowed_commands = allowlist.get("allowed_bash_commands", [])
    allowed_patterns = allowlist.get("allowed_bash_patterns", [])

    if not allowed_commands and not allowed_patterns:
        return True, None

    # Strip leading whitespace and get the base command
    command_stripped = command.strip()

    # Check exact command prefixes
    for allowed in allowed_commands:
        if command_stripped == allowed or command_stripped.startswith(allowed + " "):
            return True, None

    # Check regex patterns
    for pattern in allowed_patterns:
        try:
            if re.search(pattern, command_stripped):
                return True, None
        except re.error:
            continue

    # Truncate command for the error message
    display_cmd = command_stripped[:80]
    if len(command_stripped) > 80:
        display_cmd += "..."

    return False, f"Bash command not on allowlist: '{display_cmd}'"


def main():
    """Main hook entry point."""
    try:
        hook_input = sys.stdin.read()
        hook_data = json.loads(hook_input)

        tool_name = hook_data.get("tool_name", "")
        tool_input = hook_data.get("tool_input", {})

        allowlist = load_allowlist()

        if allowlist is None:
            strict = os.environ.get("SCOPE_LIMITER_STRICT", "").lower() == "true"
            if strict:
                print(
                    "BLOCKED: No scope allowlist found and SCOPE_LIMITER_STRICT is enabled.\n"
                    "Create a scope-allowlist.yaml or set SAFETY_ALLOWLIST_PATH.",
                    file=sys.stderr,
                )
                sys.exit(2)
            # Permissive mode: no allowlist means allow everything
            sys.exit(0)

        # Check tool-level permissions
        tool_allowed, reason = is_tool_allowed(tool_name, allowlist)
        if not tool_allowed:
            print(f"BLOCKED: {reason}", file=sys.stderr)
            sys.exit(2)

        # For Bash tools, also check command-level permissions
        if tool_name == "Bash":
            command = tool_input.get("command", "")
            cmd_allowed, reason = is_bash_command_allowed(command, allowlist)
            if not cmd_allowed:
                print(f"BLOCKED: {reason}", file=sys.stderr)
                sys.exit(2)

        sys.exit(0)

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse hook input: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open. Change to sys.exit(2) for production.

    except Exception as e:
        print(f"ERROR: Scope limiter hook failed: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open. Change to sys.exit(2) for production.


if __name__ == "__main__":
    main()
