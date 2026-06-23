"""
swarmctl.checks.providers — Provider canary probe panel.

CONTRACT (see CONTRACT.md):
    check() -> list[ProviderStatus]
    One entry per distinct (provider_name, base_url, api_key_prefix) triple
    discovered across all active profile configs and auth.json.

READ-ONLY RULE: This module MAY make tiny 1-token canary HTTP calls (one per
distinct triple, 60s TTL cache). It must NEVER write to ~/.hermes or modify any
config file. Cache state is kept in memory only (no disk writes).

Logic:
  1. Walk ~/Library/LaunchAgents/ai.hermes.gateway-*.plist to find active profiles.
  2. For each active profile, parse ~/.hermes/profiles/<profile>/config.yaml.
  3. Extract (base_url, api_key, provider) from:
       model block, fallback_model list, fallback_providers list, auxiliary.* blocks.
  4. For provider=="nous" (with no api_key): read agent_key from ~/.hermes/auth.json.
  5. Deduplicate by (base_url, api_key[:8]).
  6. For each unique pair: POST a 1-token chat completion (max_tokens=1), time it.
  7. Cache result for 60s (module-level dict, no disk writes).
  8. NEVER log or return full API keys — only first 8 chars (or "<oauth>" for tokens).
"""
from __future__ import annotations

import glob
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests
import yaml

from ..types import ProviderState, ProviderStatus

# ---------------------------------------------------------------------------
# Module-level 60s TTL cache
# key = (base_url, api_key_prefix), value = (ProviderStatus, monotonic_time)
# ---------------------------------------------------------------------------

_CACHE: dict[tuple[str, str], tuple[ProviderStatus, float]] = {}

_CACHE_TTL = 60.0
_PROBE_TIMEOUT = 15  # seconds; keeps the check snappy
_NOUS_INFERENCE_BASE = "https://inference-api.nousresearch.com/v1"

# Map well-known base_url substrings → canonical provider display names.
# Applied when config says provider="custom" but the URL identifies the real service.
_URL_PROVIDER_MAP: list[tuple[str, str]] = [
    ("integrate.api.nvidia.com", "nvidia"),
    ("nousresearch.com", "nous"),
    ("openrouter.ai", "openrouter"),
    ("openai.com", "openai"),
    ("api.together.xyz", "together"),
    ("fireworks.ai", "fireworks"),
    ("cerebras.ai", "cerebras"),
]


def _canonical_provider(provider: str, base_url: str) -> str:
    """Return a human-friendly provider name.

    When the config says 'custom' we try to identify the real service from
    the base_url so the canary panel shows 'nvidia' instead of 'custom'.
    """
    if provider not in ("custom", "", None):
        return provider
    for fragment, canonical in _URL_PROVIDER_MAP:
        if fragment in base_url:
            return canonical
    return provider or "custom"

# Minimal chat request body — max_tokens=1 to minimise cost/latency
_CANARY_BODY = {
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 1,
}


# ---------------------------------------------------------------------------
# Active profile discovery
# ---------------------------------------------------------------------------

def _active_profiles() -> list[str]:
    """Return profile names from active gateway plists only.

    Active = filename matches exactly ai.hermes.gateway-<name>.plist with no
    extra suffix (.disabled, .bak, date suffixes, etc.).
    """
    pattern = str(Path.home() / "Library/LaunchAgents/ai.hermes.gateway-*.plist")
    profiles: list[str] = []
    for path in glob.glob(pattern):
        fname = os.path.basename(path)
        # Must match exactly: ai.hermes.gateway-<name>.plist
        m = re.fullmatch(r"ai\.hermes\.gateway-([^.]+)\.plist", fname)
        if m:
            profiles.append(m.group(1))
    return profiles


# ---------------------------------------------------------------------------
# Config parsing helpers
# ---------------------------------------------------------------------------

def _load_config(profile: str) -> Optional[dict[str, Any]]:
    """Load and return ~/.hermes/profiles/<profile>/config.yaml, or None on failure."""
    cfg_path = Path.home() / ".hermes" / "profiles" / profile / "config.yaml"
    if not cfg_path.exists():
        return None
    try:
        with open(cfg_path) as fh:
            return yaml.safe_load(fh) or {}
    except (yaml.YAMLError, OSError):
        return None


def _load_nous_agent_key() -> Optional[str]:
    """Read the Nous agent_key from ~/.hermes/auth.json (read-only). Returns None on failure."""
    auth_path = Path.home() / ".hermes" / "auth.json"
    if not auth_path.exists():
        return None
    try:
        with open(auth_path) as fh:
            data = json.load(fh)
        return data.get("providers", {}).get("nous", {}).get("agent_key") or None
    except (OSError, json.JSONDecodeError, KeyError):
        return None


# ---------------------------------------------------------------------------
# Tuple extraction from config blocks
# ---------------------------------------------------------------------------

