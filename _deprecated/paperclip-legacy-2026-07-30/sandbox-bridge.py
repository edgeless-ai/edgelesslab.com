#!/usr/bin/env python3
"""
sandbox-bridge.py -- Execute actions queued by sandboxed Claude routines.

Scheduled tasks (Cowork routines) run in a sandbox that cannot reach
localhost services. They write structured JSON action files to:

    .inboxes/sandbox-actions/pending/

This script picks them up and executes against local services:
  - paperclip_create_issue  -> POST to Paperclip API
  - telegram_send           -> send_telegram.py
  - gmail_mark_read         -> gws CLI

Runs via cron every 5 minutes. Processed files move to processed/.
Failed files move to failed/ with error annotation.

Usage:
    python3 scripts/sandbox-bridge.py [--dry-run] [--verbose]
"""

import json
import os
import shutil
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path("/Users/djm/claude-projects")
ACTIONS_DIR = PROJECT_ROOT / ".inboxes" / "sandbox-actions"
PENDING_DIR = ACTIONS_DIR / "pending"
PROCESSED_DIR = ACTIONS_DIR / "processed"
FAILED_DIR = ACTIONS_DIR / "failed"
LOG_FILE = PROJECT_ROOT / "logs" / "sandbox-bridge.log"

PAPERCLIP_API = "http://127.0.0.1:3100/api"
PAPERCLIP_COMPANY = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"
TELEGRAM_SCRIPT = Path("/Users/djm/.claude/skills/telegram-message/scripts/send_telegram.py")
GWS_BIN = Path(os.path.expanduser("~/.local/bin/gws"))
PYTHON = "/opt/homebrew/opt/python@3.11/bin/python3.11"
SHANNON_CLAUDE = PROJECT_ROOT / "scripts" / "shannon-claude.sh"
MAX_SHANNON_OUTPUT_CHARS = 40_000

DRY_RUN = "--dry-run" in sys.argv
VERBOSE = "--verbose" in sys.argv


