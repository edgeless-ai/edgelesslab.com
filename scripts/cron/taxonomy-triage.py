#!/usr/bin/env python3
"""
Taxonomy Triage — daily scan for workspace + vault drift.

Sources of truth:
- claude-projects/CLAUDE.md "Canonical Locations" table
- claude-vault/_system/TAXONOMY.md
- reports/claude-projects-cleanup-manifest-2026-04-28.md

Outputs:
- Always: structured report at logs/taxonomy-triage-YYYY-MM-DD.json + claude-vault/13-Reports/taxonomy-triage-YYYY-MM-DD.md
- If drift count exceeds --threshold: creates a deduped Hermes Kanban task

Usage:
    python3 taxonomy-triage.py [--report-only] [--threshold 5] [--repo edgeless-ai/edgelesslab.com]
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

PROJECT = Path(os.environ.get("CLAUDE_PROJECTS_ROOT", "/Users/djm/claude-projects"))
VAULT = PROJECT / "claude-vault"
LOG_DIR = PROJECT / "logs"
REPORT_DIR_VAULT = VAULT / "13-Reports"
ROLLING_TITLE_PREFIX = "[Ops] [Auto] Taxonomy drift:"
HERMES_BOARD = "edgeless"

# Canonical vault numbered prefixes (only one folder per number allowed)
CANONICAL_NUMBERED = {
    "00": "00-Inbox", "01": "01-Journal", "02": "02-Agents",
    "03": "03-Knowledge", "04": "04-Sessions", "05": "05-Solutions",
    "06": "06-Config", "07": "07-Business", "08": "08-Reference",
    "09": "09-Secrets", "10": "10-Meta", "11": "11-Databases",
    "13": "13-Reports", "14": "14-Knowledge-Bases", "15": "15-Products",
    "16": "16-Projects", "17": "17-Websites", "18": "18-Evals",
    "99": "99-Archive",
}

# Allowed non-numbered top-level vault items
ALLOWED_NONNUMBERED = {"_system", "Excalidraw", "Clippings"}

# Fallback only: normal operation derives these rules from CLAUDE.md.
FALLBACK_DEPRECATED = [
    "01-Sessions", "04-Agents", "10-Reports", "12-Agents",
    "02-docs", "03-archive", "archive", "05-config", "_legacy-05-config",
]

# Forbidden moves — these paths must stay in place (active code hardcodes them)
PROTECTED_RUNTIME = [
    ".paperclip-backlog-sync.json", ".paperclip-discord-state.json",
    ".paperclip-knowledge-harvest.json", ".paperclip-qa-log.jsonl",
    ".paperclip-qa-state.json", ".paperclip-router-state.json",
    ".paperclip-routing-log.jsonl", ".paperclip-triage-sync.json",
    ".hive-coordinator-state.json", ".backroom-sessions.jsonl",
    ".chroma", "chroma-data", "BluePrinting",
]


def parse_canonical_rules(source=None):
    """Extract path-like deprecated rules from CLAUDE.md's canonical table."""
    source = Path(source) if source else PROJECT / "CLAUDE.md"
    try:
        lines = source.read_text().splitlines()
    except OSError:
        return []

    in_section = False
    deprecated_column = None
    rules = []
    for line in lines:
        if line.startswith("## "):
            in_section = line.strip() == "## Canonical Locations (Single Source of Truth)"
            deprecated_column = None
            continue
        if not in_section or not line.lstrip().startswith("|"):
            continue

        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if deprecated_column is None:
            try:
                deprecated_column = next(
                    i for i, cell in enumerate(cells) if cell.startswith("Deprecated")
                )
            except StopIteration:
                continue
            continue
        if all(re.fullmatch(r":?-+:?", cell) for cell in cells):
            continue
        if deprecated_column >= len(cells):
            continue

        tokens = re.findall(
            r"(?<!\w)(/?(?:[A-Za-z0-9_*.-]+/)+[A-Za-z0-9_*.-]*|[._][A-Za-z0-9_.*-]+)",
            cells[deprecated_column],
        )
        for token in tokens:
            rule = token.strip("`/,")
            if rule.startswith("vault/"):
                rule = rule.removeprefix("vault/")
            if rule and rule not in rules:
                rules.append(rule)
    return rules


