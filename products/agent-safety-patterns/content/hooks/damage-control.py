#!/usr/bin/env python3
"""
Damage Control PreToolUse Hook

Blocks dangerous commands and protects critical paths BEFORE execution.
Based on production patterns from running autonomous agents with real-world access.

Exit codes:
  0 - Allow the tool execution
  2 - Block the tool execution (returns error message to agent)

Environment variables:
  SAFETY_PATTERNS_PATH - Path to patterns YAML file (default: ./patterns.yaml)

Usage:
  Register as a PreToolUse hook in your agent settings.
  Receives JSON on stdin with tool_name and tool_input.

  Test manually:
    echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | python damage-control.py
"""

import sys
import json
import re
import os
from pathlib import Path


def load_patterns():
    """
    Load patterns from a YAML file without requiring pyyaml.

    Uses a simple line-by-line parser that handles the specific YAML structure
    used in the patterns file. This avoids adding pyyaml as a dependency, which
    matters for hooks that need to run in minimal environments.

    Returns None if the patterns file does not exist.
    """
    patterns_path = os.environ.get(
        "SAFETY_PATTERNS_PATH",
        str(Path(__file__).parent / "patterns.yaml")
    )

    if not os.path.exists(patterns_path):
        return None

    with open(patterns_path, "r") as f:
        content = f.read()

    patterns = {
        "dangerous_commands": {"bash": {"block_patterns": []}},
        "paths": {"zero_access": [], "read_only": [], "no_delete": []},
        "allowlist": [],
    }

    current_section = None
    current_subsection = None

    for line in content.split("\n"):
        stripped = line.strip()

        if not stripped or stripped.startswith("#"):
            continue

        if stripped == "dangerous_commands:":
            current_section = "dangerous_commands"
            current_subsection = None
        elif stripped == "paths:":
            current_section = "paths"
            current_subsection = None
        elif stripped == "allowlist:":
            current_section = "allowlist"
            current_subsection = None
        elif stripped == "bash:" and current_section == "dangerous_commands":
            current_subsection = "bash"
        elif stripped == "block_patterns:":
            current_subsection = "block_patterns"
        elif stripped == "zero_access:":
            current_subsection = "zero_access"
        elif stripped == "read_only:":
            current_subsection = "read_only"
        elif stripped == "no_delete:":
            current_subsection = "no_delete"
        elif stripped.startswith("- '") or stripped.startswith('- "'):
            match = re.match(r"-\s*['\"](.+?)['\"]", stripped)
            if match:
                value = match.group(1)
                if (
                    current_section == "dangerous_commands"
                    and current_subsection == "block_patterns"
                ):
                    patterns["dangerous_commands"]["bash"]["block_patterns"].append(value)
                elif current_section == "paths":
                    if current_subsection in patterns["paths"]:
                        patterns["paths"][current_subsection].append(value)
                elif current_section == "allowlist":
                    patterns["allowlist"].append(value)

    return patterns


def is_allowlisted(path, patterns):
    """Check if a path matches any allowlist entry."""
    for allowed in patterns.get("allowlist", []):
        if allowed in path:
            return True
    return False


def check_bash_command(command, patterns):
    """
    Check if a bash command matches any dangerous pattern.

    Returns a block reason string if the command should be blocked,
    or None if the command is safe.
    """
    block_patterns = (
        patterns.get("dangerous_commands", {})
        .get("bash", {})
        .get("block_patterns", [])
    )

    for pattern in block_patterns:
        try:
            if re.search(pattern, command, re.IGNORECASE):
                return (
                    f"BLOCKED: Dangerous command pattern detected: '{pattern}'\n"
                    f"Command: {command[:100]}..."
                )
        except re.error:
            # Invalid regex pattern in config, skip it
            continue

    return None


def check_path_protection(path, tool_name, patterns):
    """
    Check if a file path violates protection rules.

    Three tiers:
    - zero_access: blocked for all operations (read, write, edit)
    - read_only: blocked for write/edit operations
    - no_delete: handled separately for rm commands in bash
    """
    if path.startswith("~"):
        path = os.path.expanduser(path)

    if is_allowlisted(path, patterns):
        return None

    path_rules = patterns.get("paths", {})

    # Zero access: block all operations
    for protected in path_rules.get("zero_access", []):
        if protected in path:
            return (
                f"BLOCKED: Path '{path}' is protected (zero_access)\n"
                f"Pattern matched: '{protected}'"
            )

    # Read only: block write and edit operations
    if tool_name in ("Write", "Edit"):
        for protected in path_rules.get("read_only", []):
            if protected in path:
                return (
                    f"BLOCKED: Path '{path}' is read-only\n"
                    f"Pattern matched: '{protected}'"
                )

    return None


def check_delete_protection(command, patterns):
    """
    Check if an rm/delete command targets a path in the no_delete list.
    """
    if not re.search(r"\brm\b", command):
        return None

    no_delete = patterns.get("paths", {}).get("no_delete", [])

    for protected in no_delete:
        if protected in command:
            if is_allowlisted(protected, patterns):
                continue
            return (
                f"BLOCKED: Cannot delete protected path\n"
                f"Path: '{protected}' is in no_delete protection"
            )

    return None


def main():
    """Main hook entry point. Reads JSON from stdin, evaluates safety rules."""
    try:
        hook_input = sys.stdin.read()
        hook_data = json.loads(hook_input)

        tool_name = hook_data.get("tool_name", "")
        tool_input = hook_data.get("tool_input", {})

        patterns = load_patterns()
        if not patterns:
            # No patterns file found. Allow everything.
            # For production, consider changing this to sys.exit(2) (fail-closed).
            sys.exit(0)

        block_reason = None

        # Check Bash commands against dangerous patterns
        if tool_name == "Bash":
            command = tool_input.get("command", "")
            block_reason = check_bash_command(command, patterns)
            if not block_reason:
                block_reason = check_delete_protection(command, patterns)

        # Check Write/Edit for path protection
        elif tool_name in ("Write", "Edit"):
            file_path = tool_input.get("file_path", "")
            block_reason = check_path_protection(file_path, tool_name, patterns)

        # Check Read for zero_access paths only
        elif tool_name == "Read":
            file_path = tool_input.get("file_path", "")
            path_rules = patterns.get("paths", {})
            for protected in path_rules.get("zero_access", []):
                if protected in file_path and not is_allowlisted(file_path, patterns):
                    block_reason = (
                        f"BLOCKED: Path '{file_path}' is protected (zero_access)\n"
                        f"Pattern matched: '{protected}'"
                    )
                    break

        if block_reason:
            print(block_reason, file=sys.stderr)
            sys.exit(2)

        sys.exit(0)

    except json.JSONDecodeError as e:
        # Failed to parse hook input. Fail open.
        # For production autonomous agents, change to sys.exit(2).
        print(f"ERROR: Failed to parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    except Exception as e:
        # Unexpected error. Fail open.
        # For production autonomous agents, change to sys.exit(2).
        print(f"ERROR: Damage control hook failed: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
