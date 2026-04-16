#!/usr/bin/env python3
"""
post-tool-tracker.py -- PostToolUse Hook
Logs every tool call to SQLite for analytics and debugging.

Records: timestamp, session_id, tool_name, sanitized input, success/failure,
and metadata. All data is scrubbed for secrets before hitting the database.

The database uses WAL mode for safe concurrent access from multiple hooks.
A companion tool_patterns table tracks per-tool frequency for trend analysis.

Stdin JSON (PostToolUse):
  {"tool": "Bash", "input": {"command": "ls"}, "output": "file1 file2"}

Stdout JSON:
  {"continue": true}

Security hardening:
  - 14 regex patterns scrub API keys, tokens, JWTs, private keys, passwords
  - Tool names sanitized to alphanumeric + hyphen/underscore/dot
  - Input size capped at 10KB per field, 100KB total
  - Parameterized SQL queries throughout
"""

import json
import os
import sys
import sqlite3
import re
from datetime import datetime
from pathlib import Path

# Configuration
HOOKS_DIR = Path(__file__).parent
DB_PATH = HOOKS_DIR / "events.db"
LOG_PATH = HOOKS_DIR / "tool_usage.log"

# Security constants
MAX_INPUT_SIZE = 100_000  # 100KB total
MAX_TOOL_INPUT_LENGTH = 10_000  # 10KB per tool input

# Patterns for secrets that must be redacted before logging
SECRET_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[REDACTED_OPENAI_KEY]"),
    (re.compile(r"sk-ant-[A-Za-z0-9-]{20,}"), "[REDACTED_ANTHROPIC_KEY]"),
    (re.compile(r"xoxb-[A-Za-z0-9-]+"), "[REDACTED_SLACK_TOKEN]"),
    (re.compile(r"xoxp-[A-Za-z0-9-]+"), "[REDACTED_SLACK_TOKEN]"),
    (re.compile(r"ghp_[A-Za-z0-9]{36,}"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"gho_[A-Za-z0-9]{36,}"), "[REDACTED_GITHUB_TOKEN]"),
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
        re.compile(
            r'password["\']?\s*[:=]\s*["\'][^"\']{4,}["\']', re.IGNORECASE
        ),
        "password=[REDACTED]",
    ),
    (
        re.compile(
            r'api[_-]?key["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE
        ),
        "api_key=[REDACTED]",
    ),
    (
        re.compile(
            r'secret["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE
        ),
        "secret=[REDACTED]",
    ),
    (
        re.compile(
            r'token["\']?\s*[:=]\s*["\'][^"\']{8,}["\']', re.IGNORECASE
        ),
        "token=[REDACTED]",
    ),
]


def scrub_secrets(text):
    """Remove sensitive data from text before logging."""
    if not isinstance(text, str):
        text = str(text)
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def init_database():
    """Initialize SQLite database with WAL mode for concurrent access."""
    conn = sqlite3.connect(str(DB_PATH), timeout=5.0)
    cursor = conn.cursor()

    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tool_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            session_id TEXT,
            tool_name TEXT NOT NULL,
            tool_input TEXT,
            success INTEGER,
            duration_ms INTEGER,
            context TEXT,
            metadata TEXT
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tool_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern_type TEXT NOT NULL,
            pattern_data TEXT NOT NULL,
            frequency INTEGER DEFAULT 1,
            last_seen TEXT,
            metadata TEXT
        )
    """
    )

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_tool_name ON tool_usage(tool_name)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_timestamp ON tool_usage(timestamp)"
    )

    conn.commit()
    return conn


def sanitize_tool_name(name):
    """Sanitize tool name: only alphanumeric, underscore, hyphen, dot."""
    if not isinstance(name, str):
        return "unknown"
    return "".join(c for c in name[:100] if c.isalnum() or c in "-_.")


def log_tool_usage(conn, tool_data):
    """Log a tool call to the database with secrets scrubbing."""
    cursor = conn.cursor()

    session_id = tool_data.get("session_id", "")
    if isinstance(session_id, str):
        session_id = "".join(c for c in session_id[:64] if c.isalnum() or c in "-_")

    tool_name = sanitize_tool_name(tool_data.get("tool_name", "unknown"))

    tool_input = tool_data.get("input", {})
    tool_input_str = (
        json.dumps(tool_input)
        if isinstance(tool_input, (dict, list))
        else str(tool_input)
    )
    tool_input_str = scrub_secrets(tool_input_str[:MAX_TOOL_INPUT_LENGTH])

    context = tool_data.get("context", "")
    if context:
        context = scrub_secrets(str(context)[:MAX_TOOL_INPUT_LENGTH])

    cursor.execute(
        """
        INSERT INTO tool_usage
        (timestamp, session_id, tool_name, tool_input, success, duration_ms, context, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            datetime.now().isoformat(),
            session_id or None,
            tool_name,
            tool_input_str,
            1 if tool_data.get("success", True) else 0,
            tool_data.get("duration_ms"),
            context or None,
            json.dumps(tool_data.get("metadata", {})),
        ),
    )

    conn.commit()


def update_patterns(conn, tool_name):
    """Update per-tool frequency tracking."""
    tool_name = sanitize_tool_name(tool_name)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, frequency FROM tool_patterns
        WHERE pattern_type = 'tool_frequency' AND pattern_data = ?
    """,
        (tool_name,),
    )

    row = cursor.fetchone()
    if row:
        cursor.execute(
            """
            UPDATE tool_patterns
            SET frequency = frequency + 1, last_seen = ?
            WHERE id = ?
        """,
            (datetime.now().isoformat(), row[0]),
        )
    else:
        cursor.execute(
            """
            INSERT INTO tool_patterns (pattern_type, pattern_data, frequency, last_seen)
            VALUES ('tool_frequency', ?, 1, ?)
        """,
            (tool_name, datetime.now().isoformat()),
        )

    conn.commit()


def main():
    """Main hook entry point."""
    try:
        raw_input = sys.stdin.read(MAX_INPUT_SIZE)
        hook_input = json.loads(raw_input)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    # PostToolUse uses "tool" and "input" keys (not "tool_name" / "tool_input")
    tool_name = hook_input.get("tool", hook_input.get("tool_name", "unknown"))
    tool_name = sanitize_tool_name(tool_name)

    tool_input = hook_input.get("input", hook_input.get("tool_input", {}))
    tool_output = hook_input.get("output", hook_input.get("result", {}))

    # Determine success from output
    success = True
    if isinstance(tool_output, dict):
        success = not tool_output.get("error", False)
    elif isinstance(tool_output, str) and "error" in tool_output.lower():
        success = False

    tool_data = {
        "tool_name": tool_name,
        "input": tool_input,
        "success": success,
        "session_id": os.environ.get("CLAUDE_SESSION_ID"),
        "context": hook_input.get("context"),
        "metadata": {"hook_version": "2.0.0", "source": "post-tool-tracker"},
    }

    try:
        conn = init_database()
        log_tool_usage(conn, tool_data)
        update_patterns(conn, tool_name)
        conn.close()
    except Exception as e:
        # Log error but never fail. Hooks must be resilient.
        error_msg = scrub_secrets(str(e))
        try:
            with open(LOG_PATH, "a") as f:
                f.write(f"{datetime.now().isoformat()} ERROR: {error_msg}\n")
        except Exception:
            pass

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