def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{ts} {msg}"
    if VERBOSE:
        print(line)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def paperclip_create_issue(payload: dict) -> dict:
    """POST a new issue to Paperclip API."""
    url = f"{PAPERCLIP_API}/companies/{PAPERCLIP_COMPANY}/issues"
    data = json.dumps({
        "title": payload["title"],
        "description": payload.get("description", ""),
        "priority": payload.get("priority", "medium"),
        "status": payload.get("status", "todo"),
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            issue_id = result.get("number", result.get("id", "?"))
            log(f"  Created Paperclip issue EDGA-{issue_id}: {payload['title']}")
            return {"ok": True, "issue": f"EDGA-{issue_id}"}
    except urllib.error.URLError as e:
        return {"ok": False, "error": str(e)}


def paperclip_find_issue(issue_ref: str) -> dict | None:
    """Find a Paperclip issue by UUID or EDGA-xxx identifier."""
    if not issue_ref:
        return None

    try:
        url = f"{PAPERCLIP_API}/issues/{issue_ref}"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        pass

    try:
        url = f"{PAPERCLIP_API}/companies/{PAPERCLIP_COMPANY}/issues?limit=500"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            issues = json.loads(resp.read().decode())
    except Exception:
        return None

    for issue in issues:
        if issue.get("identifier") == issue_ref:
            return issue
    return None


def paperclip_add_comment(issue_ref: str, body: str) -> dict:
    """POST a comment to a Paperclip issue by UUID or EDGA-xxx identifier."""
    issue = paperclip_find_issue(issue_ref)
    if not issue:
        return {"ok": False, "error": f"Paperclip issue not found: {issue_ref}"}

    issue_id = issue.get("id")
    url = f"{PAPERCLIP_API}/issues/{issue_id}/comments"
    data = json.dumps({"body": body}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {"ok": True, "comment": json.loads(resp.read().decode())}
    except urllib.error.URLError as e:
        return {"ok": False, "error": str(e)}


def truncate_text(value: str, limit: int = MAX_SHANNON_OUTPUT_CHARS) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + f"\n\n[truncated: {len(value) - limit} chars omitted]"


def checked_choice(payload: dict, key: str, default: str, allowed: set[str]) -> str:
    value = payload.get(key, default)
    if value not in allowed:
        raise ValueError(f"{key} must be one of {sorted(allowed)}")
    return value


def checked_cwd(payload: dict) -> Path:
    cwd = Path(payload.get("cwd", PROJECT_ROOT)).expanduser().resolve()
    root = PROJECT_ROOT.resolve()
    if cwd != root and root not in cwd.parents:
        raise ValueError(f"cwd must be inside {root}: {cwd}")
    return cwd


def shannon_claude(payload: dict) -> dict:
    """Run Claude through Shannon and optionally post the answer to Paperclip."""
    prompt = payload.get("prompt", "")
    if not isinstance(prompt, str) or not prompt.strip():
        return {"ok": False, "error": "prompt is required"}

    if not SHANNON_CLAUDE.exists():
        return {"ok": False, "error": f"shannon wrapper not found: {SHANNON_CLAUDE}"}

    try:
        output_format = checked_choice(payload, "output_format", "text", {"text", "json", "stream-json"})
        permission_mode = checked_choice(
            payload,
            "permission_mode",
            "default",
            {"default", "acceptEdits", "plan", "bypassPermissions"},
        )
        cwd = checked_cwd(payload)
        timeout_seconds = int(payload.get("timeout_seconds", 600))
        max_output_chars = int(payload.get("max_output_chars", MAX_SHANNON_OUTPUT_CHARS))
    except (TypeError, ValueError) as e:
        return {"ok": False, "error": str(e)}

    if timeout_seconds < 30 or timeout_seconds > 3600:
        return {"ok": False, "error": "timeout_seconds must be between 30 and 3600"}
    if max_output_chars < 1000 or max_output_chars > 200000:
        return {"ok": False, "error": "max_output_chars must be between 1000 and 200000"}

    command = [
        str(SHANNON_CLAUDE),
        "-p",
        prompt,
        "--output-format",
        output_format,
        "--permission-mode",
        permission_mode,
    ]

    model = payload.get("model")
    if isinstance(model, str) and model.strip():
        command.extend(["--model", model.strip()])

    if payload.get("verbose"):
        command.append("--verbose")

    try:
        result = subprocess.run(
            command,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"shannon timed out after {timeout_seconds}s"}

    stdout = truncate_text(result.stdout.strip(), max_output_chars)
    stderr = truncate_text(result.stderr.strip(), max_output_chars)
    ok = result.returncode == 0
    response = {
        "ok": ok,
        "returncode": result.returncode,
        "stdout": stdout,
        "stderr": stderr,
    }

    issue_ref = payload.get("paperclip_issue") or payload.get("paperclip_issue_id")
    if issue_ref and stdout:
        # Structured transcript comment (stolen from hermes-paperclip-adapter)
        try:
            from scripts.lib.paperclip_task_ops import (
                TranscriptEntry, format_transcript_comment,
            )
            entry = TranscriptEntry(
                issue_ref=str(issue_ref),
                agent_name=payload.get("agent", "shannon"),
                outcome="success" if ok else "error",
                summary=stdout[:max_output_chars],
            )
            entry.add_step(
                "shannon-claude",
                "success" if ok else "error",
                output_summary=stdout[:120] if ok else None,
                error=stderr[:120] if not ok else None,
            )
            comment_body = format_transcript_comment(entry)
        except ImportError:
            comment_body = "\n".join([
                "Shannon Claude result:",
                "",
                "```text",
                stdout[:max_output_chars],
                "```",
            ])
        comment_result = paperclip_add_comment(str(issue_ref), comment_body)
        response["paperclip_comment"] = comment_result
        ok = ok and comment_result.get("ok", False)
        response["ok"] = ok

    log(f"  Shannon Claude: returncode={result.returncode}, stdout={len(stdout)} chars")
    return response


def telegram_send(payload: dict) -> dict:
    """Send a Telegram message via the existing script."""
    message = payload.get("message", "")
    if not message:
        return {"ok": False, "error": "empty message"}

    if not TELEGRAM_SCRIPT.exists():
        return {"ok": False, "error": f"telegram script not found: {TELEGRAM_SCRIPT}"}

    try:
        result = subprocess.run(
            [PYTHON, str(TELEGRAM_SCRIPT), message],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            log(f"  Telegram sent ({len(message)} chars)")
            return {"ok": True}
        else:
            return {"ok": False, "error": result.stderr.strip()}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "telegram send timed out"}


def gmail_mark_read(payload: dict) -> dict:
    """Mark Gmail messages as read via gws CLI."""
    message_ids = payload.get("message_ids", [])
    if not message_ids:
        return {"ok": False, "error": "no message_ids"}

    if not GWS_BIN.exists():
        return {"ok": False, "error": f"gws not found: {GWS_BIN}"}

    results = []
    for msg_id in message_ids:
        try:
            result = subprocess.run(
                [str(GWS_BIN), "gmail", "users", "messages", "modify",
                 "--params", json.dumps({"userId": "me", "id": msg_id}),
                 "--json", json.dumps({"removeLabelIds": ["UNREAD"]})],
                capture_output=True, text=True, timeout=10,
            )
            results.append({"id": msg_id, "ok": result.returncode == 0})
        except subprocess.TimeoutExpired:
            results.append({"id": msg_id, "ok": False, "error": "timeout"})

    success = sum(1 for r in results if r["ok"])
    log(f"  Gmail mark-read: {success}/{len(message_ids)} succeeded")
    return {"ok": success == len(message_ids), "results": results}


def gmail_send_draft(payload: dict) -> dict:
    """Send a Gmail draft via gws CLI."""
    draft_id = payload.get("draft_id", "")
    if not draft_id:
        return {"ok": False, "error": "no draft_id"}

    if not GWS_BIN.exists():
        return {"ok": False, "error": f"gws not found: {GWS_BIN}"}

    try:
        result = subprocess.run(
            [str(GWS_BIN), "gmail", "users", "drafts", "send",
             "--params", json.dumps({"userId": "me"}),
             "--json", json.dumps({"id": draft_id})],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            log(f"  Gmail draft sent: {draft_id}")
            return {"ok": True, "draft_id": draft_id}
        else:
            return {"ok": False, "error": result.stderr.strip() or result.stdout.strip()}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "gmail send timed out"}


# Action type registry
HANDLERS = {
    "paperclip_create_issue": paperclip_create_issue,
    "shannon_claude": shannon_claude,
    "telegram_send": telegram_send,
    "gmail_mark_read": gmail_mark_read,
    "gmail_send_draft": gmail_send_draft,
}


# Tasks reverted to local cron (2026-05-18). Bridge files with these prefixes
# are dropped instead of delivered to prevent duplicates while Cowork is still firing.
REVERTED_TASK_PREFIXES = (
    "newsletter-",
    "morning-briefing-",
    "rss-daily-digest-",
    "rss-digest-",
    "email-triage-",
    "paperclip-audit-",
    "memory-promotion-",
    "content-flywheel-",
    "notebooklm-",
)


def process_file(filepath: Path) -> bool:
    """Process a single action file. Returns True on success."""
    # Drop reverted-task output so Cowork doesn't deliver duplicates of local cron
    name = filepath.name
    if any(name.startswith(p) for p in REVERTED_TASK_PREFIXES):
        log(f"  DROPPED (reverted to local cron): {name}")
        dropped_dir = ACTIONS_DIR / "dropped-reverted"
        dropped_dir.mkdir(parents=True, exist_ok=True)
        shutil.move(str(filepath), str(dropped_dir / name))
        return True

    try:
        content = filepath.read_text()
        actions = json.loads(content)
    except (json.JSONDecodeError, OSError) as e:
        log(f"  PARSE ERROR: {e}")
        return False

    # Support single action or list of actions
    if isinstance(actions, dict):
        actions = [actions]

    all_ok = True
    results = []
    for i, action in enumerate(actions):
        action_type = action.get("type", "unknown")
        handler = HANDLERS.get(action_type)

        if not handler:
            log(f"  UNKNOWN ACTION TYPE: {action_type}")
            results.append({"type": action_type, "ok": False, "error": "unknown type"})
            all_ok = False
            continue

        if DRY_RUN:
            log(f"  DRY RUN [{i+1}/{len(actions)}]: {action_type} -- {json.dumps(action.get('payload', action))[:100]}")
            results.append({"type": action_type, "ok": True, "dry_run": True})
            continue

        payload = action.get("payload", action)
        result = handler(payload)
        results.append({"type": action_type, **result})
        if not result.get("ok"):
            all_ok = False

    if DRY_RUN:
        return all_ok

    # Write results back to the action file for audit
    action_with_results = {
        "original": json.loads(content),
        "results": results,
        "processed_at": datetime.now().isoformat(),
    }

    dest_dir = PROCESSED_DIR if all_ok else FAILED_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filepath.name

    dest.write_text(json.dumps(action_with_results, indent=2))
    filepath.unlink()

    return all_ok


def main():
    # Ensure directories exist
    for d in [PENDING_DIR, PROCESSED_DIR, FAILED_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    # Find pending action files
    pending = sorted(PENDING_DIR.glob("*.json"))
    if not pending:
        return  # Silent exit, no spam in logs

    log(f"=== Bridge run: {len(pending)} pending actions ===")

    success = 0
    failed = 0
    for filepath in pending:
        log(f"Processing: {filepath.name}")
        if process_file(filepath):
            success += 1
        else:
            failed += 1

    log(f"=== Done: {success} succeeded, {failed} failed ===")


if __name__ == "__main__":
    main()
