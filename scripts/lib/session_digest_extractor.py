#!/usr/bin/env python3
"""
Session Digest Extractor — Heuristic extraction of structured knowledge from sessions.

Processes raw session transcripts from multiple sources (Hermes LCM, Claude Code JSONL)
and produces structured SessionDigest objects with no LLM calls — pure regex/heuristics.

Stdlib only: json, re, sqlite3, os, dataclasses, argparse, pathlib, datetime, logging.
"""

import json
import logging
import os
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Sequence

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State file for tracking already-digested sessions
# ---------------------------------------------------------------------------

def _env_path(var: str, default: Path) -> Path:
    """Return a Path from an env var if set and non-empty, otherwise the default."""
    val = os.environ.get(var, "").strip()
    return Path(val) if val else default


_MODULE_ROOT = Path(__file__).resolve().parents[2]

DIGEST_STATE_PATH = _env_path(
    "DIGEST_STATE_PATH",
    _MODULE_ROOT / ".runtime" / "digest-state.json",
)

VAULT_DIGESTS_DIR = _env_path(
    "VAULT_DIGESTS_DIR",
    _MODULE_ROOT / "claude-vault" / "04-Sessions" / "digests",
)

# ---------------------------------------------------------------------------
# Topic taxonomy (keyword → label)
# ---------------------------------------------------------------------------

TOPIC_CANDIDATES: list[tuple[str, str]] = [
    ("youtube", "YouTube pipeline"),
    ("chroma", "ChromaDB"),
    ("notebooklm", "NotebookLM"),
    ("lcm", "LCM context engine"),
    ("vault", "Obsidian vault"),
    ("paperclip", "Paperclip"),
    ("swarm", "Swarm coordination"),
    ("hermes", "Hermes agent"),
    ("discord", "Discord"),
    ("trading", "Trading"),
    ("vps", "VPS"),
    ("github", "GitHub"),
    ("codex", "Codex CLI"),
    ("skill", "Skills library"),
    ("cron", "Cron jobs"),
    ("memory", "Memory system"),
    ("digest", "Digest pipeline"),
    ("edgeless", "Edgeless"),
    ("playwright", "Playwright"),
    ("otel", "OpenTelemetry"),
    ("pytest", "Testing"),
    ("typescript", "TypeScript"),
    ("python", "Python"),
    ("docker", "Docker"),
]

# ---------------------------------------------------------------------------
# Extraction markers
# ---------------------------------------------------------------------------

DECISION_MARKERS = [
    "decided", "chose", "selected", "approved", "going with",
    "let's use", "switching to", "will use", "opted for", "settled on",
    "locked in", "ruling out", "discarded", "verdict", "agreed",
]

LEARNING_MARKERS = [
    "discovered", "found that", "turns out", "til", "learned",
    "gotcha", "actually", "the fix was", "root cause", "works because",
    "key insight", "note:", "important:", "caveat:", "warning:",
]

ERROR_MARKERS = [
    "error", "Error", "ERROR", "failed", "Failed", "FAILED",
    "exception", "Exception", "traceback", "Traceback",
    "stacktrace", "StackTrace", "exitcode", "exit code",
    "syntax error", "import error", "type error", "value error",
    "attribute error", "key error", "index error",
]

# Regex for File "...", line N stack trace lines
STACK_TRACE_RE = re.compile(r'File "[^"]+",\s*line \d+')

# Strip leading bullet/list markers (-, *, •, >, numbers like "1.") and trailing punctuation
_BULLET_STRIP_RE = re.compile(r'^[\s\-*•>]+|[\s\-*•]+$')

# Regex for file paths
FILE_PATH_RE = re.compile(
    r'(?:^|[\s`"\'])('
    r'(?:/[^\s/][^\s]*'          # absolute path  /foo/bar.py
    r'|~/[^\s]*'                 # home-relative  ~/foo/bar
    r'|\./[^\s]*'                # dot-relative   ./foo/bar
    r'|[^\s/]+\.'                # bare filename  foo.py
    r'(?:py|ts|tsx|js|jsx|md|yaml|yml|json|sh|toml|env|txt|html|css)'
    r')'
    r')(?:[\s`"\':]|$)'
)

# Regex for tool/command lines
TOOL_COMMAND_RE = re.compile(
    r'^\s*[$>]\s+(\S.*)$|'
    r'\b(git|python|python3|pip|pnpm|npm|node|curl|wget|grep|find|'
    r'bash|sh|docker|make|just|jq|sqlite3|psql)\b'
)

