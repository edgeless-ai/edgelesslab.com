#!/usr/bin/env python3
"""
verify-completion.py — deterministic DONE-GATE for Hermes Kanban tasks.

CLAUDE.md declares this MANDATORY. It re-verifies a task's completion CLAIMS
against reality instead of trusting agent self-report (the failure mode that let
scribe mark t_1e3e98da 'done' for a KB article that was never written).

Deterministic. No LLM calls. Reads `hermes kanban --board <board> show <id>` and:
  - flags HOLLOW completions (result_len==0 that still claim an artifact)
  - checks claimed concrete file paths exist on disk
  - checks "wrote/created ... in <dir>" claims produced a real, on-time artifact
  - re-runs any claimed test/command and requires it to pass

Exit codes:  0 = VERIFIED   1 = FAILED   2 = UNVERIFIABLE   3 = usage/lookup error

Usage:
  python .claude/hooks/verify-completion.py --task t_1e3e98da [--verbose] [--board edgeless]
  python .claude/hooks/verify-completion.py --audit-recent 30   # warn-only sweep of recent done tasks

Enforcement is OFF by default (warn-only). A wrapper flips it via DONE_GATE_ENFORCE=1.
"""
import argparse
import os
import re
import subprocess
import sys
import time

PROJECT = os.path.expanduser("~/claude-projects")
VAULT = os.path.join(PROJECT, "claude-vault")
HERMES = os.path.expanduser("~/.hermes")
# roots a claimed path might live under (for extraction + existence checks)
PATH_ROOTS = ("claude-vault/", "scripts/", "reports/", "src/", "tools/", "docs/",
              "content-cannon/", ".claude/", "data/", "captures/", "generated/", "output/")
ARTIFACT_WORDS = re.compile(r"\b(wrote|write|created|created a|produced|saved|published|"
                            r"generated|added|enriched .* into)\b", re.I)
ARTIFACT_NOUNS = re.compile(r"\b(article|file|report|note|doc|document|script|kb|"
                            r"summary|entry|post|page|image|meme)\b", re.I)
TEST_CMD = re.compile(r"(pytest[\w\s./-]*|python3?(?:\.\d+)? -m (?:py_compile|pytest)[\w\s./-]*|"
                      r"npm (?:test|run [\w:-]+)|bash [\w./-]+\.sh|py_compile [\w./-]+)", re.I)


def sh(cmd, timeout=120):
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           timeout=timeout, cwd=PROJECT)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, "timeout"
    except Exception as e:  # noqa
        return 125, str(e)


def show_task(task_id, board):
    rc, out = sh(f"hermes kanban --board {board} show {task_id}", timeout=30)
    if rc != 0 or "Task " not in out:
        return None
    return out


def parse(text):
    d = {"status": None, "result_len": None, "completed_epoch": None,
         "title": "", "body": "", "summary": ""}
    m = re.search(r"^Task \S+:\s*(.+)$", text, re.M)
    if m:
        d["title"] = m.group(1).strip()
    m = re.search(r"status:\s*(\w+)", text)
    if m:
        d["status"] = m.group(1)
    m = re.search(r"result_len':\s*(\d+)", text)
    if m:
        d["result_len"] = int(m.group(1))
    m = re.search(r"completed:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", text)
    if m:
        try:
            d["completed_epoch"] = time.mktime(time.strptime(m.group(1), "%Y-%m-%d %H:%M"))
        except Exception:
            pass
    mb = re.search(r"\nBody:\n(.*?)(?:\nEvents \(|\nRuns \(|\nLatest summary:|\Z)", text, re.S)
    if mb:
        d["body"] = mb.group(1)
    ms = re.search(r"Latest summary:\n(.*?)(?:\nEvents \(|\nRuns \(|\Z)", text, re.S)
    if ms:
        d["summary"] = ms.group(1).strip()
    return d


def extract_paths(text):
    paths = set()
    # backtick-quoted paths
    for m in re.finditer(r"`([^`]+)`", text):
        tok = m.group(1).strip()
        if "/" in tok and (tok.startswith(PATH_ROOTS) or re.search(r"\.\w{1,5}$", tok)):
            paths.add(tok.rstrip("/. "))
    # bare paths under known roots
    for root in PATH_ROOTS:
        for m in re.finditer(re.escape(root) + r"[^\s`'\"]+", text):
            paths.add(m.group(0).rstrip("/. ,)"))
    return paths


def resolve(p):
    """Resolve a claimed path to disk. .hermes/ lives under $HOME, not the repo."""
    p = os.path.expanduser(p)
    if os.path.isabs(p):
        return p
    if p.startswith(".hermes/"):
        return os.path.join(os.path.expanduser("~"), p)
    return os.path.join(PROJECT, p)


def significant_words(title):
    stop = {"the", "and", "for", "with", "into", "from", "a", "an", "of", "to", "in",
            "on", "enrich", "re", "verify", "task", "cron", "job", "rss", "content"}
    return [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9]{2,}", title)
            if w.lower() not in stop]


