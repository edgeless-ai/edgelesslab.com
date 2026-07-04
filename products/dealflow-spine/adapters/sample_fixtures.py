"""
Reference adapter: serves the bundled fixture signals (zero network).

This is the canonical example of the adapter contract — copy it to start a
real adapter (or start from adapters/_template.py). Keep this file in place:
it's what makes `python cli.py run` work end-to-end with no network, and the
test suite uses it.

Contract recap (full version in adapters/README.md and spine/ingest.py):
    SOURCE: str            optional — default source stamped on signals
    ENABLED: bool          optional — False keeps the adapter out of runs
    fetch() -> list[dict]  required — dicts shaped like Signal.to_dict()
                           (or spine.schema.Signal instances)
"""

import json
from pathlib import Path

SOURCE = "fixtures"

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "sample_signals.json"


def fetch() -> list[dict]:
    data = json.loads(FIXTURE_PATH.read_text())
    return data["signals"]
