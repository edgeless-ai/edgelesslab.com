"""CLI for shadow-mode pre-flight retrieval simulation.

Usage:
    # Simulate pre-flight retrieval for a single agent
    python scripts/shadow_retrieval.py --agent hive --task "Handle EDGA-5258 task"

    # Simulate for all tier-1 agents
    python scripts/shadow_retrieval.py --all-agents

    # Show today's shadow stats
    python scripts/shadow_retrieval.py --stats

    # Show stats for a specific date
    python scripts/shadow_retrieval.py --stats --date 2026-05-28
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure project root is on the path so src imports work without installation.
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.kernel.shared_memory.shadow_retrieval import ShadowRetrieval, SHADOW_LOG_DIR

TIER1_AGENTS = ("hive", "beau", "scribe", "trader", "edgeless-cc")


def _print_result_summary(result: object) -> None:
    """Print a human-readable summary of a ShadowRetrievalResult."""
    print(f"\nagent         : {result.agent}")
    print(f"timestamp     : {result.timestamp[:19]}Z")
    print(f"task          : {result.task_description or '(none)'}")
    print(f"entries found : {len(result.working_memory_entries)}")
    print(f"tiers         : {json.dumps(result.tiers_retrieved)}")
    print(f"agents cited  : {', '.join(result.agents_referenced) or '(none)'}")
    print(f"oldest (hrs)  : {result.oldest_entry_age_hours:.1f}")
    print(f"newest (hrs)  : {result.newest_entry_age_hours:.1f}")
    print(f"~tokens       : {result.injection_token_estimate}")
    print()
    print("--- injection block (shadow, NOT injected) ---")
    print(result.injection_block)
    print("--- end injection block ---")


def cmd_agent(agent: str, task: str, max_tokens: int) -> None:
    """Run shadow retrieval for a single agent and print the result."""
    sr = ShadowRetrieval()
    result = sr.retrieve_and_log(
        agent=agent,
        task_description=task,
        max_tokens=max_tokens,
    )
    _print_result_summary(result)
    print(f"\nLogged to: {SHADOW_LOG_DIR}")


def cmd_all_agents(task: str, max_tokens: int) -> None:
    """Run shadow retrieval for every tier-1 agent."""
    sr = ShadowRetrieval()
    print(f"Running shadow retrieval for {len(TIER1_AGENTS)} tier-1 agents...\n")
    for agent in TIER1_AGENTS:
        print(f"=== {agent} ===")
        result = sr.retrieve_and_log(
            agent=agent,
            task_description=task,
            max_tokens=max_tokens,
        )
        print(
            f"  entries={len(result.working_memory_entries)}"
            f"  tokens~={result.injection_token_estimate}"
            f"  tiers={json.dumps(result.tiers_retrieved)}"
        )
    print(f"\nAll results logged to: {SHADOW_LOG_DIR}")


def cmd_stats(date_str: str | None) -> None:
    """Print aggregated stats from a day's shadow logs."""
    sr = ShadowRetrieval()
    stats = sr.get_daily_stats(date_str=date_str)
    print(json.dumps(stats, indent=2))


def build_parser() -> argparse.ArgumentParser:
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        prog="shadow_retrieval",
        description="Shadow-mode pre-flight retrieval simulator",
    )

    agent_group = parser.add_mutually_exclusive_group()
    agent_group.add_argument(
        "--agent",
        metavar="NAME",
        help="Agent name to simulate retrieval for",
    )
    agent_group.add_argument(
        "--all-agents",
        dest="all_agents",
        action="store_true",
        help=f"Simulate for all tier-1 agents: {', '.join(TIER1_AGENTS)}",
    )
    agent_group.add_argument(
        "--stats",
        action="store_true",
        help="Show aggregated stats for a day's shadow logs",
    )

    parser.add_argument(
        "--task",
        default="",
        help="Task description to include in the log (for context)",
    )
    parser.add_argument(
        "--max-tokens",
        dest="max_tokens",
        type=int,
        default=2000,
        help="Token budget for injection block (default: 2000)",
    )
    parser.add_argument(
        "--date",
        default=None,
        metavar="YYYY-MM-DD",
        help="Date for --stats (default: today)",
    )
    return parser


def main() -> None:
    """Entry point."""
    parser = build_parser()
    args = parser.parse_args()

    if args.stats:
        cmd_stats(date_str=args.date)
    elif args.all_agents:
        cmd_all_agents(task=args.task, max_tokens=args.max_tokens)
    elif args.agent:
        cmd_agent(agent=args.agent, task=args.task, max_tokens=args.max_tokens)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
