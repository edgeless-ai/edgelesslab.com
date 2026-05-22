#!/usr/bin/env python3
"""
Provider Health Probe — EDGA-4259

Tests all 5 LLM/API providers concurrently in <3 seconds.
Validates that fallback_model resolves to a DIFFERENT provider than primary.

Providers:
  1. fireworks    — api.fireworks.ai      (primary swarm LLM)
  2. openrouter   — openrouter.ai         (fallback routing)
  3. openai       — api.openai.com        (Codex / Kilo)
  4. anthropic    — api.anthropic.com     (direct Claude access)
  5. nous         — api.nousresearch.com  (Hermes tools — documented dead)

Usage:
  python provider_health_probe.py                # human summary
  python provider_health_probe.py --json         # machine output for cron
  python provider_health_probe.py --validate-fallback   # check Hermes config
  python provider_health_probe.py --deep         # chat-completion probes (costs tokens)

Exit codes:
  0 — all healthy
  1 — one or more providers unhealthy
  2 — credential pool exhaustion (>=3 down) or fallback same-as-primary
"""

import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Literal, Optional

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROBE_TIMEOUT_SEC = 2.5
MAX_TOTAL_SEC = 3.0

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/Users/djm/.hermes"))
HERMES_CONFIG = HERMES_HOME / "config.yaml"
PROJECT_ENV = Path("/Users/djm/claude-projects/.env")

# Provider registry: name -> test specification
PROVIDERS: List[Dict] = [
    {
        "name": "fireworks",
        "label": "Fireworks AI",
        "key_env": "FIREWORKS_API_KEY",
        "base_url": "https://api.fireworks.ai/inference/v1",
        "endpoint": "/models",
        "auth_header": "Authorization: Bearer {key}",
        "deep_model": "accounts/fireworks/routers/kimi-k2p6-turbo",
    },
    {
        "name": "openrouter",
        "label": "OpenRouter",
        "key_env": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
        "endpoint": "/models",
        "auth_header": "Authorization: Bearer {key}",
        "deep_model": "openai/gpt-3.5-turbo",
    },
    {
        "name": "openai",
        "label": "OpenAI",
        "key_env": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "endpoint": "/models",
        "auth_header": "Authorization: Bearer {key}",
        "deep_model": "gpt-4o-mini",
    },
    {
        "name": "anthropic",
        "label": "Anthropic",
        "key_env": "ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com/v1",
        "endpoint": "/models",
        "auth_header": "x-api-key: {key}",
        "extra_headers": ["anthropic-version: 2023-06-01"],
        "deep_model": "claude-3-5-haiku-20241022",
    },
    {
        "name": "nous",
        "label": "Nous / StepFun",
        "key_env": None,
        "base_url": "https://api.nousresearch.com/v1",
        "endpoint": "/models",
        "auth_header": None,
        "expected_dead": True,
    },
]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ProviderResult:
    name: str
    label: str
    healthy: bool
    latency_ms: float
    status_code: Optional[int] = None
    error: Optional[str] = None
    deep_probe: bool = False

    def to_dict(self):
        return asdict(self)


@dataclass
class FallbackValidation:
    primary_model: str
    fallback_model: str
    primary_provider: str
    fallback_provider: str
    valid: bool
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Low-level probe
# ---------------------------------------------------------------------------

def _curl_probe(url: str, headers: List[str], timeout: float = PROBE_TIMEOUT_SEC) -> tuple:
    """Return (ok, status_code, error_or_body, latency_ms)."""
    cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", str(timeout)]
    for h in headers:
        cmd += ["-H", h]
    cmd += [url]

    start = time.monotonic()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 1)
        latency_ms = (time.monotonic() - start) * 1000
        code_str = result.stdout.strip()
        try:
            code = int(code_str)
        except ValueError:
            code = 0
        ok = 200 <= code < 300
        return ok, code, None, latency_ms
    except subprocess.TimeoutExpired:
        latency_ms = (time.monotonic() - start) * 1000
        return False, 0, "timeout", latency_ms
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        return False, 0, str(e), latency_ms


def _deep_chat_probe(base_url: str, model: str, headers: List[str], timeout: float = PROBE_TIMEOUT_SEC) -> tuple:
    """Send a minimal chat completion. Return (ok, error, latency_ms)."""
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "Say exactly the word 'ok' and nothing else."}],
        "max_tokens": 5,
    }
    url = f"{base_url.rstrip('/')}/chat/completions"
    cmd = ["curl", "-s", "--max-time", str(timeout + 2), "-H", "Content-Type: application/json"]
    for h in headers:
        cmd += ["-H", h]
    cmd += ["-d", json.dumps(payload), url]

    start = time.monotonic()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 3)
        latency_ms = (time.monotonic() - start) * 1000
        if result.returncode != 0:
            return False, f"curl error: {result.stderr}", latency_ms
        try:
            resp = json.loads(result.stdout)
        except json.JSONDecodeError:
            return False, f"non-JSON response: {result.stdout[:200]}", latency_ms
        if "error" in resp:
            return False, str(resp["error"]), latency_ms
        content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
        ok = bool(content)
        return ok, None if ok else f"empty response content", latency_ms
    except subprocess.TimeoutExpired:
        latency_ms = (time.monotonic() - start) * 1000
        return False, "timeout", latency_ms
    except Exception as e:
        latency_ms = (time.monotonic() - start) * 1000
        return False, str(e), latency_ms