# Regex for EDGA task references
TASK_REF_RE = re.compile(r'\bEDGA-\d+\b')

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class SessionDigest:
    session_id: str
    source: str                   # "hermes", "claude_code", "codex", "text"
    agent: str                    # which agent/profile ran this session
    timestamp: str                # ISO8601
    duration_minutes: int

    # Extracted content
    intent: str                   # first user message, capped at 200 chars
    outcome: str                  # last assistant message, capped at 300 chars

    decisions: list[str] = field(default_factory=list)
    learnings: list[str] = field(default_factory=list)
    errors_hit: list[str] = field(default_factory=list)
    files_modified: list[str] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    task_refs: list[str] = field(default_factory=list)

    # Metadata
    topics: list[str] = field(default_factory=list)
    message_count: int = 0
    user_turns: int = 0
    assistant_turns: int = 0


# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------


def _load_digest_state(state_path: Path = DIGEST_STATE_PATH) -> dict:
    """Load the persisted set of already-digested session IDs."""
    if state_path.exists():
        try:
            return json.loads(state_path.read_text())
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not read digest state at %s: %s", state_path, exc)
    return {"digested": [], "last_run": None}


def _save_digest_state(state: dict, state_path: Path = DIGEST_STATE_PATH) -> None:
    """Persist the updated digest state atomically."""
    try:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = state_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=2))
        tmp.replace(state_path)
    except OSError as exc:
        logger.error("Could not save digest state to %s: %s", state_path, exc)


# ---------------------------------------------------------------------------
# Heuristic extraction helpers
# ---------------------------------------------------------------------------


def _extract_topics(text: str) -> list[str]:
    """Return topic labels whose keywords appear in the lowercased text."""
    lower = text.lower()
    seen: list[str] = []
    for kw, label in TOPIC_CANDIDATES:
        if kw in lower and label not in seen:
            seen.append(label)
    return seen[:8]


def _extract_decisions(lines: Sequence[str]) -> list[str]:
    """Return lines that contain decision marker phrases."""
    results: list[str] = []
    for line in lines:
        lower = line.lower()
        if any(m in lower for m in DECISION_MARKERS):
            clean = _BULLET_STRIP_RE.sub("", line).strip()
            if len(clean) > 20 and clean not in results:
                results.append(clean)
    return results[:20]


def _extract_learnings(lines: Sequence[str]) -> list[str]:
    """Return lines that contain learning/discovery marker phrases."""
    results: list[str] = []
    for line in lines:
        lower = line.lower()
        if any(m in lower for m in LEARNING_MARKERS):
            clean = _BULLET_STRIP_RE.sub("", line).strip()
            if len(clean) > 20 and clean not in results:
                results.append(clean)
    return results[:20]


def _extract_errors(lines: Sequence[str]) -> list[str]:
    """Return lines that look like error messages or stack trace entries."""
    results: list[str] = []
    for line in lines:
        if any(m in line for m in ERROR_MARKERS) or STACK_TRACE_RE.search(line):
            clean = line.strip()
            if len(clean) > 10 and clean not in results:
                results.append(clean[:300])
    return results[:20]


def _extract_files(text: str) -> list[str]:
    """Extract file paths from text using regex."""
    raw = FILE_PATH_RE.findall(text)
    seen: list[str] = []
    for p in raw:
        p = p.strip()
        if p and p not in seen:
            seen.append(p)
    return seen[:30]


def _extract_tools(lines: Sequence[str]) -> list[str]:
    """Extract command/tool invocations from lines."""
    results: list[str] = []
    for line in lines:
        m = TOOL_COMMAND_RE.search(line)
        if m:
            cmd = (m.group(1) or m.group(2) or "").strip()
            if cmd and cmd not in results:
                results.append(cmd[:200])
    return results[:20]


def _extract_task_refs(text: str) -> list[str]:
    """Extract EDGA-XXXX task references."""
    found = TASK_REF_RE.findall(text)
    # Deduplicate while preserving order
    seen: list[str] = []
    for ref in found:
        if ref not in seen:
            seen.append(ref)
    return seen


def _duration_minutes(start_ts: float, end_ts: float) -> int:
    """Compute duration in minutes from two Unix timestamps."""
    if not start_ts or not end_ts:
        return 0
    return max(0, int((end_ts - start_ts) / 60))


