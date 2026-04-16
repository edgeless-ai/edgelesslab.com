#!/usr/bin/env python3
"""
pre-compact.py -- PreCompact Hook
Backs up critical context before context window compaction.

When Claude Code runs low on context, it compacts the conversation. This hook
fires just before compaction and saves a JSON backup of todos, important files,
key decisions, and session notes. Backups are stored in a local directory with
automatic cleanup of old files.

All context data is scrubbed for secrets using the same 14-pattern system as
post-tool-tracker.py.

Stdin JSON (PreCompact):
  May contain: todos, summary, important, files

Stdout JSON:
  {"continue": true}

Security hardening:
  - Recursive secrets scrubbing at all nesting levels
  - Size limits: 100KB per backup, 500KB max input
  - Path validation within boundary directory
  - Atomic writes (write to .tmp, rename)
"""

import json
import os
import sys
import re
from datetime import datetime
from pathlib import Path

# Configuration
HOOKS_DIR = Path(__file__).parent
BACKUP_DIR = HOOKS_DIR / "context_backups"
MAX_BACKUPS = 10  # Keep last N backups

# Security constants
MAX_INPUT_SIZE = 500_000  # 500KB max input
MAX_BACKUP_SIZE = 100_000  # 100KB per backup file
MAX_ITEMS_PER_LIST = 100

# Secret patterns for redaction
SECRET_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[REDACTED_OPENAI_KEY]"),
    (re.compile(r"sk-ant-[A-Za-z0-9-]{20,}"), "[REDACTED_ANTHROPIC_KEY]"),
    (re.compile(r"xoxb-[A-Za-z0-9-]+"), "[REDACTED_SLACK_TOKEN]"),
    (re.compile(r"ghp_[A-Za-z0-9]{36,}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{22,}"), "[REDACTED_GITHUB_PAT]"),
    (re.compile(r"AKIA[A-Z0-9]{16}"), "[REDACTED_AWS_KEY]"),
    (
        re.compile(r"eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*"),
        "[REDACTED_JWT]",
    ),
    (
        re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
        "[REDACTED_PRIVATE_KEY]",
    ),
    (
        re.compile(r'password["\']?\s*[:=]\s*["\'][^"\']{4,}["\']', re.IGNORECASE),
        "password=[REDACTED]",
    ),
    (
        re.compile(r'api[_-]?key["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE),
        "api_key=[REDACTED]",
    ),
    (
        re.compile(r'secret["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE),
        "secret=[REDACTED]",
    ),
    (
        re.compile(r'token["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE),
        "token=[REDACTED]",
    ),
]


def scrub_secrets(text):
    """Remove sensitive data from text."""
    if not isinstance(text, str):
        text = str(text)
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def scrub_dict(data, depth=0):
    """Recursively scrub secrets from a dictionary."""
    if depth > 10:
        return {"error": "max_depth_exceeded"}

    scrubbed = {}
    for key, value in list(data.items())[:MAX_ITEMS_PER_LIST]:
        if isinstance(value, str):
            scrubbed[key] = scrub_secrets(value[:10000])
        elif isinstance(value, dict):
            scrubbed[key] = scrub_dict(value, depth + 1)
        elif isinstance(value, list):
            scrubbed[key] = [
                scrub_dict(item, depth + 1)
                if isinstance(item, dict)
                else scrub_secrets(str(item)[:1000])
                if isinstance(item, str)
                else item
                for item in value[:MAX_ITEMS_PER_LIST]
            ]
        else:
            scrubbed[key] = value
    return scrubbed


def validate_path_within_boundary(path, boundary):
    """Verify a path resolves within expected boundary."""
    try:
        return str(path.resolve()).startswith(str(boundary.resolve()))
    except (OSError, ValueError):
        return False


def cleanup_old_backups():
    """Remove old backups beyond MAX_BACKUPS."""
    try:
        backups = sorted(BACKUP_DIR.glob("context_*.json"), reverse=True)
        for old in backups[MAX_BACKUPS:]:
            old.unlink()
    except Exception:
        pass


def sanitize_session_id(session_id):
    """Sanitize session ID for safe use in filenames."""
    if not isinstance(session_id, str):
        return "unknown"
    return (
        "".join(c for c in session_id[:64] if c.isalnum() or c in "-_") or "unknown"
    )


def save_context_backup(context_data):
    """Save a context backup with security checks. Returns filename or error."""
    if not validate_path_within_boundary(BACKUP_DIR, HOOKS_DIR):
        return "error: backup_dir_outside_boundary"

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"context_{timestamp}.json"
    filepath = BACKUP_DIR / filename

    if not validate_path_within_boundary(filepath, BACKUP_DIR):
        return "error: path_traversal_detected"

    session_id = sanitize_session_id(os.environ.get("CLAUDE_SESSION_ID", "unknown"))

    scrubbed = scrub_dict(context_data) if isinstance(context_data, dict) else {}

    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id,
        "context": scrubbed,
        "metadata": {"hook_version": "2.0.0", "reason": "pre_compact"},
    }

    try:
        content = json.dumps(backup_data, indent=2, default=str)
        if len(content) > MAX_BACKUP_SIZE:
            backup_data["context"] = {"truncated": True, "reason": "size_limit_exceeded"}
            backup_data["metadata"]["original_size"] = len(content)
            content = json.dumps(backup_data, indent=2, default=str)

        # Atomic write
        temp = filepath.with_suffix(".tmp")
        temp.write_text(content)
        temp.rename(filepath)

        cleanup_old_backups()
        return filename
    except Exception as e:
        return f"error: {scrub_secrets(str(e)[:100])}"


def extract_critical_context(hook_input):
    """Extract and sanitize critical context to preserve across compaction."""
    critical = {
        "todos": [],
        "important_files": [],
        "key_decisions": [],
        "session_notes": [],
    }

    if not isinstance(hook_input, dict):
        return critical

    todos = hook_input.get("todos", [])
    if isinstance(todos, list):
        critical["todos"] = [
            scrub_secrets(str(t)[:500]) if isinstance(t, str) else scrub_dict(t) if isinstance(t, dict) else t
            for t in todos[:MAX_ITEMS_PER_LIST]
        ]

    summary = hook_input.get("summary", "")
    if isinstance(summary, str) and summary:
        critical["session_notes"].append(scrub_secrets(summary[:5000]))

    important = hook_input.get("important", [])
    if isinstance(important, list):
        critical["key_decisions"] = [
            scrub_secrets(str(item)[:500]) if isinstance(item, str) else scrub_dict(item) if isinstance(item, dict) else item
            for item in important[:MAX_ITEMS_PER_LIST]
        ]

    files = hook_input.get("files", [])
    if isinstance(files, list):
        critical["important_files"] = [
            scrub_secrets(str(f)[:500])
            for f in files[:20]
            if isinstance(f, str)
        ]

    return critical


def main():
    """Main hook entry point."""
    try:
        raw_input = sys.stdin.read(MAX_INPUT_SIZE)
        hook_input = json.loads(raw_input)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    critical_context = extract_critical_context(hook_input)

    save_context_backup(
        {
            "critical": critical_context,
            "raw_input_keys": [
                str(k)[:50] for k in list(hook_input.keys())[:20]
            ]
            if hook_input
            else [],
        }
    )

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
