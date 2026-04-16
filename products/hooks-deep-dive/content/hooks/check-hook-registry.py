#!/usr/bin/env python3
"""
check-hook-registry.py -- PreToolUse Hook
Self-healing integrity check for the hook system itself.

Reads .claude/settings.json and verifies every declared hook command resolves
to an executable file on disk. If any hook target is missing or non-executable,
blocks the next Write/Edit operation with a clear error and fix instructions.

Two escape hatches prevent deadlocks:
  1. Writing to a missing hook target is allowed (so you can restore it).
  2. Writing to settings.json is allowed (so you can remove the broken entry).

Exit codes:
  0 -- Allow the write (registry healthy or escape hatch triggered)

Also runnable standalone:
  python3 check-hook-registry.py --check
"""

import json
import os
import shlex
import sys
from pathlib import Path

# Locate project root relative to this script:
# hooks/ is at .claude/hooks/, so project root is two levels up
PROJECT_DIR = Path(__file__).parent.parent.parent
SETTINGS_PATH = PROJECT_DIR / ".claude" / "settings.json"
SELF_PATH = Path(__file__).resolve()


def collect_hook_commands(settings):
    """Walk the hooks tree in settings.json and yield (event, matcher, command_str)."""
    hooks = settings.get("hooks", {})
    for event, configs in hooks.items():
        if not isinstance(configs, list):
            continue
        for config in configs:
            matcher = config.get("matcher", "")
            for hook in config.get("hooks", []):
                if hook.get("type") != "command":
                    continue  # Skip agent-type hooks
                cmd = hook.get("command", "")
                if cmd:
                    yield (event, matcher, cmd)


def validate_hook_command(cmd):
    """Validate a single hook command.

    Returns (is_valid, reason, resolved_target_path).
    """
    try:
        tokens = shlex.split(cmd)
    except ValueError as e:
        return (False, f"unparseable command: {e}", None)

    if not tokens:
        return (False, "empty command", None)

    target = tokens[0]
    target_path = Path(target)

    if not target_path.exists():
        return (False, f"target does not exist: {target}", target_path)

    try:
        resolved = target_path.resolve()
    except OSError as e:
        return (False, f"target unresolvable: {e}", target_path)

    # Don't validate ourselves (avoids circular dependency)
    if resolved == SELF_PATH:
        return (True, None, resolved)

    if not os.access(resolved, os.X_OK):
        return (False, f"target not executable: {target}", resolved)

    return (True, None, resolved)


def check_registry():
    """Validate the entire hook registry.

    Returns (errors, missing_targets) where:
      - errors: list of (event, matcher, cmd, reason) tuples
      - missing_targets: set of resolved path strings for escape hatch matching
    """
    if not SETTINGS_PATH.exists():
        return (
            [("?", "?", str(SETTINGS_PATH), "settings.json missing")],
            set(),
        )

    try:
        settings = json.loads(SETTINGS_PATH.read_text())
    except json.JSONDecodeError as e:
        return (
            [("?", "?", str(SETTINGS_PATH), f"settings.json malformed: {e}")],
            set(),
        )

    errors = []
    missing_targets = set()

    for event, matcher, cmd in collect_hook_commands(settings):
        ok, reason, target = validate_hook_command(cmd)
        if not ok:
            errors.append((event, matcher, cmd, reason))
            if target is not None:
                try:
                    missing_targets.add(str(target.resolve()))
                except OSError:
                    missing_targets.add(str(target.absolute()))

    return (errors, missing_targets)


def format_block_reason(errors):
    """Format a human-readable block message listing all broken hooks."""
    lines = [
        "Hook registry integrity check FAILED.",
        "The next Write/Edit is blocked until fixed.",
        "",
    ]
    for event, matcher, cmd, reason in errors:
        lines.append(f"  [{event}/{matcher}] {cmd}")
        lines.append(f"    -> {reason}")
    lines.append("")
    lines.append("Fix one of:")
    lines.append("  1. Restore the missing/broken hook file at the path above.")
    lines.append("  2. Edit .claude/settings.json to remove the broken registration.")
    lines.append("")
    lines.append("Both restoration paths are allowed through this hook.")
    return "\n".join(lines)


def main():
    # Standalone CLI mode
    if "--check" in sys.argv:
        errors, _ = check_registry()
        if errors:
            print("Hook registry validation FAILED:")
            for event, matcher, cmd, reason in errors:
                print(f"  - [{event}/{matcher}] {cmd}")
                print(f"      {reason}")
            sys.exit(1)
        print("Hook registry validation PASSED")
        sys.exit(0)

    # Hook mode: read tool invocation from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    errors, missing_targets = check_registry()
    if not errors:
        sys.exit(0)

    # Escape hatch 1: allow restoring a missing hook file
    file_path = input_data.get("tool_input", {}).get("file_path", "") or ""
    if file_path:
        try:
            target_resolved = str(Path(file_path).resolve())
        except OSError:
            target_resolved = str(Path(file_path).absolute())

        if target_resolved in missing_targets:
            sys.exit(0)

        # Escape hatch 2: allow editing settings.json itself
        try:
            if target_resolved == str(SETTINGS_PATH.resolve()):
                sys.exit(0)
        except OSError:
            pass

    result = {"decision": "block", "reason": format_block_reason(errors)}
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
