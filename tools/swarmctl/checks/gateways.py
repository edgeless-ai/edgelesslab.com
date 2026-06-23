"""
swarmctl.checks.gateways — REAL implementation
Discover and health-check all Hermes gateway launchd labels.

CONTRACT (see CONTRACT.md):
    check() -> list[GatewayHealth]
    Reads: ~/Library/LaunchAgents/ai.hermes.gateway-*.plist (active plists only)
           launchctl list / launchctl print (both gui/501 and user/501)
           psutil for process start-time
           ~/.hermes/profiles/<profile>/config.yaml for roles + platform flags
           ~/.hermes/profiles/<profile>/logs/gateway.log for connect state
    Writes: NOTHING — strictly read-only
"""
from __future__ import annotations

import glob
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import yaml

from ..types import (
    AuthState,
    GatewayHealth,
    GatewayState,
    LaunchdDomain,
    RoleStatus,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_LAUNCH_AGENTS = Path.home() / "Library" / "LaunchAgents"
_HERMES_HOME = Path.home() / ".hermes"
_HERMES_AGENT_DIR = _HERMES_HOME / "hermes-agent" / "agent"
_PROFILES_DIR = _HERMES_HOME / "profiles"

# Active plist pattern: exactly ai.hermes.gateway-<name>.plist (no suffix after .plist)
_PLIST_PATTERN = str(_LAUNCH_AGENTS / "ai.hermes.gateway-*.plist")

# Platforms to detect in logs + config
_PLATFORMS = ("discord", "telegram", "photon")

# Roles we expose in RoleStatus; includes all CONTRACT-specified roles
_KNOWN_AUXILIARY_ROLES = (
    "vision",
    "web_extract",
    "compression",
    "title_generation",
    "triage",
    "triage_specifier",
    "kanban_decomposer",
    "mcp",
    "curator",
    "skills_hub",
    "approval",
    "session_search",
    "profile_describer",
)


# ---------------------------------------------------------------------------
# Launchd probing
# ---------------------------------------------------------------------------


def _run(cmd: list[str], timeout: int = 5) -> str:
    """Run a command and return stdout; return empty string on any failure."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout
    except Exception:
        return ""


def _launchctl_list() -> dict[str, tuple[Optional[int], int]]:
    """
    Parse `launchctl list` output.
    Returns {label: (pid_or_None, last_exit_status)}.
    Format: PID\\tLastExitStatus\\tLabel  (PID = "-" when not running)
    """
    out = _run(["launchctl", "list"])
    result: dict[str, tuple[Optional[int], int]] = {}
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        pid_str, exit_str, label = parts[0].strip(), parts[1].strip(), parts[2].strip()
        if not label.startswith("ai.hermes.gateway"):
            continue
        pid: Optional[int] = None
        try:
            pid = int(pid_str)
        except ValueError:
            pid = None
        try:
            exit_code = int(exit_str)
        except ValueError:
            exit_code = 0
        result[label] = (pid, exit_code)
    return result


def _probe_domain(label: str, domain: str) -> tuple[Optional[int], Optional[str]]:
    """
    Run `launchctl print <domain>/<label>` and extract pid + state.
    Returns (pid_or_None, state_str_or_None).
    """
    out = _run(["launchctl", "print", f"{domain}/{label}"])
    if not out:
        return None, None
    # Extract pid
    pid: Optional[int] = None
    pid_match = re.search(r"^\s+pid\s*=\s*(\d+)", out, re.MULTILINE)
    if pid_match:
        pid = int(pid_match.group(1))
    # Extract state
    state: Optional[str] = None
    state_match = re.search(r"^\s*state\s*=\s*(\w+)", out, re.MULTILINE)
    if state_match:
        state = state_match.group(1)
    return pid, state


def _query_launchd(label: str) -> tuple[Optional[int], LaunchdDomain]:
    """
    Probe both gui/501 and user/501 for the given label.
    gui/501 is checked first (most gateways run there under Aqua session type).
    Returns (pid_or_None, domain_where_found).
    """
    for domain_str, domain_enum in [
        ("gui/501", LaunchdDomain.GUI),
        ("user/501", LaunchdDomain.USER),
    ]:
        pid, state = _probe_domain(label, domain_str)
        if pid is not None and state == "running":
            return pid, domain_enum
    # Not found running in either domain; fall back to launchctl list
    return None, LaunchdDomain.UNKNOWN


# ---------------------------------------------------------------------------
# Process start time
# ---------------------------------------------------------------------------


def _process_start(pid: int) -> Optional[datetime]:
    """
    Return tz-aware datetime for when the process started.
    Uses psutil if available, falls back to `ps -axo lstart -p <pid>`.
    """
    try:
        import psutil  # type: ignore

        ct = psutil.Process(pid).create_time()
        return datetime.fromtimestamp(ct, tz=timezone.utc)
    except Exception:
        pass

    # Fallback: ps -axo lstart
    out = _run(["ps", "-axo", "pid,lstart", "-p", str(pid)])
    for line in out.splitlines():
        line = line.strip()
        if not line or line.startswith("PID"):
            continue
        # Format: "   PID Mon Jun 16 12:24:33 2026"
        parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        try:
            pid_part = int(parts[0])
        except ValueError:
            continue
        if pid_part == pid:
            try:
                dt = datetime.strptime(parts[1].strip(), "%c")
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                try:
                    # macOS lstart: "Mon Jun 16 12:24:33 2026"
                    dt = datetime.strptime(parts[1].strip(), "%a %b %d %H:%M:%S %Y")
                    return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
    return None


# ---------------------------------------------------------------------------
# Code mtime
# ---------------------------------------------------------------------------


def _code_mtime() -> Optional[datetime]:
    """
    Return tz-aware mtime of the hermes-agent/agent/ directory.
    CONTRACT: use os.path.getmtime(~/.hermes/hermes-agent/agent/).
    Also walks *.py files one level deep to catch cases where dir mtime
    doesn't update (e.g. if only file contents changed via in-place edit).
    Returns the max of dir mtime and newest *.py mtime.
    """
    agent_dir = _HERMES_AGENT_DIR
    if not agent_dir.exists():
        return None
    try:
        dir_mtime = agent_dir.stat().st_mtime
        max_mtime = dir_mtime
        for py_file in agent_dir.glob("*.py"):
            try:
                fmtime = py_file.stat().st_mtime
                if fmtime > max_mtime:
                    max_mtime = fmtime
            except OSError:
                pass
        return datetime.fromtimestamp(max_mtime, tz=timezone.utc)
    except OSError:
        return None


# ---------------------------------------------------------------------------
# Config parsing
# ---------------------------------------------------------------------------


def _load_config(profile: str) -> Optional[dict]:
    """Load and parse a profile's config.yaml; return None on failure."""
    cfg_path = _PROFILES_DIR / profile / "config.yaml"
    if not cfg_path.exists():
        return None
    try:
        with cfg_path.open("r") as f:
            return yaml.safe_load(f) or {}
    except Exception:
        return None


def _config_errors(cfg: Optional[dict]) -> list[str]:
    """Return human-readable errors for a config dict (empty = valid)."""
    if cfg is None:
        return ["config.yaml missing or failed to parse"]
    errors: list[str] = []
    model = cfg.get("model")
    if not isinstance(model, dict):
        errors.append("model: missing or not a mapping")
    else:
        if not model.get("default"):
            errors.append("model.default: empty or missing")
        if not model.get("provider"):
            errors.append("model.provider: empty or missing")
    # Check fallback_model / fallback_providers for orphaned entries
    fb = cfg.get("fallback_model") or cfg.get("fallback_providers")
    if isinstance(fb, list):
        for i, entry in enumerate(fb):
            if isinstance(entry, dict) and not entry.get("provider"):
                errors.append(f"fallback_model[{i}]: missing 'provider' field (orphaned entry)")
    # Check auxiliary blocks for empty api_key when provider is not 'auto'
    auxiliary = cfg.get("auxiliary")
    if isinstance(auxiliary, dict):
        for role_name, role_cfg in auxiliary.items():
            if isinstance(role_cfg, dict):
                provider = role_cfg.get("provider", "auto")
                api_key = role_cfg.get("api_key", "")
                if provider not in ("auto", "") and not api_key:
                    errors.append(
                        f"auxiliary.{role_name}: provider='{provider}' but api_key is empty"
                    )
    return errors


def _extract_roles(cfg: Optional[dict]) -> list[RoleStatus]:
    """
    Build RoleStatus list from config dict.
    Covers: primary (model block), fallback_model, and auxiliary.* blocks.
    """
    if cfg is None:
        return []
    roles: list[RoleStatus] = []

    # Primary role from top-level model block
    model_block = cfg.get("model")
    if isinstance(model_block, dict):
        roles.append(RoleStatus(
            role="primary",
            model=model_block.get("default") or None,
            provider=model_block.get("provider") or None,
            base_url=model_block.get("base_url") or None,
            auth_state=AuthState.UNTESTED,
        ))

    # Fallback role (fallback_model is a list)
    fb = cfg.get("fallback_model") or cfg.get("fallback_providers")
    if isinstance(fb, list):
        for i, entry in enumerate(fb):
            if isinstance(entry, dict):
                roles.append(RoleStatus(
                    role="fallback" if i == 0 else f"fallback_{i}",
                    model=entry.get("model") or None,
                    provider=entry.get("provider") or None,
                    base_url=entry.get("base_url") or None,
                    auth_state=AuthState.UNTESTED,
                ))

    # Auxiliary roles
    auxiliary = cfg.get("auxiliary")
    if isinstance(auxiliary, dict):
        for role_name in _KNOWN_AUXILIARY_ROLES:
            role_cfg = auxiliary.get(role_name)
            if isinstance(role_cfg, dict):
                provider = role_cfg.get("provider") or None
                # Treat 'auto' as None for display (means "inherit primary")
                if provider == "auto":
                    provider = None
                roles.append(RoleStatus(
                    role=role_name,
                    model=role_cfg.get("model") or None,
                    provider=provider,
                    base_url=role_cfg.get("base_url") or None,
                    auth_state=AuthState.UNTESTED,
                ))

    return roles


# ---------------------------------------------------------------------------
# Platform connected state from gateway log
# ---------------------------------------------------------------------------

# Log patterns to detect connected / disconnected state per platform.
# We scan the tail of the log and take the LAST match to determine current state.
_PLATFORM_PATTERNS: dict[str, tuple[re.Pattern, re.Pattern]] = {
    "discord": (
        re.compile(r"gateway\.run.*✓ discord connected", re.IGNORECASE),
        re.compile(r"gateway\.run.*✓ discord disconnected|discord.*disconnected", re.IGNORECASE),
    ),
    "telegram": (
        re.compile(r"telegram.*polling resumed|gateway\.run.*✓ telegram connected", re.IGNORECASE),
        re.compile(r"telegram.*network error.*attempt 10|telegram.*disconnected", re.IGNORECASE),
    ),
    "photon": (
        re.compile(r"gateway\.run.*✓ photon connected|photon.*connected.*sidecar", re.IGNORECASE),
        re.compile(r"photon.*disconnected|photon.*persistently failing", re.IGNORECASE),
    ),
}

_LOG_TAIL_LINES = 500


def _is_platform_enabled(cfg: dict, plat: str) -> bool:
    """
    Check whether a platform is enabled in the config.

    Hermes config stores platform config in two shapes:
    - Top-level key (discord, telegram): {enabled: bool, ...}
    - Nested under gateway.platforms.<name>: {enabled: bool, ...}
      (photon uses the nested form; some profiles put discord/telegram top-level)
    """
    # Top-level check (discord, telegram)
    top = cfg.get(plat)
    if isinstance(top, dict):
        return bool(top.get("enabled", True))

    # Nested gateway.platforms.<plat> check (photon's canonical location)
    gw = cfg.get("gateway")
    if isinstance(gw, dict):
        platforms = gw.get("platforms")
        if isinstance(platforms, dict):
            nested = platforms.get(plat)
            if isinstance(nested, dict):
                return bool(nested.get("enabled", True))
            elif nested is not None:
                return True  # present but not a dict

    # Check platform_toolsets for photon (secondary signal)
    if plat == "photon":
        toolsets = cfg.get("platform_toolsets")
        if isinstance(toolsets, dict) and "photon" in toolsets:
            return True

    return False


def _platform_configured(cfg: dict, plat: str) -> bool:
    """Return True if this platform appears anywhere in the config."""
    if cfg.get(plat) is not None:
        return True
    gw = cfg.get("gateway")
    if isinstance(gw, dict):
        platforms = gw.get("platforms")
        if isinstance(platforms, dict) and plat in platforms:
            return True
    if plat == "photon" and isinstance(cfg.get("platform_toolsets"), dict):
        return "photon" in cfg["platform_toolsets"]
    return False


def _platform_connected(profile: str, cfg: Optional[dict]) -> Optional[dict[str, bool]]:
    """
    Determine which platforms are connected by:
    1. Checking config to see which platforms are configured and enabled.
    2. Scanning the last N lines of gateway.log for connect/disconnect events.

    Returns None if no platforms are configured (pure CLI gateway).
    Returns {platform: connected_bool} for each enabled platform.
    """
    if cfg is None:
        return None

    # Detect which platforms are configured and enabled in config.yaml
    enabled_platforms: list[str] = []
    for plat in _PLATFORMS:
        if _platform_configured(cfg, plat) and _is_platform_enabled(cfg, plat):
            enabled_platforms.append(plat)

    if not enabled_platforms:
        return None

    # Read tail of log
    log_path = _PROFILES_DIR / profile / "logs" / "gateway.log"
    log_lines: list[str] = []
    if log_path.exists():
        try:
            with log_path.open("r", errors="replace") as f:
                # Efficient tail: read last N lines
                f.seek(0, 2)
                size = f.tell()
                chunk = min(size, 65536)  # read at most 64K from end
                f.seek(max(0, size - chunk))
                log_lines = f.readlines()[-_LOG_TAIL_LINES:]
        except OSError:
            pass

    result: dict[str, bool] = {}
    for plat in enabled_platforms:
        connect_re, disconnect_re = _PLATFORM_PATTERNS[plat]
        last_conn_idx = -1
        last_disc_idx = -1
        for i, line in enumerate(log_lines):
            if connect_re.search(line):
                last_conn_idx = i
            if disconnect_re.search(line):
                last_disc_idx = i
        if last_conn_idx == -1 and last_disc_idx == -1:
            # No log evidence; assume connected if process is up (caller sets this)
            result[plat] = True
        elif last_conn_idx >= last_disc_idx:
            result[plat] = True
        else:
            result[plat] = False

    return result if result else None


# ---------------------------------------------------------------------------
# Plist discovery
# ---------------------------------------------------------------------------


def _active_plists() -> list[tuple[str, str]]:
    """
    Return list of (label, profile_name) for active gateway plists.
    Active = filename matches exactly ai.hermes.gateway-<name>.plist with no extra suffix.
    """
    results: list[tuple[str, str]] = []
    pattern = re.compile(r"^ai\.hermes\.gateway-(.+)\.plist$")
    for path_str in sorted(glob.glob(_PLIST_PATTERN)):
        fname = os.path.basename(path_str)
        m = pattern.match(fname)
        if m:
            profile = m.group(1)
            label = f"ai.hermes.gateway-{profile}"
            results.append((label, profile))
    return results


# ---------------------------------------------------------------------------
# Main check
# ---------------------------------------------------------------------------


def check() -> list[GatewayHealth]:
    """
    Return health status for all known active Hermes gateway labels.

    For each active plist file:
    - Probe gui/501 and user/501 via launchctl print for PID + domain
    - Get process start time via psutil (or ps fallback)
    - Compute code_mtime from hermes-agent/agent/ dir
    - Set STALE if code was updated after process start
    - Parse profile config.yaml for roles and platform config
    - Tail gateway.log for actual platform connection state
    """
    cm = _code_mtime()
    gateways: list[GatewayHealth] = []

    for label, profile in _active_plists():
        # Probe launchd domains
        pid, domain = _query_launchd(label)

        # Process start time
        process_start: Optional[datetime] = None
        if pid is not None:
            process_start = _process_start(pid)

        # STALE detection
        stale = False
        if cm is not None and process_start is not None:
            stale = cm > process_start

        # Determine state
        if pid is not None:
            state = GatewayState.STALE if stale else GatewayState.UP
        else:
            state = GatewayState.DOWN

        # Config parsing
        cfg = _load_config(profile)
        errors = _config_errors(cfg)
        config_valid = len(errors) == 0

        # Roles
        roles = _extract_roles(cfg)

        # Platform connected state (only meaningful when UP)
        platform_connected: Optional[dict[str, bool]] = None
        if pid is not None:
            platform_connected = _platform_connected(profile, cfg)

        gateways.append(GatewayHealth(
            launchd_label=label,
            profile=profile,
            domain=domain,
            pid=pid,
            state=state,
            process_start=process_start,
            code_mtime=cm,
            stale=stale,
            config_valid=config_valid,
            config_errors=errors,
            roles=roles,
            platform_connected=platform_connected,
        ))

    return gateways


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    results = check()
    print(f"Found {len(results)} active gateway(s):\n")
    for gw in results:
        pid_str = str(gw.pid) if gw.pid else "—"
        stale_flag = " [STALE]" if gw.stale else ""
        cfg_flag = "" if gw.config_valid else " [CONFIG-ERR]"
        ps_str = (
            gw.process_start.strftime("%Y-%m-%d %H:%M:%S UTC")
            if gw.process_start
            else "—"
        )
        cm_str = (
            gw.code_mtime.strftime("%Y-%m-%d %H:%M:%S UTC")
            if gw.code_mtime
            else "—"
        )
        plat_str = (
            json.dumps(gw.platform_connected)
            if gw.platform_connected is not None
            else "—"
        )
        print(
            f"  {gw.launchd_label:<45}  "
            f"state={gw.state.value:<8}  "
            f"domain={gw.domain.value:<10}  "
            f"pid={pid_str:<8}"
            f"{stale_flag}{cfg_flag}"
        )
        print(f"    started={ps_str}  code_mtime={cm_str}")
        print(f"    platforms={plat_str}")
        role_summary = ", ".join(
            f"{r.role}({r.provider or 'auto'})" for r in gw.roles[:4]
        )
        if len(gw.roles) > 4:
            role_summary += f" +{len(gw.roles) - 4} more"
        print(f"    roles={role_summary}")
        if gw.config_errors:
            for e in gw.config_errors:
                print(f"    CONFIG ERR: {e}")
        print()
