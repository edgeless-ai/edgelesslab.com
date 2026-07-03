#!/usr/bin/env python3
"""damage-control.py — PreToolUse consumer for patterns.yaml.

Recreated 2026-07-01: the original was never git-committed and was deleted
in a hooks-dir cleanup (only its .pyc survived), leaving patterns.yaml with
no consumer — every "block this forever" lesson silently unenforced.

Reads the hook JSON from stdin, checks Bash commands against
dangerous_commands.bash.block_patterns and file-writing tools against
paths.zero_access / paths.read_only, honoring the allowlist.

Exit 0 = allow. Exit 2 + stderr = block (message shown to the model).
Fails OPEN on internal errors (never breaks normal work), logging to
damage-control-errors.log next to this file.

No pyyaml dependency: patterns.yaml is a fixed simple shape (sections of
quoted single-line list items), parsed with a ~20-line section walker so the
hook runs on any system python.
"""
import json
import pathlib
import re
import sys

HOOK_DIR = pathlib.Path(__file__).resolve().parent
PATTERNS = HOOK_DIR / "patterns.yaml"

SECTION_KEYS = {
    "block_patterns": "block",
    "block_patterns_always": "block_always",
    "zero_access": "zero",
    "read_only": "readonly",
    "no_delete": "nodelete",
    "allowlist": "allow",
}

ITEM_RE = re.compile(r"^\s*-\s+'(.*)'\s*(?:#.*)?$")
KEY_RE = re.compile(r"^\s*(\w+):\s*$")


def load_patterns():
    out = {v: [] for v in SECTION_KEYS.values()}
    current = None
    for line in PATTERNS.read_text().splitlines():
        m = KEY_RE.match(line)
        if m:
            current = SECTION_KEYS.get(m.group(1))
            continue
        m = ITEM_RE.match(line)
        if m and current:
            out[current].append(m.group(1))
    return out


def allowed(text, allow):
    return any(a in text for a in allow)


def main():
    data = json.load(sys.stdin)
    tool = data.get("tool_name", "")
    ti = data.get("tool_input", {}) or {}
    p = load_patterns()

    if tool == "Bash":
        cmd = ti.get("command", "") or ""
        for pat in p["block_always"]:
            try:
                if re.search(pat, cmd, re.IGNORECASE):
                    print(
                        f"BLOCKED by damage-control (allowlist-immune): command "
                        f"matches {pat!r}. crontab edits are banned — use launchd "
                        f"StartCalendarInterval (see feedback-macos-cron-sleep-and-crontab-tcc).",
                        file=sys.stderr,
                    )
                    return 2
            except re.error:
                continue
        if not allowed(cmd, p["allow"]):
            for pat in p["block"]:
                try:
                    if re.search(pat, cmd, re.IGNORECASE):
                        print(
                            f"BLOCKED by damage-control (patterns.yaml block_patterns): "
                            f"command matches dangerous pattern {pat!r}. "
                            f"If this is genuinely safe and intended, ask David or use a "
                            f"narrower command.",
                            file=sys.stderr,
                        )
                        return 2
                except re.error:
                    continue
            # rm against no_delete paths
            if re.search(r"\brm\b|\bunlink\b", cmd):
                for path in p["nodelete"]:
                    if path in cmd:
                        print(
                            f"BLOCKED by damage-control: rm/unlink touching protected "
                            f"no_delete path {path!r} (patterns.yaml).",
                            file=sys.stderr,
                        )
                        return 2
        return 0

    if tool in ("Write", "Edit", "NotebookEdit"):
        fp = ti.get("file_path", "") or ti.get("notebook_path", "") or ""
        if not fp or allowed(fp, p["allow"]):
            return 0
        for path in p["zero"]:
            if path in fp:
                print(
                    f"BLOCKED by damage-control: {fp} matches zero_access entry "
                    f"{path!r} (patterns.yaml) — never read or write.",
                    file=sys.stderr,
                )
                return 2
        for path in p["readonly"]:
            # read_only entries may be anchored regexes (^/Users/...) or substrings
            hit = (
                re.search(path, fp)
                if path.startswith("^")
                else (path in fp)
            )
            if hit:
                print(
                    f"BLOCKED by damage-control: write to {fp} matches read_only/"
                    f"deprecated-location entry {path!r} (patterns.yaml). Use the "
                    f"canonical location (see CLAUDE.md Canonical Locations).",
                    file=sys.stderr,
                )
                return 2
        return 0

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # fail open, log
        try:
            (HOOK_DIR / "damage-control-errors.log").open("a").write(
                f"{exc!r}\n"
            )
        except Exception:
            pass
        sys.exit(0)
