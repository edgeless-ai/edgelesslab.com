#!/usr/bin/env python3
"""
damage-control.py -- PreToolUse Hook
Blocks dangerous commands and protects critical paths BEFORE execution.

Reads blocking rules from patterns.yaml (same directory as this script).
Uses a simple inline YAML parser to avoid external dependencies.

Exit codes:
  0 -- Allow the tool execution
  2 -- Block the tool execution (returns error message to Claude)

Stdin JSON (PreToolUse):
  {"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}}
  {"tool_name": "Write", "tool_input": {"file_path": "/etc/passwd"}}

Design choice: fails open on errors. A broken hook never bricks your system.
"""

import sys
import json
import re
import os
from pathlib import Path


def load_patterns():
    """Load blocking patterns from patterns.yaml without PyYAML dependency.

    Uses a minimal state-machine parser that handles our specific YAML structure:
    three top-level sections (dangerous_commands, paths, allowlist), each with
    nested lists of quoted string values.
    """
    patterns_path = Path(__file__).parent / "patterns.yaml"

    if not patterns_path.exists():
        return None

    content = patterns_path.read_text()

    patterns = {
        "dangerous_commands": {"bash": {"block_patterns": []}},
        "paths": {"zero_access": [], "read_only": [], "no_delete": []},
        "allowlist": [],
    }

    current_section = None
    current_subsection = None

    for line in content.split("\n"):
        stripped = line.strip()

        # Skip comments and empty lines
        if not stripped or stripped.startswith("#"):
            continue

        # Detect top-level sections
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
            # Extract quoted string value from list item
            match = re.match(r"-\s*['\"](.+?)['\"]", stripped)
            if match:
                value = match.group(1)

                if (
                    current_section == "dangerous_commands"
                    and current_subsection == "block_patterns"
                ):
                    patterns["dangerous_commands"]["bash"]["block_patterns"].append(
                        value
                    )
                elif current_section == "paths":
                    if current_subsection in patterns["paths"]:
                        patterns["paths"][current_subsection].append(value)
                elif current_section == "allowlist":
                    patterns["allowlist"].append(value)

    return patterns


def is_allowlisted(path, patterns):
    """Check if path matches any allowlist entry (substring match)."""
    for allowed in patterns.get("allowlist", []):
        if allowed in path:
            return True
    return False


def check_bash_command(command, patterns):
    """Check if a Bash command matches any dangerous pattern.

    Returns a block reason string if matched, None if allowed.
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
            continue  # Skip invalid regex patterns

    return None


def check_path_protection(path, tool_name, patterns):
    """Check if a file path violates protection rules.

    Three tiers:
      - zero_access: block all operations (read, write, edit)
      - read_only: block Write and Edit, allow Read
      - no_delete: handled separately for rm commands
    """
    if path.startswith("~"):
        path = os.path.expanduser(path)

    # Allowlist overrides all blocks
    if is_allowlisted(path, patterns):
        return None

    path_rules = patterns.get("paths", {})

    # Zero access: block everything
    for protected in path_rules.get("zero_access", []):
        if protected in path:
            return (
                f"BLOCKED: Path '{path}' is protected (zero_access)\n"
                f"Pattern matched: '{protected}'"
            )

    # Read only: block Write and Edit
    if tool_name in ["Write", "Edit"]:
        for protected in path_rules.get("read_only", []):
            if protected in path:
                return (
                    f"BLOCKED: Path '{path}' is read-only\n"
                    f"Pattern matched: '{protected}'"
                )

    return None


def check_delete_protection(command, patterns):
    """Check if an rm command targets a no_delete path."""
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
    """Main hook entry point."""
    try:
        hook_input = sys.stdin.read()
        hook_data = json.loads(hook_input)

        tool_name = hook_data.get("tool_name", "")
        tool_input = hook_data.get("tool_input", {})

        patterns = load_patterns()
        if not patterns:
            sys.exit(0)  # No patterns file, allow everything

        block_reason = None

        # Check Bash commands against dangerous patterns and delete protection
        if tool_name == "Bash":
            command = tool_input.get("command", "")
            block_reason = check_bash_command(command, patterns)
            if not block_reason:
                block_reason = check_delete_protection(command, patterns)

        # Check Write/Edit against path protection rules
        elif tool_name in ["Write", "Edit"]:
            file_path = tool_input.get("file_path", "")
            block_reason = check_path_protection(file_path, tool_name, patterns)

        # Check Read against zero_access paths only
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
            sys.exit(2)  # Block execution

        sys.exit(0)  # Allow execution

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse hook input: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open
    except Exception as e:
        print(f"ERROR: Damage control hook failed: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open


if __name__ == "__main__":
    main()