def _resolve_api_key(key_env: Optional[str]) -> Optional[str]:
    if not key_env:
        return None
    # 1. process env
    val = os.environ.get(key_env)
    if val:
        return val
    # 2. project .env
    if PROJECT_ENV.exists():
        for line in PROJECT_ENV.read_text().splitlines():
            if line.startswith(f"{key_env}="):
                return line.split("=", 1)[1].strip().strip('"')
    return None


def _probe_one_provider(spec: Dict, deep: bool = False) -> ProviderResult:
    """Test a single provider."""
    name = spec["name"]
    label = spec["label"]
    base_url = spec["base_url"]
    endpoint = spec.get("endpoint", "/models")
    key_env = spec.get("key_env")
    auth_header_template = spec.get("auth_header")
    extra_headers = spec.get("extra_headers", [])
    expected_dead = spec.get("expected_dead", False)
    key = _resolve_api_key(key_env)

    url = f"{base_url.rstrip('/')}{endpoint}"
    headers = []
    if auth_header_template and key:
        headers.append(auth_header_template.format(key=key))
    for h in extra_headers:
        headers.append(h)

    ok, code, error, latency_ms = _curl_probe(url, headers)

    # If dead provider is confirmed dead (non-2xx), report as "expected" but still unhealthy
    if expected_dead:
        if not ok:
            return ProviderResult(
                name=name, label=label, healthy=False, latency_ms=round(latency_ms, 1),
                status_code=code, error="confirmed dead (expected)",
            )
        else:
            return ProviderResult(
                name=name, label=label, healthy=True, latency_ms=round(latency_ms, 1),
                status_code=code, error="unexpectedly alive — review runbook",
            )

    if not ok:
        return ProviderResult(
            name=name, label=label, healthy=False, latency_ms=round(latency_ms, 1),
            status_code=code, error=error or f"HTTP {code}",
        )

    # Deep probe: actually run inference
    if deep and spec.get("deep_model"):
        deep_ok, deep_err, deep_latency = _deep_chat_probe(base_url, spec["deep_model"], headers)
        return ProviderResult(
            name=name, label=label, healthy=deep_ok, latency_ms=round(deep_latency, 1),
            status_code=code, error=deep_err, deep_probe=True,
        )

    return ProviderResult(
        name=name, label=label, healthy=True, latency_ms=round(latency_ms, 1),
        status_code=code,
    )


# ---------------------------------------------------------------------------
# Fallback validation
# ---------------------------------------------------------------------------

def _provider_from_model(model: str) -> str:
    """Infer provider slug from model identifier."""
    if not model:
        return "unknown"
    m = model.lower()
    if m.startswith("accounts/fireworks"):
        return "fireworks"
    if m.startswith("openrouter/"):
        return "openrouter"
    if m.startswith("gpt-") or m.startswith("o1") or m.startswith("o3") or m.startswith("text-"):
        return "openai"
    if m.startswith("claude-"):
        return "anthropic"
    if "nous" in m or "stepfun" in m:
        return "nous"
    if m.startswith("gemini-"):
        return "gemini"
    return "unknown"


def _read_hermes_primary_model() -> str:
    """Read primary model from Hermes config.yaml (naive parser)."""
    if not HERMES_CONFIG.exists():
        return ""
    in_model_block = False
    model = ""
    for line in HERMES_CONFIG.read_text().splitlines():
        stripped = line.strip()
        if stripped.startswith("model:") and not stripped.startswith("model:"):
            pass
        if stripped == "model:":
            in_model_block = True
            continue
        if in_model_block:
            if stripped.startswith("default:"):
                model = stripped.split(":", 1)[1].strip().strip('"')
            if stripped.startswith("locked:"):
                break
    return model


