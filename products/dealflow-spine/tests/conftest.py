"""Spine test fixtures. Helpers live in spine_test_utils.py (unique module
name — see its docstring). Tests are hermetic: tmp dirs, no network, fixed clock."""

import json
from pathlib import Path

import pytest

from spine_test_utils import FIXTURES  # noqa: F401 (also wires sys.path to ROOT)

from spine.schema import Signal


@pytest.fixture
def fixture_signal_dicts() -> list[dict]:
    return json.loads(FIXTURES.read_text())["signals"]


@pytest.fixture
def fixture_signals(fixture_signal_dicts) -> list[Signal]:
    return [Signal.from_dict(d) for d in fixture_signal_dicts]


@pytest.fixture
def tmp_adapters_dir(tmp_path) -> Path:
    """An isolated adapters dir seeded with a fixtures-backed adapter
    (embeds the absolute fixture path so it works from anywhere)."""
    adapters = tmp_path / "adapters"
    adapters.mkdir()
    (adapters / "fixture_source.py").write_text(
        "import json\n"
        "SOURCE = 'fixtures'\n"
        f"FIXTURE_PATH = {str(FIXTURES)!r}\n"
        "def fetch():\n"
        "    return json.loads(open(FIXTURE_PATH).read())['signals']\n"
    )
    return adapters
