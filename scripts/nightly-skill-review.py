#!/usr/bin/env python3
"""
nightly-skill-review.py — Nightly skill gap analysis and reporting (Hermes Kanban)

Analyzes the edgeless Kanban board for skill gaps from task-failure patterns and
backlog keyword analysis, posts a digest to Discord #audit-log, and creates
skill-establishment tasks on the board.

Migrated 2026-07-30 off the retired Paperclip API (:3100) — it read agent
error-runs + issues from Paperclip and wrote issues back, all of which now fail
silently since Paperclip is decommissioned. The signal source is now Kanban:
task `last_failure_error`/`consecutive_failures` for error patterns, and task
title/body for backlog keywords. New tasks are parked in `triage` by the
canonical Kanban backend.
"""

import json
import sqlite3
import subprocess
import sys
from datetime import datetime
from collections import Counter
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path("/Users/djm/claude-projects")
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.lib.kanban_task_backend import KanbanCreateError, TaskRequest, create_task

# Read side: the edgeless board's SQLite state (fall back to the default DB).
KANBAN_DB_CANDIDATES = [
    Path("/Users/djm/.hermes/kanban/boards/edgeless/kanban.db"),
    Path("/Users/djm/.hermes/kanban.db"),
]
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1365467820239339611/rquXKnfhXV_5q8Q6q_6JdizXXWFKVP2nmf6qGpkNQFfHBphl47ISjcr3ac5VwLF5eM7f"

# Skill patterns to detect from failure messages and backlog
desired_skills = [
    ("mcp-server-scaffold", ["mcp", "scaffold", "server creation", "mcp server"]),
    ("tradingview-pine-automation", ["tradingview", "pine", "trading script", "pine script"]),
    ("browser-automation-patterns", ["browser", "puppeteer", "playwright", "selenium"]),
    ("ollama-local-llm", ["ollama", "local llm", "local model", "ollama serve"]),
]


def _kanban_db() -> Path | None:
    for p in KANBAN_DB_CANDIDATES:
        if p.exists():
            return p
    return None


def read_tasks() -> list[dict]:
    """Read all tasks from the edgeless Kanban board. Returns [] if unavailable."""
    db = _kanban_db()
    if not db:
        print("Kanban DB not found — no tasks to analyze", file=sys.stderr)
        return []
    try:
        conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cols = {r[1] for r in conn.execute("PRAGMA table_info(tasks)")}
        want = [c for c in ("title", "body", "assignee", "priority", "status",
                            "last_failure_error", "consecutive_failures") if c in cols]
        rows = conn.execute(f"SELECT {', '.join(want)} FROM tasks").fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"Kanban read error: {e}", file=sys.stderr)
        return []


def analyze_error_patterns(tasks: list[dict]) -> dict[str, Any]:
    """Scan failed/failing tasks for skill-gap keywords in their error text."""
    error_patterns: Counter = Counter()
    skill_suggestions = []

    for t in tasks:
        failing = (t.get("consecutive_failures") or 0) > 0 or bool(t.get("last_failure_error"))
        if not failing:
            continue
        combined = f"{t.get('last_failure_error', '')} {t.get('title', '')}".lower()
        for skill_name, keywords in desired_skills:
            if any(kw in combined for kw in keywords):
                error_patterns[skill_name] += 1

    for skill_name, count in error_patterns.most_common():
        if count >= 2:  # Threshold for reporting
            skill_suggestions.append({
                "name": skill_name,
                "error_count": count,
                "priority": "high" if count >= 5 else "medium",
            })

    return {"error_patterns": dict(error_patterns), "skill_suggestions": skill_suggestions}


def analyze_backlog(tasks: list[dict]) -> dict[str, Any]:
    """Scan task backlog for skill-related items + count unassigned work."""
    backlog_skills = []
    unassigned_count = 0
    high_priority_unassigned = 0

    for t in tasks:
        combined = f"{t.get('title', '')} {t.get('body', '')}".lower()
        # Kanban: unassigned == no assignee or parked on the orchestrator default.
        assignee = (t.get("assignee") or "").strip().lower()
        is_open = t.get("status") not in ("done", "archived")
        if is_open and assignee in ("", "hive"):
            unassigned_count += 1
            # Kanban priority is an int; 1 == high/urgent.
            try:
                if int(t.get("priority") or 2) <= 1:
                    high_priority_unassigned += 1
            except (TypeError, ValueError):
                pass

        for skill_name, keywords in desired_skills:
            if any(kw in combined for kw in keywords):
                backlog_skills.append({
                    "skill_name": skill_name,
                    "title": t.get("title"),
                    "priority": t.get("priority", 2),
                })

    return {
        "backlog_skills": backlog_skills,
        "unassigned_count": unassigned_count,
        "high_priority_unassigned": high_priority_unassigned,
        "total_issues": len(tasks),
    }


def create_skill_task(skill_name: str, priority: str, context: str, dry_run: bool = False) -> str | None:
    """Create a Kanban task for skill establishment (parked in triage)."""
    title = f"Establish skill: {skill_name}"
    description = f"""## Skill Request

**Skill Name:** `{skill_name}`

**Context:** {context}

**Priority:** {priority}

This skill was identified through automated nightly analysis of:
- Kanban task-failure patterns (`last_failure_error`)
- Backlog keyword analysis
- System capability gaps

## Next Steps
1. Define skill scope and requirements
2. Create SKILL.md with frontmatter
3. Implement core functionality
4. Add to skill registry
5. Test with relevant agents
"""
    try:
        result = create_task(
            TaskRequest(
                title=title,
                body=description,
                assignee="hive",  # orchestrator routes skill-establishment work
                priority=1 if priority in ("high", "urgent", "critical") else 2,
                idempotency_key=f"skill-gap-{skill_name}",  # one open task per skill
                origin_kind="nightly-skill-review",
                source_uri=f"skill:{skill_name}",
                max_retries=1,
            ),
            dry_run=dry_run,
        )
    except KanbanCreateError as exc:
        print(f"Kanban create error for {skill_name}: {exc}", file=sys.stderr)
        return None
    return result.task_id


