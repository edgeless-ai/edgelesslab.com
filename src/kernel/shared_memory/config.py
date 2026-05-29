"""Configuration helpers for the shared memory subsystem."""

from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SHARED_MEMORY_DB_PATH = PROJECT_ROOT / "data" / "shared_memory" / "events.sqlite3"
DEFAULT_CHROMA_DB_PATH = PROJECT_ROOT / "chroma-data"
