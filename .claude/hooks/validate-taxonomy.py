#!/usr/bin/env python3
"""
validate-taxonomy.py - Vault taxonomy enforcement hook.
Runs on file writes to detect taxonomy violations.

Checks:
1. No duplicate numbered folders at top level
2. Writes don't target deprecated/removed folders
3. Reports go to canonical 13-Reports/ location
"""

import json
import os
import re
import sys

VAULT_DIR = os.path.expanduser("~/claude-projects/claude-vault")

# Deprecated folder paths that should never receive new writes
DEPRECATED_FOLDERS = [
    "01-Sessions/",      # Use 04-Sessions/
    "01-Projects/",      # Use 16-Projects/
    "04-Agents/",        # Renamed to 02-Agents/
    "06-Projects/",      # Retired; use 16-Projects/ for notes, workspace roots for code
    "07-Security/",      # Merged into 08-Reference/
    "10-Reports/",       # Deleted, use 13-Reports/
    "12-Agents/",        # Merged into 02-Agents/
    "generated/",        # Use workspace-level generated/
    "experiments/",      # Use workspace-level experiments/
    "16-Projects/generated/",  # Use workspace-level generated/
]

# Known valid top-level folders (updated 2026-03-11)
VALID_NUMBERED = {
    "00": "00-Inbox",
    "01": "01-Journal",
    "02": "02-Agents",
    "03": "03-Knowledge",
    "04": "04-Sessions",
    "05": "05-Solutions",
    "06": "06-Config",
    "07": "07-Business",
    "08": "08-Reference",
    "09": "09-Secrets",
    "10": "10-Meta",
    "11": "11-Databases",
    "13": "13-Reports",
    "14": "14-Knowledge-Bases",
    "15": "15-Products",
    "16": "16-Projects",
    "17": "17-Websites",
    "99": "99-Archive",
}

VALID_UNNUMBERED = ["_system", "Excalidraw"]


def check_for_duplicates():
    """Verify no duplicate numbered folders exist (excluding known deprecated)."""
    if not os.path.isdir(VAULT_DIR):
        return []

    # Folder names that are deprecated -- skip them in duplicate detection
    # since they're already blocked by DEPRECATED_FOLDERS
    deprecated_names = {d.rstrip("/") for d in DEPRECATED_FOLDERS}

    errors = []
    numbers_seen = {}
    for entry in os.listdir(VAULT_DIR):
        full = os.path.join(VAULT_DIR, entry)
        if not os.path.isdir(full):
            continue
        # Skip deprecated folders -- they're handled separately
        if entry in deprecated_names or entry + "/" in {d for d in DEPRECATED_FOLDERS}:
            continue
        match = re.match(r'^(\d{2})-', entry)
        if match:
            num = match.group(1)
            if num in numbers_seen:
                errors.append(
                    f"DUPLICATE: {entry} and {numbers_seen[num]} both use number {num}"
                )
            numbers_seen[num] = entry

    return errors


def check_deprecated_path(file_path):
    """Check if a file path targets a deprecated folder."""
    errors = []
    rel = file_path.replace(VAULT_DIR + "/", "").replace(VAULT_DIR, "")
    for dep in DEPRECATED_FOLDERS:
        if rel.startswith(dep):
            errors.append(f"DEPRECATED: {dep} — use the canonical location instead")
    return errors


def validate_write(file_path):
    """Validate a file write operation."""
    errors = []

    # Only check vault paths
    if VAULT_DIR not in file_path:
        return errors

    errors.extend(check_deprecated_path(file_path))
    errors.extend(check_for_duplicates())

    return errors


def main():
    """Run as standalone check or hook."""
    if "--check" in sys.argv:
        # Standalone validation mode
        errors = check_for_duplicates()

        # Also check for any files in deprecated locations
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
    if tool_name not in ("Write", "Edit", "mcp__filesystem__write_file"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "") or tool_input.get("path", "")
    if not file_path:
        sys.exit(0)

    errors = validate_write(file_path)
    if errors:
        result = {"decision": "block", "reason": f"Taxonomy violation: {'; '.join(errors)}"}
        print(json.dumps(result))
        sys.exit(0)


if __name__ == "__main__":
    main()
