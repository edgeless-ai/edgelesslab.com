#!/opt/homebrew/opt/python@3.11/bin/python3.11
"""system-manifest.py -- Living infrastructure inventory generator.

Scans crontab, state files, Hermes jobs, MCP servers, and Paperclip API.
Writes a consolidated markdown report to reports/system-manifest.md.
"""

import argparse
import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.error import URLError
from urllib.request import urlopen, Request

PROJECT = Path(os.environ.get("CLAUDE_PROJECTS_ROOT", "/Users/djm/claude-projects"))
STATE_DIR = PROJECT / "logs" / "state"
HERMES_JOBS = Path.home() / ".hermes" / "cron" / "jobs.json"
MCP_CONFIG = PROJECT / ".mcp.json"
OUTPUT_MD = PROJECT / "reports" / "system-manifest.md"
OUTPUT_JSON = PROJECT / "reports" / "system-manifest.json"
PAPERCLIP_API = "http://127.0.0.1:3100/api"
COMPANY_ID = "c5ea22fb-99d2-46a1-87c6-e7fc1ab0d712"

WRAPPER_RE = re.compile(
    r'(?:\$CRON_WRAPPER|scripts/cron-wrapper\.sh)\s+"([^"]+)"'
)


@dataclass
class CronEntry:
    name: str
    schedule: str
    script: str
    wrapped: bool
    has_state: bool = False
    shared_count: int = 1


@dataclass
class StateInfo:
    job: str
    status: str = "unknown"
    exit_code: Optional[int] = None
    started_at: str = ""
    last_heartbeat_at: str = ""
    wall_seconds: Optional[int] = None
    error: Optional[str] = None


@dataclass
class HermesJob:
    name: str
    schedule: str = ""
    enabled: bool = False
    paused: bool = False
    last_status: str = ""
    last_run_at: str = ""


@dataclass
class McpServer:
    name: str
    transport: str = ""
    disabled: bool = False


@dataclass
class CollectorResult:
    data: Any = None
    error: Optional[str] = None


def collect_crontab() -> CollectorResult:
    try:
        r = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=10
        )
        if r.returncode != 0:
            return CollectorResult(error=f"crontab -l failed: {r.stderr.strip()}")

        entries = []
        name_counts = {}
        for line in r.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or re.match(r"^[A-Z_]+=", line):
                continue

            m = WRAPPER_RE.search(line)
            if m:
                name = m.group(1)
                parts = line.split()
                schedule = " ".join(parts[:5])
                script = line[line.index(m.group(0)) + len(m.group(0)):].strip()
                entries.append(CronEntry(name=name, schedule=schedule, script=script, wrapped=True))
                name_counts[name] = name_counts.get(name, 0) + 1
            else:
                parts = line.split()
                if len(parts) < 6:
                    continue
                schedule = " ".join(parts[:5])
                cmd = " ".join(parts[5:])
                comment_m = re.search(r"#\s*(\w+)$", line)
                if comment_m:
                    name = comment_m.group(1)
                else:
                    script_m = re.search(r"([^/\s]+\.(?:py|sh))", cmd)
                    name = script_m.group(1).replace(".py", "").replace(".sh", "").replace("-", "_") if script_m else cmd[:40]
                entries.append(CronEntry(name=name, schedule=schedule, script=cmd, wrapped=False))

        for e in entries:
            if e.name in name_counts and name_counts[e.name] > 1:
                e.shared_count = name_counts[e.name]

        return CollectorResult(data=entries)
    except Exception as ex:
        return CollectorResult(error=str(ex))


def collect_state_files() -> CollectorResult:
    try:
        if not STATE_DIR.exists():
            return CollectorResult(data={})

        states = {}
        for sf in sorted(STATE_DIR.glob("*.json")):
            try:
                with open(sf) as f:
                    d = json.load(f)
                states[sf.stem] = StateInfo(
                    job=d.get("job", sf.stem),
                    status=d.get("status", "unknown"),
                    exit_code=d.get("exit_code"),
                    started_at=d.get("started_at", ""),
                    last_heartbeat_at=d.get("last_heartbeat_at", ""),
                    wall_seconds=d.get("wall_seconds"),
                    error=d.get("error"),
                )
            except (json.JSONDecodeError, OSError):
                continue
        return CollectorResult(data=states)
    except Exception as ex:
        return CollectorResult(error=str(ex))


