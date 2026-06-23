"""
swarmctl.checks.system — Host resource snapshot + venv integrity check.

CONTRACT (see CONTRACT.md):
    check() -> SystemStatus
    Reads: psutil.getloadavg(), psutil.virtual_memory(), psutil.swap_memory()
    Writes: NOTHING

    check_venv(py: str) -> tuple[bool, list[str]]
    Reads: importable state of required packages via subprocess
    Writes: NOTHING
"""
from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime, timezone
from typing import Optional

import psutil

from ..types import SystemStatus

# Packages that must be importable inside the Hermes venv.
# Keys are the import name; values are human-readable package identifiers for
# error messages (i.e., the pip install name, not the import name).
_REQUIRED_IMPORTS: dict[str, str] = {
    "telegram": "python-telegram-bot",
    "discord": "discord.py",
    "yaml": "PyYAML",
    "requests": "requests",
    "opentelemetry": "opentelemetry-sdk",
}

# Default venv python; callers may override via check_venv(py=...).
_HERMES_PYTHON = "/Users/djm/.hermes/hermes-agent/venv/bin/python"


def check() -> SystemStatus:
    """
    Return an instantaneous host resource snapshot.

    Reads psutil for load average, virtual memory, and swap.  All values are
    instantaneous — no averaging window beyond what the OS already provides for
    load average.
    """
    load1, load5, load15 = psutil.getloadavg()
    cpu_count: int = os.cpu_count() or 1
    load_per_cpu: float = load1 / cpu_count

    vm = psutil.virtual_memory()
    # psutil returns bytes; convert to MiB (1 MiB = 2^20 bytes).
    _mib = 1024.0 * 1024.0
    ram_total_mb = vm.total / _mib
    ram_free_mb = vm.available / _mib  # 'available' includes reclaimable caches

    sw = psutil.swap_memory()
    swap_total_mb = sw.total / _mib
    swap_used_mb = sw.used / _mib

    return SystemStatus(
        load_avg_1m=load1,
        load_avg_5m=load5,
        load_avg_15m=load15,
        swap_used_mb=swap_used_mb,
        swap_total_mb=swap_total_mb,
        ram_free_mb=ram_free_mb,
        ram_total_mb=ram_total_mb,
        cpu_count=cpu_count,
        load_per_cpu=load_per_cpu,
        sampled_at=datetime.now(timezone.utc),
    )


def check_venv(py: Optional[str] = None) -> tuple[bool, list[str]]:
    """
    Verify that all required packages are importable inside the Hermes venv.

    Each import is probed with a fresh subprocess so that the caller's own
    sys.path cannot mask a missing package.  This is intentionally READ-ONLY —
    it never installs, upgrades, or modifies the venv.

    Args:
        py: Path to the Python interpreter to test.  Defaults to
            _HERMES_PYTHON.

    Returns:
        (venv_ok, venv_issues) where venv_ok is True iff all imports succeed
        and venv_issues lists "<import_name> (install: <pip_name>)" for each
        missing package.
    """
    interpreter = py or _HERMES_PYTHON
    missing: list[str] = []

    for import_name, pip_name in _REQUIRED_IMPORTS.items():
        result = subprocess.run(
            [interpreter, "-c", f"import {import_name}"],
            capture_output=True,
            timeout=10,
        )
        if result.returncode != 0:
            missing.append(f"{import_name} (install: {pip_name})")

    return (len(missing) == 0, missing)


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    status = check()
    venv_ok, venv_issues = check_venv()

    print("=== SystemStatus ===")
    print(f"  load_avg      : {status.load_avg_1m:.2f} / {status.load_avg_5m:.2f} / {status.load_avg_15m:.2f} (1m/5m/15m)")
    print(f"  cpu_count     : {status.cpu_count}")
    print(f"  load_per_cpu  : {status.load_per_cpu:.3f}")
    print(f"  ram_free_mb   : {status.ram_free_mb:.1f} / {status.ram_total_mb:.1f} MiB")
    print(f"  swap_used_mb  : {status.swap_used_mb:.1f} / {status.swap_total_mb:.1f} MiB")
    print(f"  sampled_at    : {status.sampled_at.isoformat()}")

    print()
    print("=== Venv Integrity ===")
    print(f"  venv_ok       : {venv_ok}")
    if venv_issues:
        print("  missing packages:")
        for issue in venv_issues:
            print(f"    - {issue}")
    else:
        print("  all required packages importable")
