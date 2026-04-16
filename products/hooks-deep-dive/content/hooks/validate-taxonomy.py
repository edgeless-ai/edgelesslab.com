#!/usr/bin/env python3
"""
validate-taxonomy.py -- PreToolUse Hook
Enforces directory structure rules on file write operations.

Prevents writes to deprecated directories and detects structural collisions
(e.g., two folders with the same numeric prefix). Designed for projects with
numbered directory hierarchies like Obsidian vaults.

Exit codes:
  0 -- Allow the write
  (Blocks by printing a JSON decision to stdout, not via exit code 2)

Stdin JSON (PreToolUse):
  {"tool_name": "Write", "tool_input": {"file_path": "/path/to/vault/01-Sessions/note.md"}}

Also runnable standalone:
  python3 validate-taxonomy.py --check

Customize: Edit VAULT_DIR, DEPRECATED_FOLDERS, and VALID_NUMBERED for your project.
"""

import json
import os
import re
import sys

# -----------------------------------------------------------------------
# CUSTOMIZE THESE for your project
# -----------------------------------------------------------------------

# Root directory to enforce taxonomy rules on
VAULT_DIR = os.environ.get(
    "HOOKS_VAULT_DIR",
    os.path.expanduser("~/my-project/vault"),
)

# Deprecated folder paths that should never receive new writes.
# Use trailing slashes to match directory prefixes.
DEPRECATED_FOLDERS = [
    "01-Sessions/",   # Example: renamed to 04-Sessions/
    "10-Reports/",    # Example: moved to 13-Reports/
]

# Valid numbered top-level folders. The key is the two-digit prefix,
# the value is the expected folder name. Used to detect collisions.
VALID_NUMBERED = {
    "00": "00-Inbox",
    "01": "01-Journal",
    "02": "02-Agents",
    "03": "03-Knowledge",
    "04": "04-Sessions",
    "05": "05-Solutions",
    "13": "13-Reports",
    "99": "99-Archive",
}

# Non-numbered top-level folders that are allowed
VALID_UNNUMBERED = ["_system", "Excalidraw"]

# -----------------------------------------------------------------------


def check_for_duplicates():
    """Verify no duplicate numbered folders exist at the vault root."""
    if not os.path.isdir(VAULT_DIR):
        return []

    errors = []
    numbers_seen = {}
    for entry in os.listdir(VAULT_DIR):
        full = os.path.join(VAULT_DIR, entry)
        if not os.path.isdir(full):
            continue
        match = re.match(r"^(\d{2})-", entry)
        if match:
            num = match.group(1)
            if num in numbers_seen:
                errors.append(
                    f"DUPLICATE: {entry} and {numbers_seen[num]} both use prefix {num}"
                )
            numbers_seen[num] = entry

    return errors


def check_deprecated_path(file_path):
    """Check if a file path targets a deprecated folder."""
    errors = []
    rel = file_path.replace(VAULT_DIR + "/", "").replace(VAULT_DIR, "")
    for dep in DEPRECATED_FOLDERS:
        if rel.startswith(dep):
            errors.append(f"DEPRECATED: {dep} -- use the canonical location instead")
    return errors


def validate_write(file_path):
    """Validate a file write operation against taxonomy rules."""
    errors = []

    # Only check paths within the vault
    if VAULT_DIR not in file_path:
        return errors

    errors.extend(check_deprecated_path(file_path))
    errors.extend(check_for_duplicates())

    return errors


def main():
    """Run as hook or standalone checker."""

    # Standalone validation mode
    if "--check" in sys.argv:
        errors = check_for_duplicates()

        for dep in DEPRECATED_FOLDERS:
            dep_path = os.path.join(VAULT_DIR, dep)
            if os.path.exists(dep_path):
                count = sum(1 for _ in os.walk(dep_path) for _ in _[2])
                if count > 0:
                    errors.append(f"STALE: {dep} still exists with {count} files")

        if errors:
            print("Taxonomy validation FAILED:")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)
        else:
            print("Taxonomy validation PASSED")
            print(f"  {len(VALID_NUMBERED)} numbered folders, 0 collisions")
            print(f"  {len(VALID_UNNUMBERED)} unnumbered folders (system/plugin)")
            print(f"  {len(DEPRECATED_FOLDERS)} deprecated paths blocked")
            sys.exit(0)

    # Hook mode: read from stdin
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only check file write operations
    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
    if not file_path:
        sys.exit(0)

    errors = validate_write(file_path)
    if errors:
        result = {
            "decision": "block",
            "reason": f"Taxonomy violation: {'; '.join(errors)}",
        }
        print(json.dumps(result))
        sys.exit(0)


if __name__ == "__main__":
    main()