def collect_hermes_jobs() -> CollectorResult:
    try:
        if not HERMES_JOBS.exists():
            return CollectorResult(error=f"Not found: {HERMES_JOBS}")
        with open(HERMES_JOBS) as f:
            data = json.load(f)

        jobs = []
        for j in data.get("jobs", []):
            paused = j.get("paused_at") is not None
            jobs.append(HermesJob(
                name=j.get("name", "?"),
                schedule=j.get("schedule_display", j.get("schedule", {}).get("display", "")),
                enabled=j.get("enabled", False) and not paused,
                paused=paused,
                last_status=j.get("last_status", ""),
                last_run_at=j.get("last_run_at", ""),
            ))
        return CollectorResult(data=jobs)
    except Exception as ex:
        return CollectorResult(error=str(ex))


def collect_mcp_servers() -> CollectorResult:
    try:
        if not MCP_CONFIG.exists():
            return CollectorResult(error=f"Not found: {MCP_CONFIG}")
        with open(MCP_CONFIG) as f:
            data = json.load(f)

        servers = []
        for name, cfg in data.get("mcpServers", {}).items():
            if "command" in cfg:
                transport = f"command ({cfg['command']})"
            elif "url" in cfg:
                transport = f"sse ({cfg['url'][:40]})"
            else:
                transport = "unknown"
            servers.append(McpServer(
                name=name,
                transport=transport,
                disabled=cfg.get("disabled", False),
            ))
        return CollectorResult(data=servers)
    except Exception as ex:
        return CollectorResult(error=str(ex))


def collect_paperclip(timeout: int = 5) -> CollectorResult:
    try:
        url = f"{PAPERCLIP_API}/companies/{COMPANY_ID}/agents"
        req = Request(url, headers={"Accept": "application/json"})
        with urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read())
        agents = []
        for a in data if isinstance(data, list) else data.get("agents", data.get("data", [])):
            agents.append({
                "name": a.get("name", "?"),
                "id": a.get("id", "?"),
                "status": a.get("status", ""),
            })
        return CollectorResult(data=agents)
    except (URLError, OSError, json.JSONDecodeError) as ex:
        return CollectorResult(error=f"Paperclip API: {ex}")
    except Exception as ex:
        return CollectorResult(error=f"Paperclip API: {ex}")


def cross_reference(cron_entries, state_files):
    wrapped_names = {e.name for e in cron_entries if e.wrapped}
    state_names = set(state_files.keys()) if state_files else set()

    for e in cron_entries:
        e.has_state = e.name in state_names

    unwrapped = [e for e in cron_entries if not e.wrapped]
    dark = [e for e in cron_entries if e.wrapped and not e.has_state]
    orphan_states = state_names - wrapped_names - {e.name for e in cron_entries}

    shared = {}
    for e in cron_entries:
        if e.shared_count > 1 and e.name not in shared:
            shared[e.name] = e.shared_count

    return {
        "unwrapped": unwrapped,
        "dark_wrapped": dark,
        "orphan_states": sorted(orphan_states),
        "shared_state_files": shared,
    }


def fmt_age(iso_str):
    if not iso_str:
        return "--"
    try:
        ts = iso_str.rstrip("Z")
        if "+" in ts or (ts.count("-") > 2):
            dt = datetime.fromisoformat(ts)
        else:
            dt = datetime.fromisoformat(ts).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = now - dt
        hours = delta.total_seconds() / 3600
        if hours < 1:
            return f"{int(delta.total_seconds() / 60)}m ago"
        if hours < 48:
            return f"{hours:.0f}h ago"
        return f"{delta.days}d ago"
    except (ValueError, TypeError):
        return iso_str[:16] if iso_str else "--"


