"""
swarmctl.types — canonical dataclasses for the Phase 1 observability layer.

All check modules must return instances of these types. Fields marked Optional
may be None when data is unavailable (gateway offline, config parse error, etc.).

See CONTRACT.md for the implementer contract.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class GatewayState(str, Enum):
    UP = "up"
    DOWN = "down"
    STALE = "stale"   # PID running but code mtime newer than process start
    UNKNOWN = "unknown"


class AuthState(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    UNKNOWN = "unknown"
    UNTESTED = "untested"


class ProviderState(str, Enum):
    LIVE = "live"
    DEGRADED = "degraded"  # slow (>30s) but responding
    DOWN = "down"           # HTTP error or timeout
    UNKNOWN = "unknown"
    UNCHECKED = "unchecked"  # cache skip / not yet probed


class LaunchdDomain(str, Enum):
    GUI = "gui/501"
    USER = "user/501"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Per-role provider config
# ---------------------------------------------------------------------------


@dataclass
class RoleStatus:
    """Status of one named role within a gateway (primary, vision, compression, etc.)."""
    role: str                              # e.g. "primary", "vision", "fallback"
    model: Optional[str] = None           # concrete model string from config
    provider: Optional[str] = None        # provider name from config
    base_url: Optional[str] = None
    auth_state: AuthState = AuthState.UNTESTED
    last_latency_s: Optional[float] = None  # latency of last real call (None = never)


# ---------------------------------------------------------------------------
# Per-(provider, auth) canary probe
# ---------------------------------------------------------------------------


@dataclass
class ProviderStatus:
    """
    Result of a canary probe for one distinct (provider, base_url, api_key_prefix) triple.
    One entry per unique combination seen across all profiles.
    """
    provider: str                         # logical name, e.g. "nvidia", "nous", "openai-codex"
    base_url: str
    api_key_prefix: str                   # first 8 chars of key for display (never full key)
    state: ProviderState = ProviderState.UNCHECKED
    latency_s: Optional[float] = None
    http_status: Optional[int] = None
    error_detail: Optional[str] = None   # short error string, safe for display
    cached: bool = False                  # True if result came from 60s TTL cache
    probed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Per-gateway health
# ---------------------------------------------------------------------------


@dataclass
class GatewayHealth:
    """
    Full health snapshot for one Hermes gateway (one launchd label).

    launchd_label  — e.g. "ai.hermes.gateway-hive"
    profile        — profile name, e.g. "hive"
    domain         — which launchd domain owns the running instance
    pid            — OS PID of the running gateway process (None = not running)
    state          — UP / DOWN / STALE / UNKNOWN
    process_start  — datetime when the process started (None = not running)
    code_mtime     — mtime of the hermes-agent package dir (used for STALE check)
    stale          — True if code_mtime > process_start (stale module risk)
    config_valid   — True if config.yaml parsed without errors
    config_errors  — list of human-readable config problems found
    roles          — per-role status (primary, fallback, vision, …)
    platform_connected — {"discord": True, "telegram": False, …} (None = not applicable)
    """
    launchd_label: str
    profile: str
    domain: LaunchdDomain = LaunchdDomain.UNKNOWN
    pid: Optional[int] = None
    state: GatewayState = GatewayState.UNKNOWN
    process_start: Optional[datetime] = None
    code_mtime: Optional[datetime] = None
    stale: bool = False
    config_valid: bool = True
    config_errors: list[str] = field(default_factory=list)
    roles: list[RoleStatus] = field(default_factory=list)
    platform_connected: Optional[dict[str, bool]] = None


# ---------------------------------------------------------------------------
# System-level resource snapshot
# ---------------------------------------------------------------------------


@dataclass
class SystemStatus:
    """Host-level resources at snapshot time."""
    load_avg_1m: float = 0.0
    load_avg_5m: float = 0.0
    load_avg_15m: float = 0.0
    swap_used_mb: float = 0.0
    swap_total_mb: float = 0.0
    ram_free_mb: float = 0.0
    ram_total_mb: float = 0.0
    cpu_count: int = 1
    # load relative to CPU count; >1.0 means overloaded
    load_per_cpu: float = 0.0
    sampled_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Top-level report
# ---------------------------------------------------------------------------


@dataclass
class Report:
    """
    Full observability report assembled by cli.py.

    gateways        — one GatewayHealth per known launchd label
    providers       — one ProviderStatus per distinct (provider, base_url, key) seen
    system          — host resource snapshot
    venv_ok         — True if all required venv packages are importable
    venv_issues     — list of missing-package strings
    generated_at    — when this report was assembled
    warnings        — list of human-readable cross-cutting warnings
    """
    gateways: list[GatewayHealth] = field(default_factory=list)
    providers: list[ProviderStatus] = field(default_factory=list)
    system: Optional[SystemStatus] = None
    venv_ok: bool = True
    venv_issues: list[str] = field(default_factory=list)
    generated_at: Optional[datetime] = None
    warnings: list[str] = field(default_factory=list)
