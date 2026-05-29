"""CLI for swarm working memory: write, query, promote, stats, expire."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure project root is on the path so src imports work without installation.
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from src.kernel.shared_memory.working_memory import WorkingMemoryStore


def _store() -> WorkingMemoryStore:
    """Return a WorkingMemoryStore pointed at the default database."""
    return WorkingMemoryStore()


def cmd_write(args: argparse.Namespace) -> None:
    """Append a new memory entry and print its ID."""
    store = _store()
    tier = args.tier or "observation"
    tags = [t.strip() for t in args.tags.split(",")] if args.tags else []
    if tier == "decision":
        entry_id = store.write_decision(
            source_agent=args.agent,
            source_session=args.session or "cli",
            content=args.content,
            task_ref=args.task_ref,
            tags=tags if tags else None,
        )
    else:
        entry_id = store.write_observation(
            source_agent=args.agent,
            source_session=args.session or "cli",
            content=args.content,
            task_ref=args.task_ref,
            ttl_hours=args.ttl_hours,
            tags=tags if tags else None,
        )
    print(entry_id)


def cmd_query(args: argparse.Namespace) -> None:
    """Print recent entries as JSON."""
    store = _store()
    entries = store.get_recent(
        limit=args.limit,
        agent=args.agent,
        tier=args.tier,
        task_ref=args.task_ref,
        min_importance=args.min_importance,
        since_hours=args.since_hours,
    )
    print(json.dumps(entries, indent=2))


def cmd_promote(args: argparse.Namespace) -> None:
    """Promote an entry to a higher tier."""
    store = _store()
    success = store.promote(
        entry_id=args.id,
        new_tier=args.tier,
        promoted_by=args.by,
    )
    if success:
        print(f"Promoted {args.id} -> {args.tier}")
    else:
        print(f"ERROR: entry {args.id} not found", file=sys.stderr)
        sys.exit(1)


def cmd_stats(args: argparse.Namespace) -> None:
    """Print database statistics as JSON."""
    store = _store()
    print(json.dumps(store.stats(), indent=2))


def cmd_expire(args: argparse.Namespace) -> None:
    """Delete TTL-expired entries and report count."""
    store = _store()
    deleted = store.expire_stale()
    print(f"Deleted {deleted} expired entries")


def build_parser() -> argparse.ArgumentParser:
    """Build and return the argument parser."""
    parser = argparse.ArgumentParser(
        prog="swarm_memory",
        description="Swarm working memory CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # write
    p_write = sub.add_parser("write", help="Append a memory entry")
    p_write.add_argument("--agent", required=True, help="Source agent name")
    p_write.add_argument("--content", required=True, help="Memory content")
    p_write.add_argument(
        "--tier",
        default="observation",
        choices=("observation", "decision", "lesson", "policy"),
        help="Memory tier (default: observation)",
    )
    p_write.add_argument("--session", default=None, help="Session identifier")
    p_write.add_argument("--task-ref", dest="task_ref", default=None, help="Task reference (e.g. EDGA-5102)")
    p_write.add_argument("--ttl-hours", dest="ttl_hours", type=int, default=None, help="Hours until expiry")
    p_write.add_argument("--tags", default=None, help="Comma-separated tags")

    # query
    p_query = sub.add_parser("query", help="Query recent entries")
    p_query.add_argument("--agent", default=None, help="Filter by agent")
    p_query.add_argument(
        "--tier",
        default=None,
        choices=("observation", "decision", "lesson", "policy"),
        help="Filter by tier",
    )
    p_query.add_argument("--task-ref", dest="task_ref", default=None, help="Filter by task reference")
    p_query.add_argument("--limit", type=int, default=10, help="Max results (default: 10)")
    p_query.add_argument("--min-importance", dest="min_importance", type=float, default=None, help="Minimum importance score")
    p_query.add_argument("--since-hours", dest="since_hours", type=int, default=None, help="Only entries from the last N hours")

    # promote
    p_promote = sub.add_parser("promote", help="Promote an entry to a higher tier")
    p_promote.add_argument("--id", required=True, help="Entry UUID to promote")
    p_promote.add_argument(
        "--tier",
        required=True,
        choices=("decision", "lesson", "policy"),
        help="Target tier",
    )
    p_promote.add_argument("--by", required=True, help="Agent or 'human' performing the promotion")

    # stats
    sub.add_parser("stats", help="Print database statistics")

    # expire
    sub.add_parser("expire", help="Delete TTL-expired entries")

    return parser


def main() -> None:
    """Entry point."""
    parser = build_parser()
    args = parser.parse_args()
    dispatch = {
        "write": cmd_write,
        "query": cmd_query,
        "promote": cmd_promote,
        "stats": cmd_stats,
        "expire": cmd_expire,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