def render_markdown(cron_result, state_result, hermes_result, mcp_result,
                    paperclip_result, xref, drift_lines):
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    lines = [f"# System Manifest", f"Generated: {now}\n"]

    warnings = []
    for name, res in [("Crontab", cron_result), ("State files", state_result),
                       ("Hermes jobs", hermes_result), ("MCP servers", mcp_result),
                       ("Paperclip API", paperclip_result)]:
        if res.error:
            warnings.append(f"- **[COLLECTOR FAILED: {name}]** {res.error}")

    cron_entries = cron_result.data or []
    state_files = state_result.data or {}
    hermes_jobs = hermes_result.data or []
    mcp_servers = mcp_result.data or []
    paperclip_agents = paperclip_result.data or []

    wrapped = [e for e in cron_entries if e.wrapped]
    unwrapped = xref.get("unwrapped", [])
    dark = xref.get("dark_wrapped", [])
    hermes_enabled = [j for j in hermes_jobs if j.enabled]
    hermes_paused = [j for j in hermes_jobs if j.paused]
    hermes_disabled = [j for j in hermes_jobs if not j.enabled and not j.paused]
    mcp_active = [s for s in mcp_servers if not s.disabled]
    mcp_disabled = [s for s in mcp_servers if s.disabled]

    failed_states = {k: v for k, v in state_files.items() if v.status in ("failed", "killed")}

    lines.append("## Summary\n")
    lines.append("| Layer | Total | Active | Issues |")
    lines.append("|-------|-------|--------|--------|")
    cron_issues = []
    if dark:
        cron_issues.append(f"{len(dark)} dark")
    if failed_states:
        cron_issues.append(f"{len(failed_states)} failed")
    if unwrapped:
        cron_issues.append(f"{len(unwrapped)} unwrapped")
    lines.append(f"| Crontab | {len(cron_entries)} | {len(wrapped)} wrapped | {', '.join(cron_issues) or '—'} |")

    hermes_issues = sum(1 for j in hermes_enabled if j.last_status in ("error", "failed"))
    lines.append(f"| Hermes jobs | {len(hermes_jobs)} | {len(hermes_enabled)} enabled, {len(hermes_paused)} paused | {hermes_issues} error |")
    lines.append(f"| MCP servers | {len(mcp_servers)} | {len(mcp_active)} active | {len(mcp_disabled)} disabled |")

    if paperclip_result.error:
        lines.append(f"| Paperclip | — | — | API unreachable |")
    else:
        lines.append(f"| Paperclip agents | {len(paperclip_agents)} | — | — |")

    if warnings:
        lines.append("\n## Collector Warnings\n")
        lines.extend(warnings)

    if failed_states:
        lines.append(f"\n## Failed Jobs ({len(failed_states)})\n")
        lines.append("| Job | Status | Exit | Last Run | Error |")
        lines.append("|-----|--------|------|----------|-------|")
        for name, st in sorted(failed_states.items()):
            err = (st.error or "")[:60].replace("|", "/")
            lines.append(f"| {name} | {st.status} | {st.exit_code} | {fmt_age(st.started_at)} | {err} |")

    lines.append(f"\n## Crontab — Wrapped ({len(wrapped)})\n")
    lines.append("| Job | Schedule | Status | Last Run | Wall(s) |")
    lines.append("|-----|----------|--------|----------|---------|")
    for e in sorted(wrapped, key=lambda x: x.name):
        st = state_files.get(e.name)
        if st:
            shared_note = f" `[x{e.shared_count}]`" if e.shared_count > 1 else ""
            lines.append(f"| {e.name}{shared_note} | `{e.schedule}` | {st.status} | {fmt_age(st.started_at)} | {st.wall_seconds or '—'} |")
        else:
            lines.append(f"| {e.name} | `{e.schedule}` | [DARK] | — | — |")

    shared = xref.get("shared_state_files", {})
    if shared:
        notes = ", ".join(f"{k} ({v} entries)" for k, v in shared.items())
        lines.append(f"\n*Shared state files: {notes} — status reflects most recent run only.*")

    if unwrapped:
        lines.append(f"\n## Crontab — Unwrapped ({len(unwrapped)})\n")
        lines.append("| Job | Schedule | Script |")
        lines.append("|-----|----------|--------|")
        for e in unwrapped:
            script_short = e.script.split("/")[-1][:50] if "/" in e.script else e.script[:50]
            lines.append(f"| {e.name} | `{e.schedule}` | {script_short} |")

    orphans = xref.get("orphan_states", [])
    if orphans:
        lines.append(f"\n## Orphan State Files ({len(orphans)})\n")
        lines.append("*State file exists but no matching crontab entry:*\n")
        for name in orphans:
            st = state_files.get(name)
            status = st.status if st else "?"
            lines.append(f"- `{name}` — status: {status}, last run: {fmt_age(st.started_at) if st else '?'}")

    if hermes_jobs:
        lines.append(f"\n## Hermes Jobs — Enabled ({len(hermes_enabled)})\n")
        if hermes_enabled:
            lines.append("| Job | Schedule | Last Status | Last Run |")
            lines.append("|-----|----------|-------------|----------|")
            for j in sorted(hermes_enabled, key=lambda x: x.name):
                lines.append(f"| {j.name} | `{j.schedule}` | {j.last_status or '—'} | {fmt_age(j.last_run_at)} |")

        if hermes_paused:
            lines.append(f"\n### Paused ({len(hermes_paused)})\n")
            for j in sorted(hermes_paused, key=lambda x: x.name):
                lines.append(f"- {j.name} (`{j.schedule}`)")

        if hermes_disabled:
            lines.append(f"\n### Disabled ({len(hermes_disabled)})\n")
            lines.append(f"*{len(hermes_disabled)} disabled jobs (not shown)*")

    lines.append(f"\n## MCP Servers ({len(mcp_servers)})\n")
    lines.append("| Server | Transport | Status |")
    lines.append("|--------|-----------|--------|")
    for s in sorted(mcp_servers, key=lambda x: x.name):
        status = "disabled" if s.disabled else "active"
        lines.append(f"| {s.name} | {s.transport} | {status} |")

    if paperclip_result.data:
        lines.append(f"\n## Paperclip Agents ({len(paperclip_agents)})\n")
        lines.append("| Agent | ID |")
        lines.append("|-------|----|")
        for a in paperclip_agents:
            lines.append(f"| {a['name']} | `{a['id'][:12]}...` |")

    if drift_lines:
        lines.append(f"\n## Drift Since Last Run\n")
        lines.extend(drift_lines)
    elif OUTPUT_JSON.exists():
        lines.append(f"\n## Drift Since Last Run\n")
        lines.append("*No changes detected.*")
    else:
        lines.append(f"\n## Drift Since Last Run\n")
        lines.append("*First run — drift tracking starts next run.*")

    return "\n".join(lines) + "\n"