def _ts_to_iso(ts: float) -> str:
    """Convert a Unix timestamp to ISO8601 string."""
    if not ts:
        return datetime.now(tz=timezone.utc).isoformat()
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Core extraction from a list of normalised message dicts
# ---------------------------------------------------------------------------


def _messages_to_digest(
    messages: list[dict],
    session_id: str,
    source: str,
    agent: str,
    start_ts: float,
    end_ts: float,
) -> SessionDigest:
    """
    Build a SessionDigest from a normalised list of message dicts.

    Each message dict must have keys: role ('user' | 'assistant'), content (str).
    """
    user_msgs = [m for m in messages if m["role"] == "user"]
    assistant_msgs = [m for m in messages if m["role"] == "assistant"]

    intent = user_msgs[0]["content"][:200] if user_msgs else "Unknown intent"
    outcome = assistant_msgs[-1]["content"][:300] if assistant_msgs else "No outcome recorded"

    all_text = "\n".join(m["content"] for m in messages)
    all_lines = list(all_text.splitlines())

    topics = _extract_topics(all_text)
    decisions = _extract_decisions(all_lines)
    learnings = _extract_learnings(all_lines)
    errors_hit = _extract_errors(all_lines)
    files_modified = _extract_files(all_text)
    tools_used = _extract_tools(all_lines)
    task_refs = _extract_task_refs(all_text)

    return SessionDigest(
        session_id=session_id,
        source=source,
        agent=agent,
        timestamp=_ts_to_iso(end_ts or start_ts),
        duration_minutes=_duration_minutes(start_ts, end_ts),
        intent=intent,
        outcome=outcome,
        decisions=decisions,
        learnings=learnings,
        errors_hit=errors_hit,
        files_modified=files_modified,
        tools_used=tools_used,
        task_refs=task_refs,
        topics=topics,
        message_count=len(messages),
        user_turns=len(user_msgs),
        assistant_turns=len(assistant_msgs),
    )


# ---------------------------------------------------------------------------
# Main extractor class
# ---------------------------------------------------------------------------


