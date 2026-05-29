"""Shadow pre-flight hook: runs shadow retrieval for active Hermes tier-1 profiles.

Can be called from cron or manually.  Reads active Hermes profiles from
~/.hermes/profiles/, filters to tier-1 agents, runs shadow retrieval for each,
logs all results, and prints a summary to stdout.

Nothing is injected.  This is observe-only.

Usage:
    python scripts/hooks/shadow_preflight_hook.py
    python scripts/hooks/shadow_preflight_hook.py --profiles-dir /path/to/hermes/profiles
    python scripts/hooks/shadow_preflight_hook.py --max-tokens 1500
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

# Ensure project root is on the path so src imports work without installation.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.kernel.shared_memory.shadow_retrieval import ShadowRetrieval, SHADOW_LOG_DIR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger(__name__)

DEFAULT_HERMES_PROFILES_DIR = Path.home() / ".hermes" / "profiles"

# Tier-1 agents: always-on coordination layer.
TIER1_AGENTS = frozenset({"hive", "beau", "scribe", "trader", "edgeless-cc"})


def _discover_active_profiles(profiles_dir: Path) -> list[str]:
    """Return profile names that exist on disk and are in the tier-1 set."""
    if not profiles_dir.is_dir():
        logger.warning("Hermes profiles dir not found: %s", profiles_dir)
        return []

    found: list[str] = []
    for entry in sorted(profiles_dir.iterdir()):
        if entry.is_dir() and entry.name in TIER1_AGENTS:
            found.append(entry.name)
    return found


def run_shadow_preflight(
    profiles_dir: Path = DEFAULT_HERMES_PROFILES_DIR,
    max_tokens: int = 2000,
) -> dict:
    """Run shadow retrieval for all discovered tier-1 profiles.

    Returns a summary dict with per-agent results and aggregate counts.
    """
    agents = _discover_active_profiles(profiles_dir)
    if not agents:
        logger.warning("No tier-1 agents found in %s", profiles_dir)
        return {"agents_checked": 0, "results": []}

    logger.info("Shadow pre-flight: checking %d tier-1 agents: %s", len(agents), agents)

    sr = ShadowRetrieval()
    results: list[dict] = []

    for agent in agents:
        try:
            result = sr.retrieve_and_log(
                agent=agent,
                task_description="shadow_preflight_hook automated run",
                max_tokens=max_tokens,
            )
            results.append(
                {
                    "agent": agent,
                    "entries": len(result.working_memory_entries),
                    "tokens": result.injection_token_estimate,
                    "tiers": result.tiers_retrieved,
                    "agents_referenced": result.agents_referenced,
                    "oldest_hours": result.oldest_entry_age_hours,
                    "newest_hours": result.newest_entry_age_hours,
                    "ok": True,
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Shadow retrieval failed for agent %s: %s", agent, exc)
            results.append({"agent": agent, "ok": False, "error": str(exc)})

    summary = {
        "agents_checked": len(agents),
        "agents_ok": sum(1 for r in results if r.get("ok")),
        "agents_failed": sum(1 for r in results if not r.get("ok")),
        "total_entries": sum(r.get("entries", 0) for r in results),
        "total_tokens": sum(r.get("tokens", 0) for r in results),
        "log_dir": str(SHADOW_LOG_DIR),
        "results": results,
    }
    return summary


def _print_summary(summary: dict) -> None:
    """Print a human-readable summary to stdout."""
    print(
        f"\nShadow pre-flight complete: "
        f"{summary['agents_ok']}/{summary['agents_checked']} agents ok"
    )
    print(
        f"Total entries that would be injected: {summary['total_entries']}"
        f"  (~{summary['total_tokens']} tokens)"
    )
    print(f"Log dir: {summary['log_dir']}\n")

    for r in summary["results"]:
        if r.get("ok"):
            print(
                f"  {r['agent']:<16}"
                f"  entries={r['entries']}"
                f"  tokens~={r['tokens']}"
                f"  tiers={json.dumps(r['tiers'])}"
            )
        else:
            print(f"  {r['agent']:<16}  ERROR: {r.get('error', 'unknown')}")
    print()


def build_parser() -> argparse.ArgumentParser:
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        prog="shadow_preflight_hook",
        description="Run shadow pre-flight retrieval for all active Hermes tier-1 profiles",
    )
    parser.add_argument(
        "--profiles-dir",
        dest="profiles_dir",
        type=Path,
        default=DEFAULT_HERMES_PROFILES_DIR,
        help=f"Hermes profiles directory (default: {DEFAULT_HERMES_PROFILES_DIR})",
    )
    parser.add_argument(
        "--max-tokens",
        dest="max_tokens",
        type=int,
        default=2000,
        help="Token budget for injection block per agent (default: 2000)",
    )
    parser.add_argument(
        "--json",
        dest="output_json",
        action="store_true",
        help="Output summary as JSON instead of human-readable text",
    )
    return parser


def main() -> None:
    """Entry point."""
    parser = build_parser()
    args = parser.parse_args()

    summary = run_shadow_preflight(
        profiles_dir=args.profiles_dir,
        max_tokens=args.max_tokens,
    )

    if args.output_json:
        print(json.dumps(summary, indent=2))
    else:
        _print_summary(summary)

    if summary["agents_failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
