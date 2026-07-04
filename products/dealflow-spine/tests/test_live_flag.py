"""--live flag + offline-by-default gate. Zero network: run_pipeline is
stubbed for CLI parsing tests, and the adapter test blocks sockets outright."""

import importlib.util
import sys
from pathlib import Path

import pytest

from spine_test_utils import ROOT  # noqa: F401 (wires sys.path)

import cli
from spine.ingest import IngestResult
from spine.pipeline import PipelineResult

LIVE = cli.LIVE_ENV_VAR
ADAPTERS_DIR = Path(cli.ROOT) / "adapters"


def _load_real_common():
    """Load the REAL adapters/_common.py by path. Other tests legitimately
    seed toy `_common` modules into the shared `dealflow_adapters` package
    cache (see test_ingest); pinning by path keeps these tests deterministic
    regardless of suite ordering."""
    spec = importlib.util.spec_from_file_location(
        "dealflow_adapters._common", ADAPTERS_DIR / "_common.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture
def real_common(monkeypatch):
    mod = _load_real_common()
    monkeypatch.setitem(sys.modules, "dealflow_adapters._common", mod)
    monkeypatch.setitem(sys.modules, "_common", mod)
    pkg = sys.modules.get("dealflow_adapters")
    if pkg is not None:
        # `from . import _common` resolves through the package ATTRIBUTE
        monkeypatch.setattr(pkg, "_common", mod, raising=False)
    # drop cached adapter modules so discovery re-binds them to the real
    # _common above instead of a toy one from an earlier test
    for name in list(sys.modules):
        if name.startswith("dealflow_adapters.") and not name.endswith("._common"):
            monkeypatch.delitem(sys.modules, name)
    return mod


@pytest.fixture
def capture_run(monkeypatch):
    """Stub cli.run_pipeline; record the live-gate state it would see."""
    seen = {}

    def fake_run_pipeline(**kwargs):
        import os
        seen["env"] = os.environ.get(LIVE)
        return PipelineResult(ingest=IngestResult())

    monkeypatch.setattr(cli, "run_pipeline", fake_run_pipeline)
    monkeypatch.delenv(LIVE, raising=False)
    return seen


def test_run_default_is_offline(capture_run):
    assert cli.main(["run"]) == 0
    assert capture_run["env"] is None            # gate untouched -> adapters offline


def test_run_live_flag_enables_network_gate(capture_run):
    assert cli.main(["run", "--live"]) == 0
    assert capture_run["env"] == "1"             # adapters see DEALFLOW_LIVE=1


def test_ingest_accepts_live_flag(monkeypatch, tmp_path):
    seen = {}

    def fake_run_ingest(*args, **kwargs):
        import os
        seen["env"] = os.environ.get(LIVE)
        return IngestResult()

    monkeypatch.setattr(cli, "run_ingest", fake_run_ingest)
    monkeypatch.delenv(LIVE, raising=False)
    assert cli.main(["--data-dir", str(tmp_path), "ingest", "--live"]) == 0
    assert seen["env"] == "1"


def test_network_adapters_default_to_fixtures_no_sockets(monkeypatch, real_common):
    """The real gate: with DEALFLOW_LIVE unset, every network-capable adapter
    serves its bundled fixture without opening a single socket. Works with or
    without the optional `requests` dependency installed."""
    import socket

    def _no_network(*args, **kwargs):
        raise AssertionError("adapter attempted a network connection "
                             "while offline (DEALFLOW_LIVE unset)")

    monkeypatch.delenv(LIVE, raising=False)
    monkeypatch.setattr(socket.socket, "connect", _no_network)

    from spine.ingest import discover_adapters
    modules = discover_adapters(ADAPTERS_DIR)
    for name in ("fema_disasters", "obituaries",
                 "portland_code_violations", "tax_delinquent"):
        assert name in modules, f"{name} failed to import"
        signals = modules[name].fetch()
        assert signals, f"{name} returned no fixture signals"
        assert all(s["evidence"].get("fixture_data") for s in signals), (
            f"{name} served non-fixture data in offline mode")


def test_live_env_var_semantics(monkeypatch, real_common):
    _common = real_common

    monkeypatch.delenv(LIVE, raising=False)
    assert not _common.live_enabled()
    assert _common.resolve_offline(None) is True     # default: offline
    assert _common.resolve_offline(False) is False   # explicit always wins
    assert _common.resolve_offline(True) is True

    monkeypatch.setenv(LIVE, "1")
    assert _common.live_enabled()
    assert _common.resolve_offline(None) is False    # --live: network allowed
    assert _common.resolve_offline(True) is True     # explicit still wins