def post_to_discord(digest: str) -> bool:
    """Post digest to Discord #audit-log via webhook."""
    try:
        payload = {
            "username": "Hive",
            "content": "🌙 **Nightly Skill Review Complete**",
            "embeds": [{
                "title": "Skill Gap Analysis",
                "description": digest[:4000] if len(digest) > 4000 else digest,
                "color": 5763719,  # Green
                "footer": {
                    "text": f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}"
                }
            }]
        }
        subprocess.run([
            'curl', '-s', '-X', 'POST', DISCORD_WEBHOOK_URL,
            '-H', 'Content-Type: application/json',
            '-d', json.dumps(payload)
        ], timeout=30, check=True, capture_output=True)
        return True
    except Exception as e:
        print(f"Discord post error: {e}", file=sys.stderr)
        return False


def main():
    dry_run = "--dry-run" in sys.argv
    print("=" * 60)
    print("NIGHTLY SKILL REVIEW (Hermes Kanban)")
    print(f"Started: {datetime.now().isoformat()}{'  [DRY RUN]' if dry_run else ''}")
    print("=" * 60)
    print()

    tasks = read_tasks()
    print(f"Kanban tasks analyzed: {len(tasks)}")

    # Step 1: Analyze error patterns
    print("Analyzing task-failure patterns...")
    error_analysis = analyze_error_patterns(tasks)
    skill_suggestions = error_analysis.get('skill_suggestions', [])
    print(f"  Found {len(skill_suggestions)} skill gaps from failures")

    # Step 2: Analyze backlog
    print("Analyzing backlog...")
    backlog_analysis = analyze_backlog(tasks)
    backlog_skills = backlog_analysis.get('backlog_skills', [])
    print(f"  Found {len(backlog_skills)} skill mentions in backlog")
    print(f"  Unassigned tasks: {backlog_analysis.get('unassigned_count', 0)}")
    print()

    # Step 3: Consolidate recommendations
    all_recommendations: dict[str, dict] = {}
    for sugg in skill_suggestions:
        all_recommendations[sugg['name']] = {
            'source': 'error_patterns',
            'priority': sugg['priority'],
            'count': sugg['error_count'],
        }
    for item in backlog_skills:
        name = item['skill_name']
        if name in all_recommendations:
            all_recommendations[name]['backlog_refs'] = True
        else:
            all_recommendations[name] = {'source': 'backlog', 'priority': 'medium', 'count': 1}

    # Step 4: Create tasks for high-priority skills
    print("Creating Kanban skill-establishment tasks...")
    created_issues = []
    for skill_name, data in all_recommendations.items():
        if data['priority'] in ['high', 'urgent'] or data.get('count', 0) >= 3:
            context = f"Detected {data['count']} times from {data['source']}"
            if data.get('backlog_refs'):
                context += " + backlog references"
            task_id = create_skill_task(skill_name, data['priority'], context, dry_run=dry_run)
            if task_id:
                created_issues.append((skill_name, task_id))
                print(f"  Created task for {skill_name}: {task_id}")

    if not created_issues and len(all_recommendations) > 0:
        sorted_skills = sorted(all_recommendations.items(),
                               key=lambda x: (x[1].get('count', 0)), reverse=True)[:3]
        for skill_name, data in sorted_skills:
            task_id = create_skill_task(skill_name, 'medium',
                                        f"Detected from {data['source']}", dry_run=dry_run)
            if task_id:
                created_issues.append((skill_name, task_id))
                print(f"  Created task for {skill_name}: {task_id}")
    print()

    # Step 5: Build and post digest
    print("Building digest...")
    digest_lines = [
        "## Skill Gap Summary",
        "",
        f"**Total Tasks Analyzed:** {backlog_analysis.get('total_issues', 0)}",
        f"**Unassigned Tasks:** {backlog_analysis.get('unassigned_count', 0)} "
        f"({backlog_analysis.get('high_priority_unassigned', 0)} high priority)",
        "",
        "### Detected Skill Gaps",
    ]
    if all_recommendations:
        for skill_name, data in all_recommendations.items():
            digest_lines.append(f"• **{skill_name}** ({data['priority']}) — {data['source']}")
    else:
        digest_lines.append("_No significant skill gaps detected tonight._")
    digest_lines.extend(["", "### Tasks Created"])
    if created_issues:
        for skill_name, task_id in created_issues:
            digest_lines.append(f"• {skill_name}: `{task_id}`")
    else:
        digest_lines.append("_No new skill tasks created tonight._")

    digest = "\n".join(digest_lines)
    print()
    print(digest)
    print()

    if dry_run:
        print("Dry run — skipping Discord post")
    elif post_to_discord(digest):
        print("  ✓ Discord notification sent")
    else:
        print("  ✗ Discord notification failed")

    print()
    print("=" * 60)
    print(f"Review complete: {len(created_issues)} skill recommendations")
    print("=" * 60)


if __name__ == "__main__":
    main()
