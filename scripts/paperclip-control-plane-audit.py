#!/usr/bin/env python3
"""Paperclip Control-Plane Audit Loop — Daily and Weekly Inspection

Implements the recurring Paperclip inspection routine:
- Daily: dashboard sweep, open-issue review, agent workload check
- Weekly: org drift audit, project lead audit, routing check

Output: Markdown reports to vault/docs, actionable issues created for drift.

Cron usage:
  Daily (8am):  python3 paperclip-control-plane-audit.py --daily
  Weekly (Sun): python3 paperclip-control-plane-audit.py --weekly
"""

import argparse
import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "lib"))
from paperclip_constants import AGENT_IDS, AGENT_NAMES, COMPANY_ID, PAPERCLIP_URL, PROJECT_ROOT
from capability_gate import classify_issue, mismatch_reason

# Output paths
VAULT_AUDIT_DIR = Path(PROJECT_ROOT) / "claude-vault" / "13-Reports" / "Paperclip-Audits"
DOCS_AUDIT_DIR = Path(PROJECT_ROOT) / "docs" / "audit-reports"
STATE_FILE = Path(PROJECT_ROOT) / ".paperclip-audit-state.json"
DRIFT_STATE_FILE = Path(PROJECT_ROOT) / ".paperclip-drift-state.json"


def api_get(path: str, timeout: int = 15):
    """Make GET request to Paperclip API. Unwraps paginated envelopes."""
    try:
        with urllib.request.urlopen(f"{PAPERCLIP_URL}/api/{path}", timeout=timeout) as resp:
            result = json.load(resp)
        if isinstance(result, dict) and "data" in result and isinstance(result["data"], list):
            return result["data"]
        return result
    except Exception as e:
        return {"error": str(e)}


