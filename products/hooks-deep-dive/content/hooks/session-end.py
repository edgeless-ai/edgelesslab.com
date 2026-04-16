#!/usr/bin/env python3
"""
session-end.py -- Stop Hook
Blocks session exit until retrospective is complete, then archives a session
summary and releases any claimed inboxes.

Flow:
  1. Gather session statistics from the tool_usage SQLite database
  2. If session was significant (10+ tool calls, 10+ minutes, or 3+ errors),
     require a retrospective before allowing exit
  3. On allowed exit: log session end, archive summary, release inbox claim

Exit codes:
  0 -- Allow session exit
  (Blocks by printing {"continue": false, "decision": "block"} to stdout)

Security hardening:
  - Session ID sanitized against path traversal
  - All file paths validated within project boundary
  - Atomic writes (write to .tmp, rename) prevent corruption
"""

import json
import os
import sys
import sqlite3
import re
from datetime import datetime
from pathlib import Path

# Configuration -- derived from script location
PROJECT_DIR = Path(
    os.environ.get("CLAUDE_PROJECT_DIR", Path(__file__).parent.parent.parent)
)
HOOKS_DIR = Path(__file__).parent
DB_PATH = HOOKS_DIR / "events.db"
SESSION_LOG_PATH = HOOKS_DIR / "sessions.log"

# Where to archive session summaries (markdown files)
VAULT_SESSIONS_PATH = Path(
    os.environ.get(
        "HOOKS_SESSION_ARCHIVE_DIR",
        str(PROJECT_DIR / "session-archives"),
    )
)

# Retrospective tracking
RETRO_TRACKING_PATH = HOOKS_DIR / ".retrospective_status.json"
RETRO_REQUIRED_TOOL_COUNT = 10
RETRO_REQUIRED_DURATION_SECONDS = 600  # 10 minutes
RETRO_REQUIRED_ERRORS = 3

# Security constants
MAX_SESSION_ID_LENGTH = 64
MAX_INPUT_SIZE = 100_000
ALLOWED_SESSION_ID_CHARS = re.compile(r"^[a-zA-Z0-9_-]+$")


def sanitize_session_id(session_id):
    """Sanitize session ID to prevent path traversal."""
    if not isinstance(session_id, str):
        return "unknown"
    session_id = session_id[:MAX_SESSION_ID_LENGTH]
    session_id = session_id.replace("..", "").replace("/", "").replace("\\", "")
    if not ALLOWED_SESSION_ID_CHARS.match(session_id):
        session_id = "".join(c for c in session_id if c.isalnum() or c in "-_")
    return session_id if session_id else "unknown"


def validate_path_within_boundary(path, boundary):
    """Verify a path resolves within an expected boundary directory."""
    try:
        resolved = path.resolve()
        boundary_resolved = boundary.resolve()
        return str(resolved).startswith(str(boundary_resolved))
    except (OSError, ValueError):
        return False


