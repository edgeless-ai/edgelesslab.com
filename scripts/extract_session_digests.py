#!/usr/bin/env python3
"""
Extract Session Digests — CLI runner for session_digest_extractor.

Usage:
    python scripts/extract_session_digests.py --source hermes
    python scripts/extract_session_digests.py --source claude-code
    python scripts/extract_session_digests.py --source hermes --session-id <id>
    python scripts/extract_session_digests.py --source hermes --dry-run
    python scripts/extract_session_digests.py --source hermes --output markdown
    python scripts/extract_session_digests.py --source hermes --output json
"""

import argparse
import json
import logging
import sys
from dataclasses import asdict
from pathlib import Path

# Add scripts/ to path so `scripts.lib` is importable when invoked directly
_SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS_DIR.parent))

from scripts.lib.session_digest_extractor import (  # noqa: E402
    DIGEST_STATE_PATH,
    VAULT_DIGESTS_DIR,
    SessionDigest,
    SessionDigestExtractor,
    digest_to_markdown,
    digest_to_working_memory_entries,
    write_digest_to_vault,
)

logger = logging.getLogger(__name__)

# Default Hermes profile paths to probe when --lcm-db is not specified
_DEFAULT_HERMES_PROFILES = [
    Path.home() / ".hermes" / "profiles" / "hive" / "lcm.db",
    Path.home() / ".hermes" / "profiles" / "kilo" / "lcm.db",
    Path.home() / ".hermes" / "profiles" / "beau" / "lcm.db",
    Path.home() / ".hermes" / "profiles" / "cc" / "lcm.db",
]


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Extract structured digests from agent session transcripts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument(
        "--source",
        required=True,
        choices=["hermes", "claude-code"],
        help="Session source to extract from.",
    )
    p.add_argument(
        "--session-id",
        default=None,
        help="Extract a specific session by ID (skips deduplication state).",
    )
    p.add_argument(
        "--lcm-db",
        default=None,
        help="Path to a specific LCM SQLite database (hermes source only).",
    )
    p.add_argument(
        "--sessions-dir",
        default=None,
        help="Path to Claude Code sessions directory (claude-code source only).",
    )
    p.add_argument(
        "--profile",
        default=None,
        help="Hermes profile name for labelling digests (inferred from --lcm-db if not given).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be extracted without writing anything.",
    )
    p.add_argument(
        "--output",
        choices=["markdown", "json", "working-memory"],
        default="markdown",
        help="Output format: markdown (write to vault), json (stdout), or working-memory (json stdout).",
    )
    p.add_argument(
        "--state-file",
        default=None,
        help=f"Override digest state file path (default: {DIGEST_STATE_PATH}).",
    )
    p.add_argument(
        "--vault-dir",
        default=None,
        help=f"Override vault digests directory (default: {VAULT_DIGESTS_DIR}).",
    )
    p.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging.",
    )
    return p


def _extract_hermes(
    extractor: SessionDigestExtractor,
    args: argparse.Namespace,
) -> list[SessionDigest]:
    """Gather digests from one or more Hermes LCM databases."""
    digests: list[SessionDigest] = []

    db_paths: list[tuple[Path, str]] = []
    if args.lcm_db:
        db = Path(args.lcm_db)
        profile = args.profile or db.parent.name
        db_paths.append((db, profile))
    else:
        for db in _DEFAULT_HERMES_PROFILES:
            if db.exists():
                profile = args.profile or db.parent.name
                db_paths.append((db, profile))

    if not db_paths:
        logger.warning(
            "No LCM database found. Specify --lcm-db or ensure Hermes profiles exist."
        )
        return []

    for db_path, profile in db_paths:
        logger.info("Processing LCM DB: %s (profile: %s)", db_path, profile)
        results = extractor.extract_from_lcm(
            lcm_db_path=str(db_path),
            session_id=args.session_id,
            profile=profile,
        )
        digests.extend(results)
        logger.info("  → %d digest(s) extracted", len(results))

    return digests


def _extract_claude_code(
    extractor: SessionDigestExtractor,
    args: argparse.Namespace,
) -> list[SessionDigest]:
    """Gather digests from Claude Code JSONL session files."""
    return extractor.extract_from_claude_code(
        sessions_dir=args.sessions_dir,
    )


def _output_json(digests: list[SessionDigest]) -> None:
    """Print digests as a JSON array to stdout."""
    data = [asdict(d) for d in digests]
    print(json.dumps(data, indent=2))


def _output_working_memory(digests: list[SessionDigest]) -> None:
    """Print working memory entries as a JSON array to stdout."""
    all_entries: list[dict] = []
    for d in digests:
        all_entries.extend(digest_to_working_memory_entries(d))
    print(json.dumps(all_entries, indent=2))


def _output_markdown(
    digests: list[SessionDigest],
    extractor: SessionDigestExtractor,
    vault_dir: Path,
    dry_run: bool,
) -> None:
    """Write digests as markdown files to the vault."""
    for digest in digests:
        if dry_run:
            md = digest_to_markdown(digest)
            print(f"=== DRY RUN: {digest.session_id[:8]} ({digest.source}) ===")
            print(md[:600])
            print("...\n")
        else:
            path = write_digest_to_vault(digest, vault_dir=vault_dir)
            print(f"Wrote: {path}")

    if not dry_run and digests:
        extractor.mark_digested([d.session_id for d in digests])
        print(f"\nMarked {len(digests)} session(s) as digested.")


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )

    state_path = Path(args.state_file) if args.state_file else DIGEST_STATE_PATH
    vault_dir = Path(args.vault_dir) if args.vault_dir else VAULT_DIGESTS_DIR

    extractor = SessionDigestExtractor(state_path=state_path)

    if args.source == "hermes":
        digests = _extract_hermes(extractor, args)
    else:
        digests = _extract_claude_code(extractor, args)

    if not digests:
        # Route to stderr when stdout is used for machine-readable output
        if args.output in ("json", "working-memory"):
            print("No new sessions to digest.", file=sys.stderr)
        else:
            print("No new sessions to digest.")
        return 0

    # Status messages go to stderr for machine-readable output modes so stdout is clean
    status_file = sys.stderr if args.output in ("json", "working-memory") else sys.stdout
    print(f"Found {len(digests)} session(s) to digest.", file=status_file)

    if args.output == "json":
        _output_json(digests)
    elif args.output == "working-memory":
        _output_working_memory(digests)
    else:
        _output_markdown(digests, extractor, vault_dir, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    sys.exit(main())