def build_json_sidecar(cron_result, state_result, hermes_result, mcp_result, paperclip_result):
    cron_entries = cron_result.data or []
    state_files = state_result.data or {}
    hermes_jobs = hermes_result.data or []
    mcp_servers = mcp_result.data or []
    paperclip_agents = paperclip_result.data or []

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cron_jobs": sorted({e.name for e in cron_entries}),
        "cron_wrapped": sorted({e.name for e in cron_entries if e.wrapped}),
        "cron_unwrapped": sorted({e.name for e in cron_entries if not e.wrapped}),
        "state_statuses": {k: v.status for k, v in state_files.items()},
        "hermes_enabled": sorted([j.name for j in hermes_jobs if j.enabled]),
        "hermes_paused": sorted([j.name for j in hermes_jobs if j.paused]),
        "mcp_servers": sorted([s.name for s in mcp_servers]),
        "mcp_disabled": sorted([s.name for s in mcp_servers if s.disabled]),
        "paperclip_agents": sorted([a["name"] for a in paperclip_agents]) if paperclip_agents else [],
    }


def compute_drift(current, previous):
    drift = []

    def diff_sets(label, cur_key, prev_key=None):
        prev_key = prev_key or cur_key
        cur = set(current.get(cur_key, []))
        prev = set(previous.get(prev_key, []))
        for item in sorted(cur - prev):
            drift.append(f"- **ADDED** ({label}): `{item}`")
        for item in sorted(prev - cur):
            drift.append(f"- **REMOVED** ({label}): `{item}`")

    diff_sets("cron", "cron_jobs")
    diff_sets("hermes enabled", "hermes_enabled")
    diff_sets("hermes paused", "hermes_paused")
    diff_sets("mcp", "mcp_servers")
    diff_sets("paperclip", "paperclip_agents")

    cur_statuses = current.get("state_statuses", {})
    prev_statuses = previous.get("state_statuses", {})
    for job in sorted(set(cur_statuses) & set(prev_statuses)):
        if cur_statuses[job] != prev_statuses[job]:
            drift.append(f"- **STATUS**: `{job}`: {prev_statuses[job]} -> {cur_statuses[job]}")

    return drift