class SessionDigestExtractor:
    """Extract structured digests from session transcripts."""

    def __init__(
        self,
        state_path: Path = DIGEST_STATE_PATH,
    ) -> None:
        self._state_path = state_path
        self._state = _load_digest_state(state_path)

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def extract_from_lcm(
        self,
        lcm_db_path: str,
        session_id: Optional[str] = None,
        max_age_minutes: int = 60,
        profile: str = "unknown",
    ) -> list[SessionDigest]:
        """
        Extract digests from a Hermes LCM SQLite database.

        If session_id is given, process just that session (regardless of state).
        Otherwise, process all undigested sessions that are finalized or stale.
        """
        db = Path(lcm_db_path)
        if not db.exists():
            logger.warning("LCM database not found: %s", db)
            return []

        try:
            conn = sqlite3.connect(str(db))
        except sqlite3.Error as exc:
            logger.error("Cannot open LCM DB %s: %s", db, exc)
            return []

        try:
            return self._process_lcm(conn, session_id, max_age_minutes, profile)
        finally:
            conn.close()

    def extract_from_claude_code(
        self,
        sessions_dir: Optional[str] = None,
    ) -> list[SessionDigest]:
        """
        Extract digests from Claude Code JSONL session files.

        Looks in the canonical Claude Code session directory if sessions_dir is not given.
        Files that have already been digested (tracked in state) are skipped.
        """
        dirs_to_try: list[Path] = []
        if sessions_dir:
            dirs_to_try.append(Path(sessions_dir))
        else:
            project_key = "-Users-djm-claude-projects"
            dirs_to_try += [
                Path.home() / ".claude" / "projects" / project_key,
                Path.home() / ".claude" / "sessions",
            ]

        digests: list[SessionDigest] = []
        for d in dirs_to_try:
            if not d.is_dir():
                logger.debug("Claude Code sessions dir not found: %s", d)
                continue
            for jsonl_file in sorted(d.glob("*.jsonl")):
                file_digests = self._process_claude_code_file(jsonl_file)
                digests.extend(file_digests)

        return digests

    def extract_from_text(
        self,
        text: str,
        source: str,
        agent: str,
        session_id: str,
    ) -> SessionDigest:
        """
        Extract a digest from raw conversation text.

        Treats every blank-line-delimited paragraph as a separate message and
        does best-effort role detection from prefixes like 'User:', 'Assistant:'.
        """
        messages = _parse_plain_text(text)
        now_ts = datetime.now(tz=timezone.utc).timestamp()
        return _messages_to_digest(
            messages=messages,
            session_id=session_id,
            source=source,
            agent=agent,
            start_ts=now_ts,
            end_ts=now_ts,
        )

    def mark_digested(self, session_ids: list[str]) -> None:
        """Persist the given session IDs as digested."""
        for sid in session_ids:
            if sid not in self._state["digested"]:
                self._state["digested"].append(sid)
        self._state["last_run"] = datetime.now(tz=timezone.utc).isoformat()
        _save_digest_state(self._state, self._state_path)

    # -----------------------------------------------------------------------
    # LCM internals
    # -----------------------------------------------------------------------

    def _process_lcm(
        self,
        conn: sqlite3.Connection,
        target_session_id: Optional[str],
        max_age_minutes: int,
        profile: str,
    ) -> list[SessionDigest]:
        c = conn.cursor()

        # Discover sessions from the messages table
        c.execute(
            """
            SELECT session_id,
                   COUNT(*) AS msg_count,
                   MIN(timestamp) AS start_ts,
                   MAX(timestamp) AS end_ts
            FROM messages
            WHERE role IN ('user', 'assistant')
              AND content IS NOT NULL
              AND content != ''
            GROUP BY session_id
            HAVING msg_count > 2
            """,
        )
        rows = c.fetchall()
        now = datetime.now(tz=timezone.utc).timestamp()

        digests: list[SessionDigest] = []
        for sid, _, start_ts, end_ts in rows:
            if target_session_id and sid != target_session_id:
                continue
            if not target_session_id and sid in self._state["digested"]:
                continue

            # Determine whether this session is ready for digestion
            is_stale = (now - (end_ts or 0)) > (max_age_minutes * 60)
            is_finalized = self._lcm_is_finalized(c, sid)

            if not target_session_id and not is_stale and not is_finalized:
                continue

            messages = self._lcm_get_messages(c, sid)
            if not messages:
                continue

            digest = _messages_to_digest(
                messages=messages,
                session_id=sid,
                source="hermes",
                agent=profile,
                start_ts=start_ts,
                end_ts=end_ts,
            )
            digests.append(digest)

        return digests

    @staticmethod
    def _lcm_is_finalized(c: sqlite3.Cursor, session_id: str) -> bool:
        """Check the LCM lifecycle table to see if session is finalized."""
        try:
            c.execute(
                """
                SELECT 1 FROM lcm_lifecycle_state
                WHERE last_finalized_session_id = ?
                LIMIT 1
                """,
                (session_id,),
            )
            return c.fetchone() is not None
        except sqlite3.OperationalError:
            # Table may not exist in all LCM versions
            return False

    @staticmethod
    def _lcm_get_messages(
        c: sqlite3.Cursor, session_id: str
    ) -> list[dict]:
        """Fetch user and assistant messages for an LCM session."""
        c.execute(
            """
            SELECT role, content, timestamp
            FROM messages
            WHERE session_id = ?
              AND role IN ('user', 'assistant')
              AND content IS NOT NULL AND content != ''
            ORDER BY timestamp ASC, store_id ASC
            """,
            (session_id,),
        )
        rows = c.fetchall()
        messages = []
        for role, content, _ in rows:
            text = content.strip()
            if role == "assistant" and len(text) < 20:
                continue
            messages.append({"role": role, "content": text})
        return messages

    # -----------------------------------------------------------------------
    # Claude Code JSONL internals
    # -----------------------------------------------------------------------

    def _process_claude_code_file(self, path: Path) -> list[SessionDigest]:
        """Parse one Claude Code JSONL file and return a digest (at most one per file)."""
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError as exc:
            logger.warning("Cannot read Claude Code session %s: %s", path, exc)
            return []

        if not lines:
            return []

        session_id = path.stem  # UUID filename without .jsonl
        if session_id in self._state["digested"]:
            return []

        messages: list[dict] = []
        timestamps: list[float] = []
        agent = f"claude_code:{_claude_code_project_label(path.parent.name)}"
        branch = ""

        for raw_line in lines:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                obj = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            msg_type = obj.get("type")
            ts_str = obj.get("timestamp")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.rstrip("Z")).replace(
                        tzinfo=timezone.utc
                    ).timestamp()
                    timestamps.append(ts)
                except ValueError:
                    pass

            # Capture branch from first entry that has it
            if not branch and obj.get("gitBranch"):
                branch = obj["gitBranch"]

            if msg_type not in ("user", "assistant"):
                continue

            # Skip meta-only messages (e.g. system prompts injected by Claude Code)
            if obj.get("isMeta"):
                continue

            role = msg_type
            msg = obj.get("message", {})
            content = msg.get("content", "")
            text = _extract_text_from_content(content)
            if not text or len(text.strip()) < 5:
                continue

            messages.append({"role": role, "content": text.strip()})

        if not messages:
            return []

        start_ts = min(timestamps) if timestamps else 0.0
        end_ts = max(timestamps) if timestamps else 0.0

        digest = _messages_to_digest(
            messages=messages,
            session_id=session_id,
            source="claude_code",
            agent=agent,
            start_ts=start_ts,
            end_ts=end_ts,
        )
        return [digest]