def deprecated_rules():
    rules = parse_canonical_rules()
    if rules:
        return rules
    print("WARNING: no deprecated paths parsed from CLAUDE.md; using fallback rules",
          file=sys.stderr)
    return FALLBACK_DEPRECATED


def scan_vault_root_drift():
    drift = []
    if not VAULT.exists():
        return drift
    for entry in sorted(VAULT.iterdir()):
        n = entry.name
        if n.startswith("."):
            continue
        if n in ALLOWED_NONNUMBERED:
            continue
        # Numbered folder — must match canonical
        if entry.is_dir() and len(n) >= 2 and n[:2].isdigit():
            num = n[:2]
            canonical = CANONICAL_NUMBERED.get(num)
            if canonical and n != canonical:
                drift.append({
                    "kind": "vault_prefix_collision",
                    "path": str(entry.relative_to(PROJECT)),
                    "note": f"folder '{n}' collides with canonical '{canonical}' on prefix '{num}-'",
                })
            continue
        # Anything else at vault root is stray
        drift.append({
            "kind": "vault_root_stray",
            "path": str(entry.relative_to(PROJECT)),
            "note": f"non-canonical top-level vault item: {n}",
        })
    return drift


def scan_deprecated_paths(rules=None):
    drift = []
    seen = set()
    for rule in rules or deprecated_rules():
        for base in (VAULT, PROJECT):
            matches = base.glob(rule) if any(c in rule for c in "*?[") else [base / rule]
            for path in matches:
                if not path.exists() or path in seen:
                    continue
                seen.add(path)
                scope = "vault" if base == VAULT else "workspace"
                drift.append({
                    "kind": "deprecated_path_present",
                    "path": str(path.relative_to(PROJECT)),
                    "note": f"deprecated {scope} path still on disk: {rule}",
                })
    return drift


def collect_check_violations():
    collisions = [
        item for item in scan_vault_root_drift()
        if item["kind"] == "vault_prefix_collision"
    ]
    return scan_deprecated_paths() + collisions


def scan_workspace_root_drift():
    """Flag specific drift patterns at workspace root.
    Don't whitelist every possible item — instead, look for known-bad patterns."""
    import re
    drift = []
    blocked_root = {"02-Workstreams", "07-Business"}

    # Allowed root-level markdown files
    allowed_md_root = {"AGENTS.md", "CLAUDE.md", "README.md", "LICENSE.md"}

    for entry in sorted(PROJECT.iterdir()):
        n = entry.name

        if n in blocked_root:
            drift.append({
                "kind": "workspace_root_blocked_drift",
                "path": n,
                "note": "known drift, blocked move (see manifest)",
            })
            continue

        # Pattern 1: orphan markdown reports at root (UPPERCASE_*.md or *_REPORT/SUMMARY/BRIEFING)
        if entry.is_file() and n.endswith(".md") and n not in allowed_md_root:
            if (re.match(r"^[A-Z][A-Z0-9_]+\.md$", n)
                or re.search(r"_(REPORT|SUMMARY|BRIEFING|DIAGNOSTIC|STATUS|FIXES)", n, re.I)):
                drift.append({
                    "kind": "workspace_root_orphan_report",
                    "path": n,
                    "note": "report-style markdown at workspace root — should be in /reports/ or /docs/",
                })
                continue
            # Date-named markdown
            if re.match(r"^\d{4}-\d{2}-\d{2}.*\.md$", n):
                drift.append({
                    "kind": "workspace_root_date_note",
                    "path": n,
                    "note": "date-named markdown at root — should be in vault 01-Journal/ or 04-Sessions/",
                })
                continue

        # Pattern 2: stray loose .json or .jsonl at workspace root that aren't standard package files
        if entry.is_file() and (n.endswith(".json") or n.endswith(".jsonl")):
            allowed_json = {"package.json", "package-lock.json", ".mcp.json",
                            ".mcp.json.bak", "tsconfig.json", "AGENTS.json",
                            "pyrightconfig.json", "claude-mcp-config.json"}
            # Allow protected runtime + standard dotfiles starting with .
            if n in allowed_json or n in PROTECTED_RUNTIME or n.startswith("."):
                pass
            else:
                drift.append({
                    "kind": "workspace_root_loose_json",
                    "path": n,
                    "note": "loose JSON/JSONL at root — should be in /config/, /data/, or /.runtime/",
                })
                continue

        # Pattern 3: backup-style folders at root (canonical home is /backups/)
        if entry.is_dir() and re.search(r"-(backup|backups|bak|old|copy)$", n, re.I):
            drift.append({
                "kind": "workspace_root_backup_folder",
                "path": n,
                "note": "backup-style folder at root — should be under /backups/",
            })
            continue

    return drift


