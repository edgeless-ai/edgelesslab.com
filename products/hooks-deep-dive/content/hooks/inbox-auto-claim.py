#!/usr/bin/env python3
"""
inbox-auto-claim.py -- UserPromptSubmit Hook
Auto-claims a session inbox on the first prompt for multi-session dispatch.

When running multiple Claude Code sessions, each session needs its own inbox
for receiving dispatched work. This hook handles the claim flow in two phases:

  Phase 1 (first prompt): Reads the inbox registry, claims the first unclaimed
  session, creates inbox/outbox directories, asks user for polling frequency.

  Phase 2 (second prompt): If user replies with a frequency (5m/15m/30m/60m),
  instructs Claude to start the inbox check loop. "skip" disables auto-check.

Uses PID-based marker files in /tmp/ so claims die with the session.
The session-end hook releases the claim on exit.

Stdin JSON (UserPromptSubmit):
  {"prompt": "15m"}  -- or any user prompt
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# -----------------------------------------------------------------------
# CUSTOMIZE THESE for your project
# -----------------------------------------------------------------------

# Root directory for inbox/outbox system
INBOX_ROOT = Path(
    os.environ.get(
        "HOOKS_INBOX_ROOT",
        os.path.expanduser("~/.claude-inboxes"),
    )
)

# Registry file tracking which sessions are claimed
REGISTRY = INBOX_ROOT / "registry.json"

# PID-based marker file. Keyed to parent PID so it dies with Claude Code.
CLAIM_MARKER = Path(f"/tmp/claude-inbox-claimed-{os.getppid()}")

# -----------------------------------------------------------------------


def ok(context=None):
    """Return a valid UserPromptSubmit hook response (always allows the prompt)."""
    if context:
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "UserPromptSubmit",
                        "additionalContext": context,
                    }
                }
            )
        )
    else:
        print(json.dumps({}))


def main():
    hook_input = {}
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        pass

    user_prompt = hook_input.get("prompt", "").strip().lower()

    # ------------------------------------------------------------------
    # Phase 2: Already claimed, waiting for frequency selection
    # ------------------------------------------------------------------
    if CLAIM_MARKER.exists():
        try:
            marker_data = json.loads(CLAIM_MARKER.read_text())
        except (json.JSONDecodeError, OSError):
            ok()
            return

        # Already has frequency? Done, pass through all prompts.
        if marker_data.get("frequency"):
            ok()
            return

        claimed_id = marker_data.get("session", "")
        inbox_path = INBOX_ROOT / claimed_id / "inbox"

        # Check if this prompt is a frequency selection
        freq = None
        for f in ["5m", "15m", "30m", "60m"]:
            if user_prompt == f:
                freq = f
                break

        if freq:
            marker_data["frequency"] = freq
            CLAIM_MARKER.write_text(json.dumps(marker_data))
            ok(
                f"Starting **{claimed_id}** inbox check loop at **{freq}** intervals.\n\n"
                f"Inbox path: `{inbox_path}`\n\n"
                f"Check for new .md files, process tasks, write responses to outbox."
            )
        elif user_prompt == "skip":
            marker_data["frequency"] = "skip"
            CLAIM_MARKER.write_text(json.dumps(marker_data))
            ok(f"Inbox **{claimed_id}** active, no auto-check.")
        else:
            ok()  # Not a frequency reply, pass through
        return

    # ------------------------------------------------------------------
    # Phase 1: First prompt, claim an inbox
    # ------------------------------------------------------------------
    if not REGISTRY.exists():
        ok()
        return

    try:
        registry = json.loads(REGISTRY.read_text())
    except (json.JSONDecodeError, OSError):
        ok()
        return

    sessions = registry.get("sessions", {})

    # Find first unclaimed numbered session
    claimed_id = None
    for sid in sorted(sessions.keys()):
        if sid == "dispatch":
            continue
        info = sessions[sid]
        if not info.get("claimed", False):
            claimed_id = sid
            break

    if not claimed_id:
        ok("All session inboxes are claimed.")
        return

    # Claim it
    sessions[claimed_id] = {
        "claimed": True,
        "claimed_by": f"pid-{os.getppid()}",
        "claimed_at": datetime.now().isoformat(),
    }
    registry["sessions"] = sessions

    try:
        REGISTRY.write_text(json.dumps(registry, indent=2) + "\n")
    except OSError:
        ok()
        return

    # Write marker (phase 1 complete, no frequency yet)
    CLAIM_MARKER.write_text(
        json.dumps(
            {
                "session": claimed_id,
                "pid": os.getppid(),
                "claimed_at": datetime.now().isoformat(),
                "frequency": None,
            }
        )
    )

    # Ensure inbox/outbox directories exist
    inbox_path = INBOX_ROOT / claimed_id / "inbox"
    outbox_path = INBOX_ROOT / claimed_id / "outbox"
    inbox_path.mkdir(parents=True, exist_ok=True)
    outbox_path.mkdir(parents=True, exist_ok=True)

    ok(
        f"Auto-claimed inbox: **{claimed_id}**\n"
        f"Inbox: `{inbox_path}`\n"
        f"Outbox: `{outbox_path}`\n\n"
        f"Inbox check frequency? `5m` `15m` `30m` `60m` `skip`"
    )


if __name__ == "__main__":
    main()