def _extract_from_block(
    block: Any,
    default_provider: Optional[str] = None,
) -> Optional[tuple[str, str, str]]:
    """Extract (base_url, api_key, provider) from a model/aux config block dict.

    Returns None if block is not a dict or lacks base_url.
    """
    if not isinstance(block, dict):
        return None
    base_url = block.get("base_url") or ""
    if not base_url:
        return None
    api_key = block.get("api_key") or ""
    raw_provider = block.get("provider") or default_provider or "custom"
    provider = _canonical_provider(raw_provider, base_url)
    return (base_url.rstrip("/"), api_key, provider)


def _gather_tuples(config: dict[str, Any]) -> list[tuple[str, str, str]]:
    """Walk all provider blocks in a config, return (base_url, api_key, provider) tuples."""
    results: list[tuple[str, str, str]] = []

    # model block
    t = _extract_from_block(config.get("model"))
    if t:
        results.append(t)

    # fallback_model — list of dicts
    for item in config.get("fallback_model") or []:
        t = _extract_from_block(item)
        if t:
            results.append(t)

    # fallback_providers — list of dicts; base_url may be absent (nous entries)
    for item in config.get("fallback_providers") or []:
        if not isinstance(item, dict):
            continue
        provider = item.get("provider") or "custom"
        base_url = item.get("base_url") or ""
        api_key = item.get("api_key") or ""
        # For nous entries without base_url, use the known inference endpoint
        if provider == "nous" and not base_url:
            base_url = _NOUS_INFERENCE_BASE
        if base_url:
            canonical = _canonical_provider(provider, base_url)
            results.append((base_url.rstrip("/"), api_key, canonical))

    # auxiliary.* blocks
    auxiliary = config.get("auxiliary")
    if isinstance(auxiliary, dict):
        for role_name, role_block in auxiliary.items():
            # Skip "auto" provider blocks — they inherit dynamically
            if isinstance(role_block, dict) and role_block.get("provider") == "auto":
                continue
            t = _extract_from_block(role_block)
            if t:
                results.append(t)

    return results


# ---------------------------------------------------------------------------
# Canary probe
# ---------------------------------------------------------------------------

def _key_prefix(api_key: str, provider: str) -> str:
    """Return display-safe key prefix.

    - Nous always uses '<oauth>' (Bearer JWT from auth.json, never a raw key).
    - Missing key on non-nous providers returns '<nokey>'.
    - Otherwise first 8 chars of the api_key string.
    """
    if provider == "nous":
        return "<oauth>"
    if not api_key:
        return "<nokey>"
    return api_key[:8]


def _infer_model(base_url: str, provider: str) -> str:
    """Pick a cheap canary model based on base_url / provider heuristics."""
    if "nvidia" in base_url:
        return "meta/llama-3.3-70b-instruct"
    if "nousresearch" in base_url:
        return "stepfun/step-3.7-flash:free"
    if "openai" in base_url:
        return "gpt-4o-mini"
    if "openrouter" in base_url:
        return "meta-llama/llama-3.1-8b-instruct:free"
    return "gpt-3.5-turbo"