def api_post(path: str, data: dict, timeout: int = 15):
    """Make POST request to Paperclip API."""
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{PAPERCLIP_URL}/api/{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except Exception as e:
        return {"error": str(e)}


def api_patch(path: str, data: dict, timeout: int = 10):
    """Make PATCH request to Paperclip API."""
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{PAPERCLIP_URL}/api/{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except Exception as e:
        return {"error": str(e)}


def load_state() -> dict:
    """Load persistent audit state."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {
        "last_daily": None,
        "last_weekly": None,
        "daily_count": 0,
        "weekly_count": 0,
        "issues_created": [],
    }


def save_state(state: dict):
    """Save persistent audit state."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def load_drift_state() -> dict:
    """Load org drift baseline for comparison."""
    if DRIFT_STATE_FILE.exists():
        try:
            return json.loads(DRIFT_STATE_FILE.read_text())
        except Exception:
            pass
    return {}


def save_drift_state(state: dict):
    """Save org drift baseline."""
    DRIFT_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    DRIFT_STATE_FILE.write_text(json.dumps(state, indent=2))


def days_since(iso_date: str | None) -> int | None:
    """Calculate days since an ISO date string."""
    if not iso_date:
        return None
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except Exception:
        return None


def format_duration(days: int | None) -> str:
    """Format days as human-readable duration."""
    if days is None:
        return "unknown"
    if days == 0:
        return "today"
    if days == 1:
        return "1 day"
    return f"{days} days"


# =============================================================================
# DAILY AUDIT
# =============================================================================


def daily_dashboard_check() -> dict:
    """Get core Paperclip org metrics."""
    agents = api_get(f"companies/{COMPANY_ID}/agents") or []
    issues = api_get(f"companies/{COMPANY_ID}/issues") or []
    projects = api_get(f"companies/{COMPANY_ID}/projects") or []

    # Categorize issues
    open_issues = [i for i in issues if i.get("status") not in ("done", "cancelled")]
    done_issues = [i for i in issues if i.get("status") == "done"]
    unassigned = [i for i in open_issues if not i.get("assigneeAgentId")]

    # Stale detection (>7 days no update, or >3 days in todo)
    stale_issues = []
    for i in open_issues:
        updated = days_since(i.get("updatedAt"))
        created = days_since(i.get("createdAt"))
        status = i.get("status")
        if updated is not None and updated > 7:
            stale_issues.append({**i, "stale_reason": f"no update {updated} days"})
        elif status == "todo" and created and created > 3:
            stale_issues.append({**i, "stale_reason": f"todo for {created} days"})

    # Agent workload
    workload = defaultdict(int)
    for i in open_issues:
        assignee = i.get("assigneeAgentId")
        if assignee:
            agent_name = AGENT_NAMES.get(assignee, assignee[:8])
            workload[agent_name] += 1

    return {
        "agent_count": len(agents),
        "project_count": len(projects),
        "total_issues": len(issues),
        "open_issues": len(open_issues),
        "done_issues": len(done_issues),
        "unassigned_issues": len(unassigned),
        "stale_issues": len(stale_issues),
        "stale_details": stale_issues[:10],  # Top 10
        "workload": dict(workload),
        "agents": [{"id": a.get("id", "")[:8], "name": a.get("name", "unknown")} for a in agents],
    }


def daily_open_issue_review() -> list:
    """Review open issues for actionable items."""
    issues = api_get(f"companies/{COMPANY_ID}/issues?status=todo") or []
    issues += api_get(f"companies/{COMPANY_ID}/issues?status=in_progress") or []

    findings = []

    for i in issues:
        ident = i.get("identifier", "?")
        title = i.get("title", "Untitled")
        status = i.get("status")
        assignee = i.get("assigneeAgentId")
        priority = i.get("priority", "unknown")

        # High priority unassigned
        if not assignee and priority in ("high", "urgent"):
            findings.append({
                "type": "high_priority_unassigned",
                "issue": ident,
                "title": title,
                "priority": priority,
                "action": "Route to available agent",
            })

        # Long-running in_progress
        started = days_since(i.get("startedAt"))
        if status == "in_progress" and started and started > 5:
            findings.append({
                "type": "long_running",
                "issue": ident,
                "title": title,
                "days": started,
                "action": "Check for blockage or scope creep",
            })

        # Blocked status
        if status == "blocked":
            findings.append({
                "type": "blocked",
                "issue": ident,
                "title": title,
                "action": "Escalate to root agent for unblock",
            })

        # Capability mismatch (agent-role mismatch)
        if assignee:
            cls = classify_issue(title, i.get("description") or "")
            reason = mismatch_reason(assignee, cls)
            if reason and cls.confidence >= 0.6:
                findings.append({
                    "type": "capability_mismatch",
                    "issue": ident,
                    "title": title,
                    "assignee": AGENT_NAMES.get(assignee, assignee[:8]),
                    "task_type": cls.task_type,
                    "confidence": round(cls.confidence, 2),
                    "action": "Run scripts/paperclip_capability_gate.py --fix to auto-reassign (guardrail)",
                    "reason": reason,
                })

    return findings


def run_daily_audit() -> str:
    """Execute daily audit and return markdown report."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Gather data
    dashboard = daily_dashboard_check()
    findings = daily_open_issue_review()

    # Build report
    lines = [
        f"# Paperclip Daily Audit — {date_str}",
        "",
        f"**Generated**: {timestamp}",
        "**Type**: Daily Control-Plane Sweep",
        "",
        "## Dashboard Summary",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Active Agents | {dashboard['agent_count']} |",
        f"| Projects | {dashboard['project_count']} |",
        f"| Total Issues | {dashboard['total_issues']} |",
        f"| Open Issues | {dashboard['open_issues']} |",
        f"| Completed | {dashboard['done_issues']} |",
        f"| Unassigned | {dashboard['unassigned_issues']} |",
        f"| Stale (>7d) | {dashboard['stale_issues']} |",
        "",
        "## Agent Workload",
        "",
    ]

    # Workload table
    workload = dashboard.get("workload", {})
    if workload:
        lines.append("| Agent | Open Issues |")
        lines.append("|-------|-------------|")
        for agent, count in sorted(workload.items(), key=lambda x: -x[1]):
            lines.append(f"| {agent} | {count} |")
    else:
        lines.append("_No assigned issues found._")

    lines.extend(["", "## Open Issue Review", ""])

    if findings:
        for f in findings:
            lines.append(f"### {f['issue']}: {f['title'][:60]}")
            lines.append(f"- **Type**: {f['type']}")
            if "days" in f:
                lines.append(f"- **Duration**: {f['days']} days")
            lines.append(f"- **Action**: {f['action']}")
            lines.append("")
    else:
        lines.append("_No actionable findings today._")

    # Stale issues section
    if dashboard.get("stale_details"):
        lines.extend(["", "## Stale Issues (Top 10)", ""])
        lines.append("| Issue | Status | Stale Reason |")
        lines.append("|-------|--------|--------------|")
        for s in dashboard["stale_details"]:
            lines.append(f"| {s.get('identifier', '?')} | {s.get('status', '?')} | {s.get('stale_reason', '?')} |")

    lines.extend(["", "## Agents", ""])
    for a in dashboard.get("agents", []):
        lines.append(f"- `{a['id']}` — {a['name']}")

    lines.extend(["", "---", "", "*End of daily audit*"])

    return "\n".join(lines)


# =============================================================================
# WEEKLY AUDIT
# =============================================================================


def weekly_org_drift_audit() -> dict:
    """Compare current org state against baseline to detect drift."""
    current_baseline = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agents": {},
        "projects": {},
        "issue_counts": {},
    }

    # Capture agent states
    agents = api_get(f"companies/{COMPANY_ID}/agents") or []
    for a in agents:
        aid = a.get("id", "")
        current_baseline["agents"][aid] = {
            "name": a.get("name", "unknown"),
            "adapter": a.get("adapter", "unknown"),
            "model": a.get("model", "unknown"),
        }

    # Capture project states
    projects = api_get(f"companies/{COMPANY_ID}/projects") or []
    for p in projects:
        pid = p.get("id", "")
        lead = p.get("leadAgentId")
        current_baseline["projects"][pid] = {
            "name": p.get("name", "unknown"),
            "status": p.get("status", "unknown"),
            "lead": lead[:8] if lead else "none",
        }

    # Capture issue counts by project
    issues = api_get(f"companies/{COMPANY_ID}/issues") or []
    project_issues = defaultdict(lambda: {"open": 0, "done": 0})
    for i in issues:
        pid = i.get("projectId", "unknown")
        status = i.get("status")
        if status in ("done", "cancelled"):
            project_issues[pid]["done"] += 1
        else:
            project_issues[pid]["open"] += 1

    current_baseline["issue_counts"] = dict(project_issues)

    # Compare with previous baseline
    previous = load_drift_state()
    drift = []

    if previous:
        # Check for new/missing agents
        prev_agents = set(previous.get("agents", {}).keys())
        curr_agents = set(current_baseline["agents"].keys())
        new_agents = curr_agents - prev_agents
        missing_agents = prev_agents - curr_agents

        for aid in new_agents:
            a = current_baseline["agents"][aid]
            drift.append({
                "type": "new_agent",
                "entity": aid[:8],
                "details": f"New agent: {a['name']} ({a['adapter']})",
            })

        for aid in missing_agents:
            a = previous["agents"].get(aid, {})
            drift.append({
                "type": "missing_agent",
                "entity": aid[:8],
                "details": f"Agent removed: {a.get('name', 'unknown')}",
            })

        # Check project changes
        prev_projects = previous.get("projects", {})
        for pid, p in current_baseline["projects"].items():
            if pid in prev_projects:
                prev = prev_projects[pid]
                if p["status"] != prev.get("status"):
                    drift.append({
                        "type": "project_status_change",
                        "entity": pid[:8],
                        "details": f"{p['name']}: {prev.get('status', '?')} → {p['status']}",
                    })
                if p["lead"] != prev.get("lead", "none"):
                    drift.append({
                        "type": "project_lead_change",
                        "entity": pid[:8],
                        "details": f"{p['name']}: lead changed to {p['lead']}",
                    })

    # Save new baseline
    save_drift_state(current_baseline)

    return {
        "baseline": current_baseline,
        "drift": drift,
        "has_previous": bool(previous),
    }


def weekly_project_lead_audit() -> list:
    """Audit project leads for gaps and workload."""
    projects = api_get(f"companies/{COMPANY_ID}/projects") or []
    issues = api_get(f"companies/{COMPANY_ID}/issues") or []

    findings = []

    # Build lead workload map
    lead_projects = defaultdict(list)
    lead_issues = defaultdict(int)

    for p in projects:
        lead = p.get("leadAgentId")
        if lead:
            lead_projects[lead].append(p)

    for i in issues:
        if i.get("status") not in ("done", "cancelled"):
            lead = i.get("assigneeAgentId")
            if lead:
                lead_issues[lead] += 1

    for p in projects:
        pid = p.get("id", "")[:8]
        name = p.get("name", "Untitled")
        status = p.get("status", "unknown")
        lead = p.get("leadAgentId")

        # Missing lead
        if not lead:
            findings.append({
                "type": "missing_lead",
                "project": name,
                "project_id": pid,
                "action": "Assign lead agent to project",
            })

        # Paused projects
        if status == "paused":
            findings.append({
                "type": "paused_project",
                "project": name,
                "project_id": pid,
                "action": "Review pause reason and reactivate or archive",
            })

    # High workload leads
    for lead, count in lead_issues.items():
        if count > 10:
            name = AGENT_NAMES.get(lead, lead[:8])
            findings.append({
                "type": "high_workload_lead",
                "lead": name,
                "issues": count,
                "action": f"Distribute workload — {count} open issues",
            })

    return findings


def weekly_backlog_routing_check() -> list:
    """Check for gaps between backlog tasks and Paperclip issues."""
    backlog_dir = Path(PROJECT_ROOT) / "backlog" / "tasks"
    findings = []

    if not backlog_dir.exists():
        return findings

    # Count backlog tasks by status
    task_files = list(backlog_dir.glob("task-*.md"))
    tasks_without_pc = []

    for tf in task_files[:50]:  # Sample first 50 for performance
        content = tf.read_text()
        if "paperclip:" not in content and "EDGA-" not in content:
            # Extract title
            title = "Untitled"
            for line in content.split("\n"):
                if line.startswith("title:"):
                    title = line.split(":", 1)[1].strip()
                    break
            tasks_without_pc.append({"file": tf.name, "title": title})

    if len(tasks_without_pc) > 5:
        findings.append({
            "type": "routing_gap",
            "count": len(tasks_without_pc),
            "details": f"{len(tasks_without_pc)} backlog tasks lack Paperclip linkage",
            "action": "Run backlog-to-paperclip routing",
            "examples": tasks_without_pc[:5],
        })

    return findings


def create_drift_issue(drift_item: dict) -> str | None:
    """Create a Paperclip issue for drift detection."""
    title = f"[Drift] {drift_item['type']}: {drift_item.get('entity', drift_item.get('project', 'unknown'))}"[:200]

    description = f"""## Control-Plane Drift Detected

**Type**: {drift_item['type']}
**Detected**: {datetime.now(timezone.utc).isoformat()}
**Entity**: {drift_item.get('entity', drift_item.get('project', 'unknown'))}

### Details
{drift_item.get('details', 'N/A')}

### Recommended Action
{drift_item.get('action', 'Review and reconcile.')}

---
*Auto-generated by weekly org drift audit*
"""

    issue = api_post(f"companies/{COMPANY_ID}/issues", {
        "title": title,
        "description": description,
        "priority": "medium",
        "status": "backlog",
    })

    if issue and "id" in issue:
        return issue.get("identifier")
    return None


def run_weekly_audit() -> tuple[str, list]:
    """Execute weekly audit and return markdown report + actions."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Gather data
    drift = weekly_org_drift_audit()
    lead_findings = weekly_project_lead_audit()
    routing_findings = weekly_backlog_routing_check()

    # Create issues for drift items (limited to avoid spam)
    created_issues = []
    for d in drift.get("drift", [])[:3]:  # Max 3 issues per run
        issue_id = create_drift_issue(d)
        if issue_id:
            created_issues.append(issue_id)

    # Build report
    lines = [
        f"# Paperclip Weekly Audit — {date_str}",
        "",
        f"**Generated**: {timestamp}",
        "**Type**: Weekly Control-Plane Audit",
        f"**Drift Issues Created**: {len(created_issues)}",
        "",
        "## Org Drift Analysis",
        "",
    ]

    if not drift.get("has_previous"):
        lines.append("_No previous baseline — establishing initial state._")
    elif not drift.get("drift"):
        lines.append("_No drift detected — org state stable._")
    else:
        lines.append(f"**{len(drift['drift'])} drift items detected:**")
        lines.append("")
        for d in drift["drift"]:
            lines.append(f"- **{d['type']}**: {d.get('details', 'N/A')}")
            if d.get("entity"):
                lines.append(f"  - Entity: `{d['entity']}`")
            lines.append("")

    lines.extend(["", "## Project Lead Audit", ""])

    if lead_findings:
        for f in lead_findings:
            lines.append(f"### {f['type']}: {f.get('project', f.get('lead', 'unknown'))}")
            if "project_id" in f:
                lines.append(f"- **Project ID**: `{f['project_id']}`")
            if "issues" in f:
                lines.append(f"- **Issue Count**: {f['issues']}")
            lines.append(f"- **Action**: {f['action']}")
            lines.append("")
    else:
        lines.append("_No lead issues found._")

    lines.extend(["", "## Backlog Routing Check", ""])

    if routing_findings:
        for f in routing_findings:
            lines.append(f"### {f['type']}: {f['count']} items")
            lines.append(f"- **Action**: {f['action']}")
            if f.get("examples"):
                lines.append("- **Examples**:")
                for ex in f["examples"]:
                    lines.append(f"  - `{ex['file']}`: {ex['title'][:50]}")
            lines.append("")
    else:
        lines.append("_Backlog routing appears healthy._")

    # Summary stats
    baseline = drift.get("baseline", {})
    lines.extend(["", "## Current Org State", ""])
    lines.append(f"- **Agents**: {len(baseline.get('agents', {}))}")
    lines.append(f"- **Projects**: {len(baseline.get('projects', {}))}")

    total_open = sum(p.get("open", 0) for p in baseline.get("issue_counts", {}).values())
    total_done = sum(p.get("done", 0) for p in baseline.get("issue_counts", {}).values())
    lines.append(f"- **Issues**: {total_open} open, {total_done} completed")

    if created_issues:
        lines.extend(["", "## Created Drift Issues", ""])
        for cid in created_issues:
            lines.append(f"- {cid}")

    lines.extend(["", "---", "", "*End of weekly audit*"])

    return "\n".join(lines), created_issues


# =============================================================================
# OUTPUT & MAIN
# =============================================================================


def save_report(report: str, report_type: str):
    """Save report to vault and docs directories."""
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Ensure directories exist
    VAULT_AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_AUDIT_DIR.mkdir(parents=True, exist_ok=True)

    # Save to vault (main source of truth)
    vault_path = VAULT_AUDIT_DIR / f"{report_type}-audit-{date_str}.md"
    vault_path.write_text(report)

    # Save to docs (for easy access)
    docs_path = DOCS_AUDIT_DIR / f"{report_type}-audit-{date_str}.md"
    docs_path.write_text(report)

    return vault_path, docs_path


def main():
    parser = argparse.ArgumentParser(description="Paperclip Control-Plane Audit")
    parser.add_argument("--daily", action="store_true", help="Run daily audit")
    parser.add_argument("--weekly", action="store_true", help="Run weekly audit")
    args = parser.parse_args()

    state = load_state()

    if args.daily or (not args.daily and not args.weekly):
        print("Running daily audit...")
        report = run_daily_audit()
        vault_path, docs_path = save_report(report, "daily")

        state["last_daily"] = datetime.now(timezone.utc).isoformat()
        state["daily_count"] = state.get("daily_count", 0) + 1
        save_state(state)

        print(f"Daily audit complete:")
        print(f"  Vault: {vault_path}")
        print(f"  Docs:  {docs_path}")

    if args.weekly:
        print("Running weekly audit...")
        report, created = run_weekly_audit()
        vault_path, docs_path = save_report(report, "weekly")

        state["last_weekly"] = datetime.now(timezone.utc).isoformat()
        state["weekly_count"] = state.get("weekly_count", 0) + 1
        state["issues_created"] = state.get("issues_created", []) + created
        save_state(state)

        print(f"Weekly audit complete:")
        print(f"  Vault: {vault_path}")
        print(f"  Docs:  {docs_path}")
        print(f"  Drift issues created: {len(created)}")
        for cid in created:
            print(f"    - {cid}")


if __name__ == "__main__":
    main()