def validate_fallback() -> FallbackValidation:
    """Validate that fallback model is on a DIFFERENT provider than primary."""
    import yaml
    config_path = HERMES_CONFIG
    if not config_path.exists():
        return FallbackValidation(
            primary_model="unknown", fallback_model="unknown",
            primary_provider="unknown", fallback_provider="unknown",
            valid=False, reason="Hermes config not found",
        )
    with open(config_path, "r") as f:
        cfg = yaml.safe_load(f)

    primary = cfg.get("model", {}).get("default", "unknown")
    primary_provider = cfg.get("model", {}).get("provider", "") or _provider_from_model(primary)
    primary_base = cfg.get("model", {}).get("base_url", "")

    fallbacks = cfg.get("fallback_providers", [])
    if not fallbacks:
        # Try legacy fallback_model field
        fb_cfg = cfg.get("fallback_model", {})
        if fb_cfg:
            fallback = fb_cfg.get("model", "unknown")
            fallback_provider = fb_cfg.get("provider", "") or _provider_from_model(fallback)
            fallback_base = fb_cfg.get("base_url", "")
        else:
            return FallbackValidation(
                primary_model=primary, fallback_model="none",
                primary_provider=primary_provider, fallback_provider="none",
                valid=False, reason="No fallback_providers or fallback_model configured",
            )
    else:
        fb = fallbacks[0]
        fallback = fb.get("model", "unknown")
        fallback_provider = fb.get("provider", "") or _provider_from_model(fallback)
        fallback_base = fb.get("base_url", "")

    # If both are 'custom', compare base_url to detect same cloud endpoint
    same_provider = (fallback_provider == primary_provider)
    same_endpoint = (fallback_provider == "custom" and primary_provider == "custom" and fallback_base == primary_base)
    valid = not same_provider and not same_endpoint and primary_provider != "unknown" and fallback_provider != "unknown"

    reason = None
    if not valid:
        if same_endpoint:
            reason = f"primary ({primary_provider}) and fallback ({fallback_provider}) use SAME base_url ({primary_base})"
        elif same_provider:
            reason = f"primary ({primary_provider}) and fallback ({fallback_provider}) resolve to SAME provider identifier"
        else:
            reason = "fallback validation failed"

    return FallbackValidation(
        primary_model=primary,
        fallback_model=fallback,
        primary_provider=primary_provider,
        fallback_provider=fallback_provider,
        valid=valid,
        reason=reason,
    )


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_probe(deep: bool = False) -> tuple[List[ProviderResult], float]:
    """Run all provider probes concurrently. Must complete in <3s."""
    start = time.monotonic()
    results: List[ProviderResult] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_probe_one_provider, spec, deep): spec for spec in PROVIDERS}
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result(timeout=PROBE_TIMEOUT_SEC + 1))
            except Exception as e:
                spec = futures[future]
                results.append(ProviderResult(
                    name=spec["name"], label=spec["label"],
                    healthy=False, latency_ms=0.0, error=f"probe crashed: {e}",
                ))

    elapsed = time.monotonic() - start
    return results, elapsed


def determine_exit_code(results: List[ProviderResult], fallback_valid: bool) -> int:
    """0=all ok, 1=some degraded, 2=critical (pool exhaustion or fallback same-provider)."""
    if not fallback_valid:
        return 2
    down = [r for r in results if not r.healthy and not r.error or "confirmed dead" not in (r.error or "")]
    # Exclude expected-dead (nous) from down count for severity
    unexpected_down = [r for r in results if not r.healthy and "confirmed dead" not in (r.error or "")]
    if len(unexpected_down) >= 3:
        return 2  # pool exhaustion
    if unexpected_down:
        return 1
    return 0


def format_human(results: List[ProviderResult], elapsed: float, fallback: FallbackValidation) -> str:
    lines = [
        f"Provider Health Probe — {len(results)} providers in {elapsed*1000:.0f}ms",
        "",
        "| Provider        | Status  | Latency | Detail",
        "|-----------------|---------|---------|-----------------------------------",
    ]
    for r in results:
        status = "[OK]" if r.healthy else "[FAIL]"
        detail = r.error or ""
        if r.deep_probe:
            detail += " (deep)"
        lines.append(f"| {r.label:<15} | {status:<7} | {r.latency_ms:>5.0f}ms | {detail}")

    lines += [
        "",
        f"Fallback validation: {'[OK]' if fallback.valid else '[FAIL]'} {fallback.reason or ''}",
        f"  Primary:   {fallback.primary_model} ({fallback.primary_provider})",
        f"  Fallback:  {fallback.fallback_model} ({fallback.fallback_provider})",
    ]
    return "\n".join(lines)


def format_json(results: List[ProviderResult], elapsed: float, fallback: FallbackValidation) -> str:
    payload = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsed_ms": round(elapsed * 1000, 1),
        "providers": [r.to_dict() for r in results],
        "fallback_validation": asdict(fallback),
        "exit_code": determine_exit_code(results, fallback.valid),
    }
    return json.dumps(payload, indent=2)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Provider Health Probe — EDGA-4259")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    parser.add_argument("--validate-fallback", action="store_true", help="Only validate fallback config")
    parser.add_argument("--deep", action="store_true", help="Run chat-completion deep probes (costs tokens)")
    args = parser.parse_args()

    if args.validate_fallback:
        fb = validate_fallback()
        if args.json:
            print(json.dumps(asdict(fb), indent=2))
        else:
            print("[OK]" if fb.valid else "[FAIL]", fb.reason or "fallback is cross-provider")
        sys.exit(0 if fb.valid else 2)

    results, elapsed = run_probe(deep=args.deep)
    fallback = validate_fallback()
    exit_code = determine_exit_code(results, fallback.valid)

    if args.json:
        print(format_json(results, elapsed, fallback))
    else:
        print(format_human(results, elapsed, fallback))

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
