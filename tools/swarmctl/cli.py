"""
swarmctl.cli — Phase 1 read-only observability CLI.

Subcommands
-----------
status   Print a gateway table, provider canary panel, and system resource line.
doctor   Run read-only checks and print human-readable fix suggestions.
digest   Print a compact text suitable for posting to Discord / Telegram.

Run as:
    /Users/djm/.hermes/hermes-agent/venv/bin/python -m swarmctl <cmd> [opts]

All subcommands are READ-ONLY. No writes to ~/.hermes, no restarts, no mutations.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from typing import Optional

from rich.console import Console
from rich.table import Table
from rich import box
from rich.text import Text

from .checks import gateways as _gw_check
from .checks import configs as _cfg_check
from .checks import providers as _prov_check
from .checks import system as _sys_check
from .telemetry import emit_report
from .types import (
    AuthState,
    GatewayHealth,
    GatewayState,
    LaunchdDomain,
    ProviderState,
    ProviderStatus,
    Report,
    SystemStatus,
)

console = Console()

# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------

# Required packages for venv check (Phase 1: bare minimum for runtime)
_REQUIRED_PACKAGES = [
    "yaml",        # PyYAML
    "requests",
    "psutil",
    "rich",
]


def _check_venv() -> tuple[bool, list[str]]:
    issues: list[str] = []
    for pkg in _REQUIRED_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            issues.append(f"missing: {pkg}")
    return (len(issues) == 0, issues)


def build_report() -> Report:
    gw_list = _gw_check.check()
    prov_list = _prov_check.check()
    sys_status = _sys_check.check()
    venv_ok, venv_issues = _check_venv()

    warnings: list[str] = []
    stale = [g for g in gw_list if g.stale]
    if stale:
        warnings.append(f"{len(stale)} gateway(s) STALE — code updated after process start: " +
                        ", ".join(g.profile for g in stale))
    down_provs = [p for p in prov_list if p.state == ProviderState.DOWN]
    if down_provs:
        warnings.append(f"{len(down_provs)} provider(s) DOWN: " +
                        ", ".join(p.provider for p in down_provs))
    cfg_errors = _cfg_check.check()
    for profile, errs in cfg_errors.items():
        for err in errs:
            warnings.append(f"config/{profile}: {err}")

    return Report(
        gateways=gw_list,
        providers=prov_list,
        system=sys_status,
        venv_ok=venv_ok,
        venv_issues=venv_issues,
        generated_at=datetime.now(timezone.utc),
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Rendering helpers
# ---------------------------------------------------------------------------

_STATE_STYLE = {
    GatewayState.UP:      "bold green",
    GatewayState.DOWN:    "bold red",
    GatewayState.STALE:   "bold yellow",
    GatewayState.UNKNOWN: "dim",
}

_PROV_STATE_STYLE = {
    ProviderState.LIVE:      "bold green",
    ProviderState.DEGRADED:  "bold yellow",
    ProviderState.DOWN:      "bold red",
    ProviderState.UNKNOWN:   "dim",
    ProviderState.UNCHECKED: "dim",
}

_AUTH_ICON = {
    AuthState.VALID:    "[green]✓[/green]",
    AuthState.INVALID:  "[red]✗[/red]",
    AuthState.UNKNOWN:  "[yellow]?[/yellow]",
    AuthState.UNTESTED: "[dim]-[/dim]",
}


def _state_text(state: GatewayState) -> Text:
    icons = {
        GatewayState.UP:      "● UP",
        GatewayState.DOWN:    "● DOWN",
        GatewayState.STALE:   "◐ STALE",
        GatewayState.UNKNOWN: "○ UNKNOWN",
    }
    return Text(icons.get(state, str(state)), style=_STATE_STYLE.get(state, ""))


def _prov_state_text(state: ProviderState) -> Text:
    icons = {
        ProviderState.LIVE:      "✓ live",
        ProviderState.DEGRADED:  "~ slow",
        ProviderState.DOWN:      "✗ DOWN",
        ProviderState.UNKNOWN:   "? unknown",
        ProviderState.UNCHECKED: "- unchecked",
    }
    return Text(icons.get(state, str(state)), style=_PROV_STATE_STYLE.get(state, ""))


def _fmt_roles(roles: list) -> str:
    if not roles:
        return "[dim]—[/dim]"
    parts = []
    for r in roles:
        auth_icon = _AUTH_ICON.get(r.auth_state, "?")
        lat = f" {r.last_latency_s:.0f}s" if r.last_latency_s is not None else ""
        # Show resolved model name for primary/fallback roles; skip for aux roles with no model
        model_str = ""
        if r.model and r.role in ("primary", "fallback") or (r.model and r.role.startswith("fallback_")):
            # Shorten model name: strip leading org prefix if it would make it too long
            model_display = r.model
            if "/" in model_display:
                model_display = model_display.split("/")[-1]
            model_str = f"[dim]({model_display})[/dim] "
        parts.append(f"{r.role}:{auth_icon}{lat} {model_str}".rstrip())
    return "  ".join(parts)


def _fmt_pid(pid: Optional[int]) -> str:
    return str(pid) if pid is not None else "[dim]—[/dim]"


# ---------------------------------------------------------------------------
# Subcommand: status
# ---------------------------------------------------------------------------

def cmd_status(args: argparse.Namespace) -> int:
    report = build_report()

    # --- Gateway table ---
    console.print()
    console.rule("[bold]swarmctl status[/bold]", style="blue")
    console.print(f"[dim]Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC') if report.generated_at else '?'}[/dim]")
    console.print()

    tbl = Table(
        title="Gateways",
        box=box.SIMPLE_HEAVY,
        show_header=True,
        header_style="bold cyan",
        expand=False,
    )
    tbl.add_column("Profile", style="bold", min_width=20)
    tbl.add_column("State", min_width=10)
    tbl.add_column("PID", justify="right", min_width=7)
    tbl.add_column("Domain", min_width=10)
    tbl.add_column("Cfg", justify="center", min_width=4)
    tbl.add_column("Roles (primary → aux)", min_width=40)

    for gw in report.gateways:
        cfg_icon = "[green]✓[/green]" if gw.config_valid else "[red]✗[/red]"
        stale_suffix = " [yellow](STALE)[/yellow]" if gw.stale else ""
        domain_short = gw.domain.value.split("/")[0] if "/" in gw.domain.value else gw.domain.value
        tbl.add_row(
            gw.profile + stale_suffix,
            _state_text(gw.state),
            _fmt_pid(gw.pid),
            domain_short,
            cfg_icon,
            _fmt_roles(gw.roles),
        )

    console.print(tbl)

    # --- Provider canary panel ---
    ptbl = Table(
        title="Provider Canary Panel",
        box=box.SIMPLE_HEAVY,
        show_header=True,
        header_style="bold cyan",
        expand=False,
    )
    ptbl.add_column("Provider", style="bold", min_width=20)
    ptbl.add_column("Key prefix", min_width=10)
    ptbl.add_column("Status", min_width=12)
    ptbl.add_column("Latency", justify="right", min_width=8)
    ptbl.add_column("HTTP", justify="right", min_width=5)
    ptbl.add_column("Detail", min_width=40)

    for p in report.providers:
        lat_str = f"{p.latency_s:.1f}s" if p.latency_s is not None else "—"
        http_str = str(p.http_status) if p.http_status is not None else "—"
        cached_tag = " [dim](cached)[/dim]" if p.cached else ""
        detail = (p.error_detail or "") + cached_tag
        ptbl.add_row(
            p.provider,
            p.api_key_prefix,
            _prov_state_text(p.state),
            lat_str,
            http_str,
            detail,
        )

    console.print(ptbl)

    # --- System resources ---
    if report.system:
        s = report.system
        load_style = "red bold" if s.load_per_cpu > 0.8 else ("yellow" if s.load_per_cpu > 0.5 else "green")
        swap_pct = (s.swap_used_mb / s.swap_total_mb * 100) if s.swap_total_mb else 0
        swap_style = "red bold" if swap_pct > 50 else ("yellow" if swap_pct > 20 else "green")
        ram_pct = ((s.ram_total_mb - s.ram_free_mb) / s.ram_total_mb * 100) if s.ram_total_mb else 0
        console.print(
            f"[bold]System:[/bold]  "
            f"load [{load_style}]{s.load_avg_1m:.2f}/{s.load_avg_5m:.2f}/{s.load_avg_15m:.2f}[/{load_style}] "
            f"({s.cpu_count} CPUs, {s.load_per_cpu:.0%}/CPU)  "
            f"swap [{swap_style}]{swap_pct:.0f}%[/{swap_style}]  "
            f"ram {ram_pct:.0f}% used  "
            f"[dim]({s.sampled_at.strftime('%H:%M:%S UTC') if s.sampled_at else '?'})[/dim]"
        )

    # --- Venv ---
    if not report.venv_ok:
        console.print(f"[bold red]venv:[/bold red] missing packages: {', '.join(report.venv_issues)}")
    else:
        console.print("[bold green]venv:[/bold green] all required packages present")

    # --- Warnings ---
    if report.warnings:
        console.print()
        console.print("[bold yellow]Warnings:[/bold yellow]")
        for w in report.warnings:
            console.print(f"  [yellow]⚠[/yellow]  {w}")

    console.print()
    emit_report(report)
    return 0


# ---------------------------------------------------------------------------
# Subcommand: doctor
# ---------------------------------------------------------------------------

def cmd_doctor(args: argparse.Namespace) -> int:
    report = build_report()

    console.print()
    console.rule("[bold]swarmctl doctor[/bold]  [dim](read-only)[/dim]", style="blue")
    console.print()

    issues_found = 0

    # --- Stale gateways ---
    stale = [g for g in report.gateways if g.stale]
    if stale:
        issues_found += len(stale)
        console.print("[bold yellow]STALE GATEWAYS[/bold yellow] — code updated after process started (ImportError risk on next call):")
        for g in stale:
            age = ""
            if g.code_mtime and g.process_start:
                delta = int((g.code_mtime - g.process_start).total_seconds() / 60)
                age = f" (code {delta}m newer than process)"
            console.print(f"  [yellow]⚠[/yellow]  {g.profile}{age}")
        console.print("  [dim]Fix: launchctl kickstart -k gui/501/ai.hermes.gateway-<profile>[/dim]")
        console.print()

    # --- Down gateways ---
    down_gw = [g for g in report.gateways if g.state == GatewayState.DOWN]
    if down_gw:
        issues_found += len(down_gw)
        console.print("[bold red]DOWN GATEWAYS:[/bold red]")
        for g in down_gw:
            console.print(f"  [red]✗[/red]  {g.profile} ({g.launchd_label})")
        console.print("  [dim]Fix: launchctl bootstrap gui/501 ~/Library/LaunchAgents/<label>.plist[/dim]")
        console.print()

    # --- Config errors ---
    cfg_errors = _cfg_check.check()
    bad_cfgs = {k: v for k, v in cfg_errors.items() if v}
    if bad_cfgs:
        issues_found += sum(len(v) for v in bad_cfgs.values())
        console.print("[bold red]CONFIG ERRORS:[/bold red]")
        for profile, errs in bad_cfgs.items():
            for err in errs:
                console.print(f"  [red]✗[/red]  [{profile}] {err}")
        console.print("  [dim]Fix: edit ~/.hermes/profiles/<profile>/config.yaml (use sed/replace, never yaml.dump)[/dim]")
        console.print()

    # --- Dead providers with live gateways depending on them ---
    dead_provs = {p.provider for p in report.providers if p.state == ProviderState.DOWN}
    if dead_provs:
        issues_found += len(dead_provs)
        console.print("[bold red]DEAD PROVIDERS:[/bold red]")
        for p in report.providers:
            if p.state != ProviderState.DOWN:
                continue
            console.print(f"  [red]✗[/red]  {p.provider}  HTTP {p.http_status}  — {p.error_detail or 'no detail'}")
            # Find which gateways reference this provider
            affected = []
            for g in report.gateways:
                for r in g.roles:
                    if r.provider and p.provider.startswith(r.provider):
                        affected.append(f"{g.profile}/{r.role}")
            if affected:
                console.print(f"       Affects: {', '.join(affected[:6])}" +
                              (" …" if len(affected) > 6 else ""))
        console.print()

    # --- Invalid auth on roles ---
    bad_auth_roles = []
    for g in report.gateways:
        for r in g.roles:
            if r.auth_state == AuthState.INVALID:
                bad_auth_roles.append((g.profile, r.role, r.provider or "?"))
    if bad_auth_roles:
        issues_found += len(bad_auth_roles)
        console.print("[bold red]INVALID AUTH ON ROLES:[/bold red]")
        for profile, role, prov in bad_auth_roles:
            console.print(f"  [red]✗[/red]  {profile}/{role} (provider: {prov})")
        console.print("  [dim]Fix: hermes --profile <profile> auth <provider>[/dim]")
        console.print()

    # --- Venv ---
    if not report.venv_ok:
        issues_found += len(report.venv_issues)
        console.print("[bold red]VENV ISSUES:[/bold red]")
        for vi in report.venv_issues:
            console.print(f"  [red]✗[/red]  {vi}")
        console.print("  [dim]Fix: /Users/djm/.hermes/hermes-agent/venv/bin/pip install <pkg>[/dim]")
        console.print()

    if issues_found == 0:
        console.print("[bold green]All checks passed — no issues found.[/bold green]")
    else:
        console.print(f"[bold red]{issues_found} issue(s) found.[/bold red]  "
                      "[dim]swarmctl is read-only; apply fixes manually or via Phase 2 swarmctl verbs.[/dim]")

    console.print()
    emit_report(report)
    return 1 if issues_found > 0 else 0


# ---------------------------------------------------------------------------
# Subcommand: digest
# ---------------------------------------------------------------------------

def cmd_digest(args: argparse.Namespace) -> int:
    """Compact plain-text digest for Discord / Telegram posting."""
    report = build_report()

    up = sum(1 for g in report.gateways if g.state == GatewayState.UP)
    down = sum(1 for g in report.gateways if g.state == GatewayState.DOWN)
    stale = sum(1 for g in report.gateways if g.stale)
    total = len(report.gateways)

    live_provs = sum(1 for p in report.providers if p.state == ProviderState.LIVE)
    dead_provs = [p for p in report.providers if p.state == ProviderState.DOWN]

    lines: list[str] = []
    now_str = report.generated_at.strftime("%H:%Mz") if report.generated_at else "?"
    lines.append(f"**swarmctl digest** {now_str}")
    lines.append(f"Gateways: {up}/{total} up" +
                 (f"  {down} DOWN" if down else "") +
                 (f"  {stale} STALE" if stale else ""))

    if dead_provs:
        lines.append("Providers DOWN: " + ", ".join(
            f"{p.provider} ({p.http_status})" for p in dead_provs
        ))
    else:
        lines.append(f"Providers: {live_provs}/{len(report.providers)} live ✓")

    if report.system:
        s = report.system
        lines.append(f"System: load {s.load_avg_1m:.1f}  swap {(s.swap_used_mb/s.swap_total_mb*100):.0f}%  "
                     f"ram {((s.ram_total_mb-s.ram_free_mb)/s.ram_total_mb*100):.0f}% used")

    cfg_errs = sum(len(v) for v in _cfg_check.check().values())
    if cfg_errs:
        lines.append(f"Config: {cfg_errs} error(s) — run swarmctl doctor")

    if report.warnings:
        for w in report.warnings[:3]:
            lines.append(f"⚠ {w}")
        if len(report.warnings) > 3:
            lines.append(f"  … +{len(report.warnings)-3} more warnings")

    digest_text = "\n".join(lines)
    console.print(digest_text)
    emit_report(report)
    return 0


# ---------------------------------------------------------------------------
# Argument parser + main
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="swarmctl",
        description="Read-only observability CLI for the Hermes swarm (Phase 1)",
    )
    sub = p.add_subparsers(dest="cmd", metavar="<command>")

    sub.add_parser(
        "status",
        help="Print gateway table, provider canary panel, and system resources",
    )
    doctor_p = sub.add_parser(
        "doctor",
        help="Read-only health checks with fix suggestions (exit 1 if issues found)",
    )
    doctor_p.add_argument(
        "--profile", metavar="NAME",
        help="Check only this profile (default: all)",
    )
    sub.add_parser(
        "digest",
        help="Compact one-liner digest for Discord/Telegram posting",
    )
    return p


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.cmd is None:
        parser.print_help()
        return 0
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "doctor":
        return cmd_doctor(args)
    if args.cmd == "digest":
        return cmd_digest(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
