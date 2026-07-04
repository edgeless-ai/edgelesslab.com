"""Shared test helpers for the spine suite.

Lives outside conftest.py under a unique module name so it never collides
with other packages' conftests (underwriting/tests has its own conftest and
pytest imports non-package conftests under the bare name 'conftest').
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from spine.schema import Signal  # noqa: E402

# Fixed "now" for deterministic scoring/routing assertions against fixtures
# (fixture observed_at values are 2026-01..06).
FIXED_NOW = datetime(2026, 7, 4, tzinfo=timezone.utc)

FIXTURES = ROOT / "fixtures" / "sample_signals.json"


def make_signal(**overrides) -> Signal:
    """Minimal valid signal with overridable fields."""
    base = {
        "id": "t-1",
        "source": "test",
        "signal_type": "tax_delinquent",
        "observed_at": "2026-06-20T00:00:00+00:00",
        "property": {
            "apn": None,
            "address": "123 Main St",
            "city": "Cape Coral",
            "state": "FL",
            "zip": "33990",
            "lat": None,
            "lon": None,
        },
        "owner": None,
        "evidence": {},
        "source_url": None,
        "confidence": 0.9,
    }
    prop_overrides = overrides.pop("property", None)
    ev_overrides = overrides.pop("evidence", None)
    base.update(overrides)
    if prop_overrides:
        base["property"] = {**base["property"], **prop_overrides}
    if ev_overrides:
        base["evidence"] = {**base["evidence"], **ev_overrides}
    return Signal.from_dict(base)