def get_session_stats(session_id):
    """Query the tool_usage database for session statistics."""
    stats = {
        "tool_count": 0,
        "top_tools": [],
        "duration_seconds": 0,
        "errors": 0,
    }

    if not DB_PATH.exists():
        return stats

    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT tool_name, COUNT(*) as count,
                   SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
            FROM tool_usage
            WHERE session_id = ?
            GROUP BY tool_name
            ORDER BY count DESC
            LIMIT 5
        """,
            (session_id,),
        )
        rows = cursor.fetchall()
        stats["top_tools"] = [{"name": r[0], "count": r[1]} for r in rows]
        stats["tool_count"] = sum(r[1] for r in rows)
        stats["errors"] = sum(r[2] for r in rows)
        conn.close()
    except Exception:
        pass

    session_start = os.environ.get("CLAUDE_SESSION_START")
    if session_start:
        try:
            start = datetime.fromisoformat(session_start)
            stats["duration_seconds"] = int(
                (datetime.now() - start).total_seconds()
            )
        except Exception:
            pass

    return stats


def should_suggest_retrospective(stats):
    """Determine if session warrants a retrospective."""
    return (
        stats.get("tool_count", 0) >= RETRO_REQUIRED_TOOL_COUNT
        or stats.get("duration_seconds", 0) >= RETRO_REQUIRED_DURATION_SECONDS
        or stats.get("errors", 0) >= RETRO_REQUIRED_ERRORS
    )


def get_retrospective_status(session_id):
    """Load retrospective completion status for this session."""
    try:
        if RETRO_TRACKING_PATH.exists():
            data = json.loads(RETRO_TRACKING_PATH.read_text())
            if data.get("session_id") == session_id:
                return data
    except Exception:
        pass
    return {"completed": False, "email_sent": False}


def mark_retrospective_required(session_id, stats):
    """Mark that a retrospective is required before exit."""
    try:
        data = {
            "session_id": session_id,
            "required": True,
            "completed": False,
            "email_sent": False,
            "timestamp": datetime.now().isoformat(),
            "stats": stats,
        }
        RETRO_TRACKING_PATH.write_text(json.dumps(data, indent=2))
    except Exception:
        pass


def is_retrospective_complete(session_id):
    """Check if retrospective has been completed."""
    status = get_retrospective_status(session_id)
    return status.get("completed", False) and status.get("email_sent", False)


def log_session_end(session_id, stats):
    """Append session end event to the sessions log."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event": "session_end",
        "session_id": session_id,
        "stats": stats,
    }
    try:
        with open(SESSION_LOG_PATH, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass


def archive_to_vault(session_id, stats):
    """Archive session summary as a markdown file."""
    safe_id = sanitize_session_id(session_id)
    now = datetime.now()
    month_dir = VAULT_SESSIONS_PATH / now.strftime("%Y-%m")

    try:
        if not validate_path_within_boundary(VAULT_SESSIONS_PATH, PROJECT_DIR):
            return

        month_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{now.strftime('%Y-%m-%d')}-session-{safe_id[:8]}.md"
        filepath = month_dir / filename

        if not validate_path_within_boundary(filepath, VAULT_SESSIONS_PATH):
            return

        if not filepath.exists():
            duration_min = stats.get("duration_seconds", 0) // 60
            top_tools = ", ".join(
                sanitize_session_id(t.get("name", "unknown"))[:50]
                for t in stats.get("top_tools", [])[:3]
                if isinstance(t, dict)
            )
            retro_suggested = should_suggest_retrospective(stats)

            content = f"""---
created: {now.isoformat()}
session_id: {safe_id}
type: session_log
status: completed
retrospective_suggested: {str(retro_suggested).lower()}
---

# Session Summary - {now.strftime('%Y-%m-%d %H:%M')}

## Metrics
- Duration: {duration_min} minutes
- Tool calls: {stats.get('tool_count', 0)}
- Errors: {stats.get('errors', 0)}
- Top tools: {top_tools or 'N/A'}

## Notes
*(Auto-generated session log)*
"""
            # Atomic write: write to .tmp, then rename
            temp = filepath.with_suffix(".tmp")
            temp.write_text(content)
            temp.rename(filepath)
    except Exception:
        pass


def main():
    """Main hook entry point."""
    try:
        raw_input = sys.stdin.read(MAX_INPUT_SIZE)
        hook_input = json.loads(raw_input)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    raw_session_id = os.environ.get(
        "CLAUDE_SESSION_ID", hook_input.get("session_id", "unknown")
    )
    session_id = sanitize_session_id(raw_session_id)

    stats = get_session_stats(session_id)
    retro_required = should_suggest_retrospective(stats)
    retro_complete = (
        is_retrospective_complete(session_id) if retro_required else True
    )

    # Block exit if retrospective is required but not done
    if retro_required and not retro_complete:
        mark_retrospective_required(session_id, stats)

        duration_min = stats.get("duration_seconds", 0) // 60
        tool_count = stats.get("tool_count", 0)

        print(
            f"\nSESSION EXIT BLOCKED - Retrospective required!",
            file=sys.stderr,
        )
        print(
            f"   Session had {tool_count} tool calls over {duration_min} minutes.",
            file=sys.stderr,
        )
        print(
            f"   Run /retrospective to extract learnings before exiting.",
            file=sys.stderr,
        )

        print(json.dumps({"continue": False, "decision": "block"}))
        return

    # Allowed to exit: log, archive, clean up
    log_session_end(session_id, stats)
    archive_to_vault(session_id, stats)

    if RETRO_TRACKING_PATH.exists():
        try:
            RETRO_TRACKING_PATH.unlink()
        except Exception:
            pass

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