def scan_paperclip_root_state_count():
    """Sanity-check: count root-level .paperclip-*/.hive-*/.backroom-* state FILES (not dirs).
    Drift only if NEW files appear that aren't in the protected list."""
    drift = []
    for f in PROJECT.iterdir():
        n = f.name
        if not f.is_file():
            continue  # .paperclip-skills/ etc. are dirs, not state files
        if not (n.startswith(".paperclip-") or n.startswith(".hive-") or n.startswith(".backroom-")):
            continue
        if n in PROTECTED_RUNTIME:
            continue
        drift.append({
            "kind": "new_root_runtime_state",
            "path": n,
            "note": "new runtime state file at workspace root (should go in .runtime/ or matching subdir)",
        })
    return drift


def collect():
    return (scan_vault_root_drift()
            + scan_deprecated_paths()
            + scan_workspace_root_drift()
            + scan_paperclip_root_state_count())


def write_reports(drift, today):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR_VAULT.mkdir(parents=True, exist_ok=True)

    json_path = LOG_DIR / f"taxonomy-triage-{today}.json"
    json_path.write_text(json.dumps({
        "date": today,
        "count": len(drift),
        "drift": drift,
        "sources": [
            "claude-projects/CLAUDE.md (Canonical Locations)",
            "claude-vault/_system/TAXONOMY.md",
            "reports/claude-projects-cleanup-manifest-2026-04-28.md",
        ],
    }, indent=2))

    md_path = REPORT_DIR_VAULT / f"taxonomy-triage-{today}.md"
    by_kind = {}
    for d in drift:
        by_kind.setdefault(d["kind"], []).append(d)
    body = [
        "---", f"date: {today}", "type: triage", "scope: claude-projects + vault", "---", "",
        f"# Taxonomy Triage — {today}", "",
        f"**Drift items:** {len(drift)}", "",
    ]
    if not drift:
        body.append("Vault and workspace are clean against the current canonical taxonomy.")
    else:
        for kind, items in sorted(by_kind.items()):
            body.append(f"## {kind} ({len(items)})")
            body.append("")
            for it in items:
                body.append(f"- `{it['path']}` — {it['note']}")
            body.append("")
    body.extend([
        "## Sources", "",
        "- `CLAUDE.md` Canonical Locations table",
        "- `claude-vault/_system/TAXONOMY.md`",
        "- `reports/claude-projects-cleanup-manifest-2026-04-28.md`",
        "- Skill: `local/4262526b49/workspace-taxonomy` (attached to all 18 Paperclip agents)",
        "",
    ])
    md_path.write_text("\n".join(body))
    return json_path, md_path