# ---------------------------------------------------------------------------
# Content extraction helpers
# ---------------------------------------------------------------------------


_CC_PATH_NOISE = {"users", "djm", "private", "tmp", "var", "home", ""}


def _claude_code_project_label(dir_name: str) -> str:
    """Derive a short project label from a Claude Code project directory name.

    Claude Code encodes the project path as the transcript's parent directory,
    e.g. ``-Users-djm-claude-projects`` or ``-private-tmp-mirofish-claude-lane``.
    Strip common path-prefix noise and keep the trailing, meaningful segments so
    entries attribute to ``claude_code:claude-projects``,
    ``claude_code:mirofish-claude-lane``, etc. Falls back to ``unknown``.
    """
    segments = [s for s in dir_name.split("-") if s.lower() not in _CC_PATH_NOISE]
    if not segments:
        return "unknown"
    # Keep up to the last 3 segments to stay readable but distinct.
    return "-".join(segments[-3:])


def _extract_text_from_content(content: object) -> str:
    """
    Flatten Anthropic message content into a single string.

    content may be:
    - a plain str
    - a list of content blocks (each with 'type' and optionally 'text')
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if not isinstance(block, dict):
                continue
            block_type = block.get("type", "")
            if block_type == "text":
                text = block.get("text", "")
                if text:
                    parts.append(text)
            elif block_type == "tool_use":
                name = block.get("name", "")
                inp = block.get("input", {})
                if name:
                    # Capture command field from Bash tool calls
                    cmd = inp.get("command", inp.get("description", ""))
                    if cmd:
                        parts.append(f"[tool:{name}] {cmd[:200]}")
                    else:
                        parts.append(f"[tool:{name}]")
            elif block_type == "tool_result":
                result_content = block.get("content", "")
                if isinstance(result_content, str) and result_content:
                    parts.append(result_content[:300])
                elif isinstance(result_content, list):
                    for rb in result_content:
                        if isinstance(rb, dict) and rb.get("type") == "text":
                            t = rb.get("text", "")
                            if t:
                                parts.append(t[:300])
        return "\n".join(parts)
    return ""


def _parse_plain_text(text: str) -> list[dict]:
    """
    Parse plain conversation text into role/content dicts.

    Detects 'User:' / 'Assistant:' prefixes; falls back to treating
    all paragraphs as user messages.
    """
    messages: list[dict] = []
    current_role = "user"
    current_lines: list[str] = []

    role_re = re.compile(r'^(User|Human|Assistant|Claude|Bot)\s*:\s*', re.IGNORECASE)

    for line in text.splitlines():
        m = role_re.match(line)
        if m:
            if current_lines:
                messages.append({
                    "role": current_role,
                    "content": "\n".join(current_lines).strip(),
                })
                current_lines = []
            prefix = m.group(1).lower()
            current_role = "assistant" if prefix in ("assistant", "claude", "bot") else "user"
            current_lines.append(line[m.end():])
        else:
            current_lines.append(line)

    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            messages.append({"role": current_role, "content": content})

    return messages


# ---------------------------------------------------------------------------
# Working memory conversion
# ---------------------------------------------------------------------------


def digest_to_working_memory_entries(digest: SessionDigest) -> list[dict]:
    """
    Convert a SessionDigest into working memory entry dicts.

    All entries start at tier='observation' with provenance='session_digest'.
    Promotion to 'decision' or 'lesson' happens via later review.
    """
    entries: list[dict] = []
    first_task_ref = digest.task_refs[0] if digest.task_refs else None
    base = {
        "source_agent": digest.agent,
        "source_session": digest.session_id,
        "task_ref": first_task_ref,
        "tags": list(digest.topics),
        "importance": 0.5,
        "confidence": 0.5,
        "tier": "observation",
        "provenance": "session_digest",
        "timestamp": digest.timestamp,
    }

    for decision in digest.decisions:
        entry = dict(base)
        entry["content"] = decision
        entry["content_type"] = "decision"
        entries.append(entry)

    for learning in digest.learnings:
        entry = dict(base)
        entry["content"] = learning
        entry["content_type"] = "learning"
        entries.append(entry)

    for error in digest.errors_hit:
        entry = dict(base)
        entry["content"] = error
        entry["content_type"] = "error"
        entries.append(entry)

    return entries


# ---------------------------------------------------------------------------
# Vault markdown serialisation
# ---------------------------------------------------------------------------


def digest_to_markdown(digest: SessionDigest) -> str:
    """Convert a SessionDigest to a markdown string for vault storage."""

    def _yaml_list(items: list[str]) -> str:
        if not items:
            return "[]"
        return "\n" + "\n".join(f"  - {_yaml_escape(i)}" for i in items)

    def _yaml_escape(s: str) -> str:
        # Simple escaping: wrap in double-quotes if the value contains special chars
        if any(c in s for c in (':', '#', '[', ']', '{', '}', '>', '|', '"', "'")):
            return '"' + s.replace('"', '\\"') + '"'
        return s

    lines: list[str] = [
        "---",
        f"session_id: {digest.session_id}",
        f"source: {digest.source}",
        f"agent: {digest.agent}",
        f"date: {digest.timestamp}",
        f"topics:{_yaml_list(digest.topics)}",
        f"task_refs:{_yaml_list(digest.task_refs)}",
        "---",
        "",
        "## Intent",
        "",
        digest.intent,
        "",
        "## Outcome",
        "",
        digest.outcome,
        "",
    ]

    if digest.decisions:
        lines += ["## Decisions", ""]
        lines += [f"- {d}" for d in digest.decisions]
        lines.append("")

    if digest.learnings:
        lines += ["## Learnings", ""]
        lines += [f"- {l}" for l in digest.learnings]
        lines.append("")

    if digest.errors_hit:
        lines += ["## Errors & Fixes", ""]
        lines += [f"- {e}" for e in digest.errors_hit]
        lines.append("")

    if digest.files_modified:
        lines += ["## Files Modified", ""]
        lines += [f"- {f}" for f in digest.files_modified]
        lines.append("")

    if digest.tools_used:
        lines += ["## Tools Used", ""]
        lines += [f"- {t}" for t in digest.tools_used]
        lines.append("")

    lines += [
        "---",
        "",
        "*Auto-generated session digest — heuristic extraction, no LLM*",
    ]

    return "\n".join(lines)


def write_digest_to_vault(
    digest: SessionDigest,
    vault_dir: Path = VAULT_DIGESTS_DIR,
) -> Path:
    """
    Write a SessionDigest as markdown to the vault digests directory.

    Returns the path of the written file.
    Skips writing if the file already exists (idempotent).
    """
    vault_dir.mkdir(parents=True, exist_ok=True)

    try:
        dt = datetime.fromisoformat(digest.timestamp.rstrip("Z"))
    except ValueError:
        dt = datetime.now(tz=timezone.utc)

    date_str = dt.strftime("%Y-%m-%d")
    # Build a filesystem-safe slug from the session ID.
    # Replace any non-alphanumeric chars (underscores, hyphens ok) with empty string,
    # then take up to 24 chars to keep filenames readable but unique.
    safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '', digest.session_id)[:24]
    filename = f"{date_str}-{safe_id}.md"
    filepath = vault_dir / filename

    if filepath.exists():
        logger.debug("Digest already exists: %s", filepath)
        return filepath

    md = digest_to_markdown(digest)
    filepath.write_text(md, encoding="utf-8")
    logger.info("Wrote digest: %s", filepath)
    return filepath