def _probe_provider(
    base_url: str,
    api_key: str,
    provider: str,
) -> ProviderStatus:
    """
    POST a 1-token chat completion to base_url. Returns a ProviderStatus.
    NEVER logs or embeds the full api_key.
    """
    key_prefix = _key_prefix(api_key, provider)
    model = _infer_model(base_url, provider)
    body = {**_CANARY_BODY, "model": model}
    headers = {"Content-Type": "application/json"}

    # Build auth header — Nous uses Bearer JWT (agent_key), others use Bearer api_key
    if provider == "nous" or key_prefix == "<oauth>":
        nous_key = _load_nous_agent_key()
        if nous_key:
            headers["Authorization"] = f"Bearer {nous_key}"
        else:
            return ProviderStatus(
                provider=provider,
                base_url=base_url,
                api_key_prefix=key_prefix,
                state=ProviderState.UNKNOWN,
                http_status=None,
                error_detail="nous agent_key not found in auth.json",
                cached=False,
                probed_at=datetime.now(timezone.utc),
            )
    elif api_key and not api_key.startswith("${"):
        # Valid literal key
        headers["Authorization"] = f"Bearer {api_key}"
    elif api_key.startswith("${"):
        # Unresolved env-var placeholder — skip probe, report clearly
        var_name = api_key[2:-1] if api_key.endswith("}") else api_key
        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=ProviderState.UNKNOWN,
            http_status=None,
            error_detail=f"api_key is unresolved env var: {var_name}",
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )
    else:
        # No key available — mark as unknown, don't make an unauthenticated call
        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=ProviderState.UNKNOWN,
            http_status=None,
            error_detail="no api_key available for this provider",
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )

    url = f"{base_url}/chat/completions"
    t0 = time.monotonic()
    http_status: Optional[int] = None
    error_detail: Optional[str] = None
    state = ProviderState.DOWN

    try:
        resp = requests.post(
            url,
            json=body,
            headers=headers,
            timeout=_PROBE_TIMEOUT,
        )
        http_status = resp.status_code
        latency_s = time.monotonic() - t0

        if resp.status_code == 200:
            if latency_s > 30.0:
                state = ProviderState.DEGRADED
            else:
                state = ProviderState.LIVE
        elif resp.status_code in (401, 403):
            state = ProviderState.DOWN
            # Extract error message without leaking key material
            try:
                body_json = resp.json()
                msg = (
                    body_json.get("error", {}).get("message")
                    or body_json.get("message")
                    or resp.text[:120]
                )
                # Sanitise — strip anything that looks like a key/token
                msg = re.sub(r"(Bearer|sk-|nvapi-|eyJ)\S+", "<redacted>", str(msg))
                error_detail = msg[:200]
            except Exception:
                error_detail = f"HTTP {resp.status_code}"
        elif resp.status_code == 429:
            state = ProviderState.DEGRADED
            error_detail = "rate limited"
        else:
            state = ProviderState.DOWN
            error_detail = f"HTTP {resp.status_code}"

        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=state,
            latency_s=latency_s if http_status == 200 else None,
            http_status=http_status,
            error_detail=error_detail,
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )

    except requests.exceptions.Timeout:
        latency_s = time.monotonic() - t0
        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=ProviderState.DOWN,
            latency_s=latency_s,
            http_status=None,
            error_detail=f"timeout after {latency_s:.1f}s",
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )
    except requests.exceptions.ConnectionError as exc:
        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=ProviderState.DOWN,
            latency_s=None,
            http_status=None,
            error_detail=f"connection error: {type(exc).__name__}",
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )
    except Exception as exc:  # noqa: BLE001
        return ProviderStatus(
            provider=provider,
            base_url=base_url,
            api_key_prefix=key_prefix,
            state=ProviderState.DOWN,
            latency_s=None,
            http_status=None,
            error_detail=f"unexpected error: {type(exc).__name__}",
            cached=False,
            probed_at=datetime.now(timezone.utc),
        )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def check() -> list[ProviderStatus]:
    """
    Return canary probe results for all distinct (provider, base_url, api_key_prefix)
    triples found across all active Hermes profile configs.

    Uses a 60s in-memory TTL cache to avoid hammering providers on repeated calls.
    Never logs or embeds full API keys — only the first 8 characters are stored.
    """
    profiles = _active_profiles()

    # Gather all (base_url, api_key, provider) tuples from every active profile
    raw_tuples: list[tuple[str, str, str]] = []
    for profile in profiles:
        config = _load_config(profile)
        if config:
            raw_tuples.extend(_gather_tuples(config))

    # Deduplicate by (base_url, api_key[:8])
    seen: dict[tuple[str, str], tuple[str, str, str]] = {}
    for base_url, api_key, provider in raw_tuples:
        key_prefix = _key_prefix(api_key, provider)
        dedup_key = (base_url, key_prefix)
        if dedup_key not in seen:
            seen[dedup_key] = (base_url, api_key, provider)

    results: list[ProviderStatus] = []
    now_mono = time.monotonic()

    for (base_url, key_prefix), (bu, api_key, provider) in seen.items():
        cache_key = (base_url, key_prefix)

        # Check cache
        if cache_key in _CACHE:
            cached_status, cache_time = _CACHE[cache_key]
            if now_mono - cache_time < _CACHE_TTL:
                # Return cached result with cached=True
                results.append(
                    ProviderStatus(
                        provider=cached_status.provider,
                        base_url=cached_status.base_url,
                        api_key_prefix=cached_status.api_key_prefix,
                        state=cached_status.state,
                        latency_s=cached_status.latency_s,
                        http_status=cached_status.http_status,
                        error_detail=cached_status.error_detail,
                        cached=True,
                        probed_at=cached_status.probed_at,
                    )
                )
                continue

        # Probe live
        status = _probe_provider(bu, api_key, provider)
        _CACHE[cache_key] = (status, now_mono)
        results.append(status)

    return results


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    print("swarmctl providers smoke test")
    print(f"Python: {sys.version}")
    print()

    profiles = _active_profiles()
    print(f"Active gateway profiles discovered: {profiles}")
    print()

    statuses = check()
    print(f"Provider entries found: {len(statuses)}")
    print()

    for ps in statuses:
        cached_tag = " [cached]" if ps.cached else ""
        latency_tag = f" {ps.latency_s:.2f}s" if ps.latency_s is not None else ""
        err_tag = f" err={ps.error_detail!r}" if ps.error_detail else ""
        print(
            f"  {ps.provider:20s}  {ps.base_url:50s}  "
            f"key={ps.api_key_prefix!r:12s}  "
            f"state={ps.state.value:8s}  "
            f"http={ps.http_status}{latency_tag}{err_tag}{cached_tag}"
        )

    print()
    print("Second call (should hit cache):")
    statuses2 = check()
    cached_count = sum(1 for s in statuses2 if s.cached)
    print(f"  {cached_count}/{len(statuses2)} entries served from cache")

    print()
    print("Smoke test complete — no errors raised.")
