"""Regression tests for the 2026-06-03 memory-circulation fixes.

Covers the three bugs that left the swarm memory system plumbed-but-not-flowing:
1. No write-time dedup -> ~50% duplicate corpus (WorkingMemoryStore).
2. Flat Claude Code attribution -> no cross-project diversity (extractor).
3. L2-distance scoring zeroed every connection score (connection_miner).
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def test_write_observation_dedups_same_agent_normalized_content():
    from src.kernel.shared_memory.working_memory import WorkingMemoryStore

    db = Path(tempfile.mkdtemp()) / "wm.db"
    store = WorkingMemoryStore(db_path=db)
    a = store.write_observation("claude_code:foo", "s1", "Use pnpm not npm for deps.")
    # Same agent, same content modulo case/whitespace -> deduped to the same row.
    b = store.write_observation("claude_code:foo", "s2", "use   pnpm  not NPM for deps.")
    assert a == b


def test_write_observation_keeps_cross_agent_duplicates():
    from src.kernel.shared_memory.working_memory import WorkingMemoryStore

    db = Path(tempfile.mkdtemp()) / "wm.db"
    store = WorkingMemoryStore(db_path=db)
    a = store.write_observation("agent_a", "s1", "Use pnpm not npm.")
    # A different agent independently noting the same thing is a convergence
    # signal and must be kept (the connection miner links these).
    c = store.write_observation("agent_b", "s2", "Use pnpm not npm.")
    assert a != c


def test_claude_code_project_label_strips_path_noise():
    from scripts.lib.session_digest_extractor import _claude_code_project_label

    assert _claude_code_project_label("-Users-djm-claude-projects") == "claude-projects"
    assert _claude_code_project_label("-private-tmp-mirofish-claude-lane") == "mirofish-claude-lane"
    assert _claude_code_project_label("-private-tmp") == "unknown"


def test_connection_score_nonzero_for_l2_scale_distance():
    """Regression: L2 distances exceed 1.0; 1-distance clamped every score to 0."""
    from scripts.cron.connection_miner import _score_connection

    # Observed real L2 distance from the hermes_learnings collection.
    score = _score_connection(
        distance=1.8, domain_a="x", domain_b="y", pair_already_exists=False
    )
    assert score > 0.0, "L2-scale distance must yield a positive cross-domain score"


def test_connection_score_zero_when_pair_exists():
    from scripts.cron.connection_miner import _score_connection

    assert _score_connection(0.5, "x", "y", pair_already_exists=True) == 0.0