def send_telegram(message):
    try:
        script = Path.home() / ".claude" / "skills" / "telegram-message" / "scripts" / "send_telegram.py"
        if not script.exists():
            return
        subprocess.run(
            ["/opt/homebrew/opt/python@3.11/bin/python3.11", str(script), message],
            timeout=15, capture_output=True,
        )
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(description="Living infrastructure inventory")
    parser.add_argument("--diff", action="store_true", help="Include drift since last run")
    parser.add_argument("--json", action="store_true", help="Output JSON to stdout")
    parser.add_argument("--stdout", action="store_true", help="Print markdown to stdout")
    parser.add_argument("--notify", action="store_true", help="Send Telegram summary")
    args = parser.parse_args()

    cron_result = collect_crontab()
    state_result = collect_state_files()
    hermes_result = collect_hermes_jobs()
    mcp_result = collect_mcp_servers()
    paperclip_result = collect_paperclip()

    xref = cross_reference(
        cron_result.data or [],
        state_result.data or {},
    )

    current_json = build_json_sidecar(cron_result, state_result, hermes_result, mcp_result, paperclip_result)

    drift_lines = []
    if args.diff and OUTPUT_JSON.exists():
        try:
            with open(OUTPUT_JSON) as f:
                previous_json = json.load(f)
            drift_lines = compute_drift(current_json, previous_json)
        except (json.JSONDecodeError, OSError):
            drift_lines = ["*Previous manifest unreadable — drift tracking reset.*"]

    if args.json:
        print(json.dumps(current_json, indent=2))
        return

    md = render_markdown(cron_result, state_result, hermes_result, mcp_result,
                         paperclip_result, xref, drift_lines)

    if args.stdout:
        print(md)
        return

    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_MD.write_text(md)
    OUTPUT_JSON.write_text(json.dumps(current_json, indent=2) + "\n")

    print(f"Manifest written to {OUTPUT_MD} ({len(md)} bytes)")

    if args.notify:
        cron_entries = cron_result.data or []
        state_files = state_result.data or {}
        hermes_jobs = hermes_result.data or []
        failed = sum(1 for v in state_files.values() if v.status in ("failed", "killed"))
        hermes_ok = sum(1 for j in hermes_jobs if j.enabled)

        if failed > 0 or xref.get("dark_wrapped"):
            dark_count = len(xref.get("dark_wrapped", []))
            msg = f"System manifest: {len(cron_entries)} cron ({failed} failed, {dark_count} dark) / {hermes_ok} hermes / {len(mcp_result.data or [])} MCP"
            send_telegram(msg)
            print(f"Telegram sent: {msg}")
        else:
            print("All healthy — Telegram skipped")


if __name__ == "__main__":
    main()