def build_drift_body(drift, today):
    by_kind = {}
    for d in drift:
        by_kind.setdefault(d["kind"], []).append(d)
    lines = [f"Auto-created by taxonomy-triage cron (see `scripts/cron/taxonomy-triage.py`).",
             "",
             f"## Drift snapshot — {today}",
             "",
             f"**Total items:** {len(drift)}",
             ""]
    for kind, items in sorted(by_kind.items()):
        lines.append(f"### {kind} ({len(items)})")
        lines.append("")
        for it in items[:25]:
            lines.append(f"- `{it['path']}` — {it['note']}")
        if len(items) > 25:
            lines.append(f"- ... and {len(items)-25} more")
        lines.append("")
    lines.extend([
        "## Action",
        "",
        "Review against `reports/claude-projects-cleanup-manifest-2026-04-28.md`:",
        "- single stray file → move per `workspace-taxonomy` skill decision tree",
        "- structural change (>10 files) → file a focused Hermes task, do not bulk-fix",
        "- known blocked drift (02-Projects, 09-Websites, 02-Workstreams, 07-Business) → leave alone",
        "",
        "Sources of truth:",
        "- `CLAUDE.md` Canonical Locations table",
        "- `claude-vault/_system/TAXONOMY.md`",
        "- `reports/claude-projects-cleanup-manifest-2026-04-28.md`",
        "- Skill: `local/4262526b49/workspace-taxonomy` (attached to all 18 agents)",
        "",
        "The cron deduplicates open tasks by rolling title prefix.",
    ])
    return "\n".join(lines)


def file_hermes_task(drift, today, dry_run):
    """Create a Hermes Kanban task unless an open rolling task already exists."""
    title = f"{ROLLING_TITLE_PREFIX} {len(drift)} items"
    list_cmd = ["hermes", "kanban", "--board", HERMES_BOARD, "list"]
    try:
        listed = subprocess.run(list_cmd, capture_output=True, text=True)
    except FileNotFoundError:
        print("Hermes CLI not found; skipping taxonomy task", file=sys.stderr)
        return
    if listed.returncode != 0:
        detail = listed.stderr.strip() or f"exit {listed.returncode}"
        print(f"Hermes task lookup failed; skipping taxonomy task: {detail}",
              file=sys.stderr)
        return
    if ROLLING_TITLE_PREFIX in listed.stdout:
        print("Open Hermes taxonomy task already exists; skipping")
        return
    if dry_run:
        print(f"[DRY] would open Hermes task: {title}")
        return

    create_cmd = [
        "hermes", "kanban", "--board", HERMES_BOARD,
        "create", title, "--body", build_drift_body(drift, today),
    ]
    try:
        created = subprocess.run(create_cmd, capture_output=True, text=True)
    except FileNotFoundError:
        print("Hermes CLI not found; skipping taxonomy task", file=sys.stderr)
        return
    if created.returncode != 0:
        detail = created.stderr.strip() or f"exit {created.returncode}"
        print(f"Hermes task creation failed: {detail}", file=sys.stderr)
        return
    print(f"Opened Hermes task: {title}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--check", action="store_true",
                   help="Read-only preflight check for deprecated paths and prefix collisions")
    p.add_argument("--report-only", action="store_true",
                   help="Skip Hermes task creation, just write the report")
    p.add_argument("--threshold", type=int, default=1,
                   help="Min drift items required to create a Hermes task")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if args.check:
        violations = collect_check_violations()
        for item in violations:
            print(f"{item['kind']}: {item['path']} — {item['note']}")
        print(f"Taxonomy check: {len(violations)} violation(s)")
        return 1 if violations else 0

    today = datetime.now().strftime("%Y-%m-%d")
    drift = collect()
    json_path, md_path = write_reports(drift, today)

    print(f"Triage {today}: {len(drift)} drift items")
    print(f"  json: {json_path}")
    print(f"  md:   {md_path}")

    if not args.report_only and len(drift) >= args.threshold:
        file_hermes_task(drift, today, args.dry_run)

    return 0


if __name__ == "__main__":
    sys.exit(main())
