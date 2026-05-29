"""CLI for inspecting and toggling gated memory injection flags.

Usage
-----
# Show what would be injected for an agent in shadow mode
python scripts/injection_gate.py --agent hive --task-type coordinate

# Show resolved config for all known agents (or a specific one)
python scripts/injection_gate.py --show-config
python scripts/injection_gate.py --show-config --agent hive

# Toggle an agent's mode (updates the YAML *and* JSON flags files)
python scripts/injection_gate.py --set-mode hive active
python scripts/injection_gate.py --set-mode hive shadow
python scripts/injection_gate.py --set-mode hive off
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure project root is on sys.path so src.* imports resolve
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.kernel.shared_memory.context_injection import (  # noqa: E402
    ContextInjector,
    FLAGS_PATH,
    FLAGS_PATH_JSON,
    TIER_ORDER,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

VALID_MODES = ("off", "shadow", "active")
KNOWN_AGENTS = ("hive", "beau", "scribe", "trader", "edgeless-cc")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_yaml_flags(path: Path) -> dict:
    """Load YAML flags; raise on failure."""
    try:
        import yaml  # type: ignore[import]
        return yaml.safe_load(path.read_text()) or {}
    except ImportError as exc:
        raise RuntimeError("PyYAML not available; cannot edit YAML flags") from exc


def _save_yaml_flags(path: Path, data: dict) -> None:
    """Save flags back to YAML, preserving structure."""
    try:
        import yaml  # type: ignore[import]
        path.write_text(
            yaml.dump(data, default_flow_style=False, allow_unicode=True, sort_keys=False)
        )
    except ImportError as exc:
        raise RuntimeError("PyYAML not available; cannot write YAML flags") from exc


def _save_json_flags(path: Path, data: dict) -> None:
    """Save flags to JSON fallback."""
    path.write_text(json.dumps(data, indent=2) + "\n")


def _set_agent_mode(agent: str, mode: str) -> None:
    """Update agent mode in both YAML and JSON flags files."""
    if mode not in VALID_MODES:
        print(f"ERROR: invalid mode '{mode}'. Choose from: {', '.join(VALID_MODES)}", file=sys.stderr)
        sys.exit(1)

    # --- YAML ---
    if FLAGS_PATH.exists():
        data = _load_yaml_flags(FLAGS_PATH)
    else:
        print(f"WARNING: {FLAGS_PATH} not found; creating fresh flags file", file=sys.stderr)
        data = {"defaults": {"mode": "shadow", "max_tokens": 1500}, "agents": {}, "task_overrides": {}}

    agents_section = data.setdefault("agents", {})
    if agent not in agents_section:
        agents_section[agent] = {}
    agents_section[agent]["mode"] = mode
    _save_yaml_flags(FLAGS_PATH, data)
    print(f"Updated {FLAGS_PATH}: agents.{agent}.mode = {mode!r}")

    # --- JSON (mirror) ---
    if FLAGS_PATH_JSON.exists():
        try:
            json_data = json.loads(FLAGS_PATH_JSON.read_text())
        except json.JSONDecodeError:
            json_data = {}
    else:
        json_data = {}

    json_agents = json_data.setdefault("agents", {})
    if agent not in json_agents:
        json_agents[agent] = {}
    json_agents[agent]["mode"] = mode
    _save_json_flags(FLAGS_PATH_JSON, json_data)
    print(f"Updated {FLAGS_PATH_JSON}: agents.{agent}.mode = {mode!r}")


def _show_config(injector: ContextInjector, agent: str | None) -> None:
    """Print resolved config table for all known agents or a single one."""
    agents = [agent] if agent else list(KNOWN_AGENTS)
    width_agent = max(len(a) for a in agents) + 2

    header = f"{'agent':<{width_agent}}  {'mode':<8}  {'max_tok':>7}  {'min_tier':<10}  {'max_age_h':>9}  citation_format"
    print(header)
    print("-" * len(header))

    for ag in agents:
        cfg = injector.resolve_config(ag)
        print(
            f"{ag:<{width_agent}}  {cfg.mode:<8}  {cfg.max_tokens:>7}  "
            f"{cfg.min_tier:<10}  {cfg.max_age_hours:>9}  {cfg.citation_format}"
        )


def _show_injection(injector: ContextInjector, agent: str, task_type: str) -> None:
    """Build and print the injection result for an agent."""
    result = injector.build_injection(agent=agent, task_type=task_type)

    print(f"Agent         : {result.agent}")
    print(f"Task type     : {result.task_type or '(none)'}")
    print(f"Mode          : {result.mode}")
    print(f"Max tokens    : {result.config.max_tokens}")
    print(f"Min tier      : {result.config.min_tier}")
    print(f"Max age (h)   : {result.config.max_age_hours}")
    print(f"Considered    : {result.entries_considered} entries")
    print(f"Selected      : {result.entries_selected} entries")
    print(f"Token estimate: ~{result.token_estimate}")
    print(f"Was injected  : {result.was_injected}")
    print()

    if result.mode == "off":
        print("[Injection is OFF — no block built]")
        return

    if not result.injection_block or result.entries_selected == 0:
        print("[No entries matched filters — empty injection block]")
        print(result.injection_block)
        return

    print("--- Injection block preview ---")
    print(result.injection_block)
    print("--- End preview ---")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inspect and toggle gated memory injection flags.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--agent",
        metavar="AGENT",
        help="Agent name (e.g. hive, beau, trader).",
    )
    parser.add_argument(
        "--task-type",
        metavar="TASK_TYPE",
        default="",
        help="Task type for override resolution (e.g. coordinate).",
    )
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="Show resolved config for all agents (or --agent if given).",
    )
    parser.add_argument(
        "--set-mode",
        nargs=2,
        metavar=("AGENT", "MODE"),
        help="Set an agent's mode: off | shadow | active.",
    )
    parser.add_argument(
        "--flags-path",
        metavar="PATH",
        default=str(FLAGS_PATH),
        help=f"Override path to flags YAML (default: {FLAGS_PATH}).",
    )
    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    flags_path = Path(args.flags_path)
    injector = ContextInjector(flags_path=flags_path)

    if args.set_mode:
        agent_name, mode = args.set_mode
        _set_agent_mode(agent_name, mode)
        return

    if args.show_config:
        _show_config(injector, args.agent)
        return

    if args.agent:
        _show_injection(injector, args.agent, args.task_type)
        return

    # Default: show config for all agents
    _show_config(injector, None)


if __name__ == "__main__":
    main()