def dir_has_recent_or_matching(dpath, completed_epoch, keywords):
    """A 'wrote in <dir>' claim is credible only if the dir holds a file that is
    either mtime-near the completion OR matches >=2 significant title keywords."""
    if not os.path.isdir(dpath):
        return False, "dir does not exist"
    hits = []
    for root, _, files in os.walk(dpath):
        for fn in files:
            fp = os.path.join(root, fn)
            near = False
            if completed_epoch:
                try:
                    near = abs(os.path.getmtime(fp) - completed_epoch) < 36 * 3600
                except OSError:
                    pass
            kw = 0
            low = fn.lower()
            if keywords:
                kw = sum(1 for k in keywords if k in low)
                if kw < 2:
                    try:
                        body = open(fp, encoding="utf-8", errors="ignore").read(4000).lower()
                        kw = sum(1 for k in keywords if k in body)
                    except OSError:
                        pass
            if near or kw >= 2:
                hits.append(fn)
    if hits:
        return True, f"artifact found: {hits[0]}"
    return False, "no on-time or matching artifact in dir"


def verify(task_id, board, verbose=False):
    text = show_task(task_id, board)
    if text is None:
        return 3, [f"could not load task {task_id} on board {board}"]
    d = parse(text)
    if d["status"] != "done":
        return 2, [f"status is '{d['status']}', not done — nothing to verify"]

    claims_text = d["body"] + "\n" + d["summary"]
    reasons, checkable = [], 0

    # 1) hollow completion
    claims_artifact = bool(ARTIFACT_WORDS.search(claims_text) and ARTIFACT_NOUNS.search(claims_text))
    if d["result_len"] == 0 and claims_artifact:
        checkable += 1
        reasons.append("FAIL: hollow completion — result_len=0 but the task claims it produced an artifact")

    # 2) concrete file paths must exist; dir claims must hold a real artifact
    kws = significant_words(d["title"])
    seen_paths = sorted(extract_paths(claims_text))
    for p in seen_paths:
        if "*" in p or "?" in p:
            continue  # glob patterns are not a concrete checkable claim
        if any(q != p and q.startswith(p) for q in seen_paths):
            continue  # a longer path supersedes this truncated prefix (e.g. spaces)
        ap = resolve(p)
        is_dir_claim = p.endswith("/") or (not re.search(r"\.\w{1,5}$", p))
        checkable += 1
        if is_dir_claim:
            ok, why = dir_has_recent_or_matching(ap, d["completed_epoch"], kws)
            if not ok:
                reasons.append(f"FAIL: claimed output dir `{p}` — {why}")
            elif verbose:
                reasons.append(f"ok: `{p}` — {why}")
        else:
            if not os.path.exists(ap):
                reasons.append(f"FAIL: claimed file `{p}` does not exist on disk")
            elif verbose:
                reasons.append(f"ok: `{p}` exists")

    # 3) re-run claimed test/commands
    for m in TEST_CMD.finditer(claims_text):
        cmd = m.group(1).strip()
        checkable += 1
        rc, _ = sh(cmd, timeout=120)
        if rc != 0:
            reasons.append(f"FAIL: claimed command `{cmd}` re-ran with exit {rc}")
        elif verbose:
            reasons.append(f"ok: `{cmd}` re-ran clean")

    if checkable == 0:
        return 2, ["UNVERIFIABLE: completion provided no checkable evidence (no artifact paths, "
                   "no tests, no result). An agent that shows no proof must not silently pass."]
    if any(r.startswith("FAIL") for r in reasons):
        return 1, reasons
    return 0, (reasons or ["VERIFIED: all completion claims hold"])


def audit_recent(n, board, verbose):
    rc, out = sh(f"hermes kanban --board {board} list --status done", timeout=30)
    ids = re.findall(r"\b(t_[0-9a-f]+)\b", out)[:n]
    tallies = {0: [], 1: [], 2: [], 3: []}
    for tid in ids:
        code, reasons = verify(tid, board, verbose=False)
        tallies[code].append((tid, reasons))
    print(f"DONE-GATE audit (warn-only) — last {len(ids)} done tasks on {board}:")
    print(f"  ✅ verified: {len(tallies[0])}   ❌ FAILED: {len(tallies[1])}   "
          f"⚠️ unverifiable: {len(tallies[2])}   ? lookup-err: {len(tallies[3])}")
    for tid, reasons in tallies[1]:
        print(f"  ❌ {tid}: {reasons[0]}")
    if verbose:
        for tid, reasons in tallies[2]:
            print(f"  ⚠️ {tid}: {reasons[0]}")
    # warn-only: exit 0 unless enforcing
    return 1 if (tallies[1] and os.environ.get("DONE_GATE_ENFORCE") == "1") else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", "--type", dest="task")
    ap.add_argument("--board", default="edgeless")
    ap.add_argument("--audit-recent", type=int, default=0)
    ap.add_argument("--verbose", action="store_true")
    a = ap.parse_args()

    if a.audit_recent:
        sys.exit(audit_recent(a.audit_recent, a.board, a.verbose))
    if not a.task:
        print("usage: --task <id> | --audit-recent <N>", file=sys.stderr)
        sys.exit(3)

    code, reasons = verify(a.task, a.board, a.verbose)
    label = {0: "VERIFIED", 1: "FAILED", 2: "UNVERIFIABLE", 3: "LOOKUP-ERROR"}[code]
    print(f"[done-gate] {a.task}: {label}")
    for r in reasons:
        print(f"   {r}")
    enforce = os.environ.get("DONE_GATE_ENFORCE") == "1"
    if code == 1 and not enforce:
        print("   (warn-only: DONE_GATE_ENFORCE=1 to make this block completion)")
        sys.exit(0)
    sys.exit(code)


if __name__ == "__main__":
    main()
