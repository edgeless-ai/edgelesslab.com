#!/usr/bin/env python3
"""
EDGA-712 Budget Monitor
Per-agent token/cycle budget enforcement.

Usage:
    python scripts/budget-monitor.py --agent kilo --check
    python scripts/budget-monitor.py --agent hive --burn-tokens 1500 --burn-cycles 3
    python scripts/budget-monitor.py --daily-report
"""
import argparse, json, os, sys, time
from pathlib import Path
from datetime import datetime, timezone

PROFILES_DIR = Path.home() / ".hermes" / "profiles"
REPORT_DIR = Path("/Users/djm/claude-projects/claude-vault/13-Reports")

def state_path(agent: str) -> Path:
    return PROFILES_DIR / agent / "budget-state.json"

def load_state(agent: str) -> dict:
    p = state_path(agent)
    if p.exists():
        return json.loads(p.read_text())
    return {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "hour": datetime.now(timezone.utc).hour,
        "tokens_used": 0,
        "cycles_used": 0,
        "last_reset": datetime.now(timezone.utc).isoformat(),
    }

def save_state(agent: str, state: dict):
    p = state_path(agent)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, indent=2))

def load_config(agent: str) -> dict:
    # Look for config.yaml in profile dir or project repo
    candidates = [
        PROFILES_DIR / agent / "config.yaml",
        Path(f"/Users/djm/claude-projects/.hermes/profiles/{agent}/config.yaml"),
    ]
    for c in candidates:
        if c.exists():
            import yaml
            return yaml.safe_load(c.read_text()).get("budget", {})
    # Default Fireworks free-tier config
    return {
        "metered": False,
        "token_budget_per_day": 1_000_000,
        "cycle_budget_per_hour": 60,
        "warning_threshold": 0.9,
        "halt_threshold": 1.0,
    }

def check_budget(agent: str, config: dict, state: dict) -> dict:
    now = datetime.now(timezone.utc)
    # Reset on day boundary
    if state["date"] != now.strftime("%Y-%m-%d"):
        state["tokens_used"] = 0
        state["cycles_used"] = 0
        state["date"] = now.strftime("%Y-%m-%d")
        state["last_reset"] = now.isoformat()
    # Reset on hour boundary
    if state["hour"] != now.hour:
        state["cycles_used"] = 0
        state["hour"] = now.hour

    tok_pct = state["tokens_used"] / max(config["token_budget_per_day"], 1)
    cyc_pct = state["cycles_used"] / max(config["cycle_budget_per_hour"], 1)

    result = {
        "agent": agent,
        "metered": config.get("metered", False),
        "token_pct": round(tok_pct, 3),
        "cycle_pct": round(cyc_pct, 3),
        "status": "ok",
        "alerts": [],
    }

    for metric, pct, label in [
        ("tokens", tok_pct, "day"),
        ("cycles", cyc_pct, "hour"),
    ]:
        if pct >= config.get("halt_threshold", 1.0):
            result["status"] = "halt"
            result["alerts"].append(f"HALT: {metric} budget exhausted ({pct:.1%} / {label})")
        elif pct >= config.get("warning_threshold", 0.9):
            result["status"] = "warn"
            result["alerts"].append(f"WARN: {metric} at {pct:.1%} ({label})")

    return result

def burn(agent: str, tokens: int, cycles: int):
    state = load_state(agent)
    config = load_config(agent)
    state["tokens_used"] += tokens
    state["cycles_used"] += cycles
    save_state(agent, state)
    result = check_budget(agent, config, state)
    print(json.dumps(result, indent=2))
    if result["status"] == "halt":
        sys.exit(1)

def check(agent: str):
    state = load_state(agent)
    config = load_config(agent)
    result = check_budget(agent, config, state)
    print(json.dumps(result, indent=2))
    return result["status"]

def daily_report():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    agents = [d.name for d in PROFILES_DIR.iterdir() if d.is_dir()] if PROFILES_DIR.exists() else []
    # Also scan project-level profile stubs
    alt = Path("/Users/djm/claude-projects/.hermes/profiles")
    if alt.exists():
        agents += [d.name for d in alt.iterdir() if d.is_dir() and d.name not in agents]

    if not agents:
        print("No agent profiles found.")
        return

    lines = [f"# Agent Budget Report — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", ""]
    lines.append("| Agent | Metered | Tokens/Day | Cycles/Hr | Status | Alerts |")
    lines.append("|-------|---------|------------|-----------|--------|--------|")

    for a in sorted(agents):
        state = load_state(a)
        config = load_config(a)
        result = check_budget(a, config, state)
        metered = "✅" if result["metered"] else "🆓"
        lines.append(
            f"| {a} | {metered} | {state['tokens_used']:,} / {config.get('token_budget_per_day', 0):,} "
            f"({result['token_pct']:.0%}) | {state['cycles_used']} / {config.get('cycle_budget_per_hour', 0)} "
            f"({result['cycle_pct']:.0%}) | {result['status']} | {', '.join(result['alerts']) or '-'} |"
        )

    report = "\n".join(lines)
    out = REPORT_DIR / f"agent-budgets-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.md"
    out.write_text(report)
    print(report)
    print(f"\nSaved: {out}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--agent", default="kilo")
    p.add_argument("--burn-tokens", type=int, default=0)
    p.add_argument("--burn-cycles", type=int, default=0)
    p.add_argument("--check", action="store_true")
    p.add_argument("--daily-report", action="store_true")
    args = p.parse_args()

    if args.daily_report:
        daily_report()
    elif args.burn_tokens or args.burn_cycles:
        burn(args.agent, args.burn_tokens, args.burn_cycles)
    else:
        status = check(args.agent)
        sys.exit(0 if status == "ok" else 1)
