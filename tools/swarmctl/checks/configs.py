"""
swarmctl.checks.configs — validate ~/.hermes/config.yaml and per-profile configs.

CONTRACT (see CONTRACT.md):
    check() -> dict[str, list[str]]
        key   = profile name ("__global__" for ~/.hermes/config.yaml)
        value = list of human-readable error strings (empty list = valid)
    Reads: ~/.hermes/config.yaml
           ~/.hermes/profiles/*/config.yaml
    Writes: NOTHING (read-only per cardinal rule in CONTRACT.md)
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

HERMES_DIR = Path.home() / ".hermes"
PROFILES_DIR = HERMES_DIR / "profiles"
GLOBAL_CONFIG = HERMES_DIR / "config.yaml"

# Auxiliary role names that may appear under auxiliary.*
AUX_ROLES = {
    "vision", "web_extract", "compression", "title_generation", "triage",
    "kanban_decomposer", "mcp", "curator", "skills_hub", "approval",
}

# Banned provider strings — dead or explicitly removed from the fleet
BANNED_PROVIDERS = {"opencode", "opencode.ai", "fireworks"}

# Model-containing config sections to search for banned/deepseek refs
# (we check these paths recursively rather than the full raw text to avoid
#  false positives in personality strings or descriptions)
MODEL_SECTIONS = ("model", "fallback_model", "fallback_providers", "auxiliary")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _find_in_config(obj: Any, target: str, path: str = "") -> list[str]:
    """
    Walk a parsed YAML object and return dotpath=value strings where a
    string value contains *target* (case-insensitive).  Skips personality /
    description / instruction text.
    """
    SKIP_KEYS = {"default_personality", "personalities", "description", "instruction",
                 "system_prompt", "prompt"}
    hits: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in SKIP_KEYS:
                continue
            hits.extend(_find_in_config(v, target, f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            hits.extend(_find_in_config(v, target, f"{path}[{i}]"))
    elif isinstance(obj, str) and target.lower() in obj.lower():
        hits.append(f"{path}={obj!r}")
    return hits


def _check_fallback_providers(fp: Any, section: str = "fallback_providers") -> list[str]:
    """Validate a fallback_providers list; return errors."""
    errs: list[str] = []
    if fp is None:
        return errs
    if not isinstance(fp, list):
        errs.append(
            f"{section}: expected list, got {type(fp).__name__!r}"
        )
        return errs
    for i, entry in enumerate(fp):
        if not isinstance(entry, dict):
            errs.append(
                f"{section}[{i}]: orphaned entry — not a dict"
                f" (got {type(entry).__name__!r}: {entry!r})"
            )
        elif not entry.get("provider"):
            errs.append(
                f"{section}[{i}]: orphaned entry — missing 'provider' key"
                f" (keys present: {list(entry.keys())})"
            )
        else:
            # Warn on unexpanded env-var api_key
            ak = entry.get("api_key", "")
            if isinstance(ak, str) and ak.startswith("${"):
                errs.append(
                    f"{section}[{i}]: api_key contains unexpanded env var: {ak!r}"
                )
            # Warn on banned providers in fallback chain
            prov = str(entry.get("provider", "")).lower()
            if prov in BANNED_PROVIDERS:
                errs.append(
                    f"{section}[{i}]: provider {entry['provider']!r} is banned/dead"
                )
    return errs


def _check_auxiliary(aux: Any) -> list[str]:
    """Validate auxiliary.* blocks; return errors."""
    errs: list[str] = []
    if aux is None:
        return errs
    if not isinstance(aux, dict):
        errs.append(f"auxiliary: expected dict, got {type(aux).__name__!r}")
        return errs
    for role, block in aux.items():
        if not isinstance(block, dict):
            errs.append(f"auxiliary.{role}: expected dict, got {type(block).__name__!r}")
            continue
        provider = block.get("provider", "auto")
        api_key = block.get("api_key", "")
        base_url = block.get("base_url", "")
        # Non-auto provider with empty api_key (and non-empty base_url means it's a real endpoint)
        if (
            provider not in ("auto", "", None)
            and not api_key
            and base_url
        ):
            errs.append(
                f"auxiliary.{role}: provider={provider!r} but api_key is empty"
                f" (non-auto provider with no key)"
            )
        # Unexpanded env var
        if isinstance(api_key, str) and api_key.startswith("${"):
            errs.append(
                f"auxiliary.{role}: api_key contains unexpanded env var: {api_key!r}"
            )
        # Banned provider
        if str(provider).lower() in BANNED_PROVIDERS:
            errs.append(
                f"auxiliary.{role}: provider {provider!r} is banned/dead"
            )
    return errs


def _check_model_block(model: Any) -> list[str]:
    """Validate the primary model block; return errors."""
    errs: list[str] = []
    if model is None:
        errs.append("model: missing top-level 'model' key")
        return errs
    if not isinstance(model, dict):
        errs.append(
            f"model: expected dict, got {type(model).__name__!r}"
            f" (value={model!r}) — 'model' must be a mapping, not a scalar"
        )
        return errs
    if not model.get("default"):
        errs.append("model.default: missing or empty (required: concrete model name)")
    if not model.get("provider"):
        errs.append("model.provider: missing or empty (required)")
    # Unexpanded env var in api_key
    ak = model.get("api_key", "")
    if isinstance(ak, str) and ak.startswith("${"):
        errs.append(f"model.api_key: unexpanded env var: {ak!r}")
    # Banned provider
    prov = str(model.get("provider", "")).lower()
    if prov in BANNED_PROVIDERS:
        errs.append(f"model.provider: {model['provider']!r} is banned/dead")
    return errs


def _check_fallback_model(fm: Any) -> list[str]:
    """Validate fallback_model (may be dict or list of dicts); return errors."""
    errs: list[str] = []
    if fm is None:
        return errs
    # Normalise to list
    entries = fm if isinstance(fm, list) else [fm]
    for i, entry in enumerate(entries):
        prefix = f"fallback_model[{i}]" if isinstance(fm, list) else "fallback_model"
        if not isinstance(entry, dict):
            errs.append(
                f"{prefix}: expected dict, got {type(entry).__name__!r}"
            )
            continue
        ak = entry.get("api_key", "")
        if isinstance(ak, str) and ak.startswith("${"):
            errs.append(f"{prefix}: api_key contains unexpanded env var: {ak!r}")
        prov = str(entry.get("provider", "")).lower()
        if prov in BANNED_PROVIDERS:
            errs.append(f"{prefix}: provider {entry['provider']!r} is banned/dead")
    return errs


def _check_deepseek_in_model_sections(data: dict[str, Any]) -> list[str]:
    """Return warnings for deepseek refs found inside actual model config sections."""
    errs: list[str] = []
    for section in MODEL_SECTIONS:
        hits = _find_in_config(data.get(section), "deepseek", section)
        for hit in hits:
            errs.append(f"deepseek ref in model config: {hit}")
    return errs


def _check_single_config(path: Path) -> list[str]:
    """
    Parse and validate one config.yaml.  Returns a list of human-readable
    error strings; empty list = valid.
    """
    errs: list[str] = []

    # ---- 1. YAML parse ----
    try:
        raw = path.read_text(encoding="utf-8")
        data = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        return [f"YAML parse error: {exc}"]
    except OSError as exc:
        return [f"Cannot read file: {exc}"]

    if data is None:
        return ["Config is empty (null YAML)"]
    if not isinstance(data, dict):
        return [f"Config root is not a mapping (got {type(data).__name__!r})"]

    # ---- 2. model block ----
    errs.extend(_check_model_block(data.get("model")))

    # ---- 3. fallback_model ----
    errs.extend(_check_fallback_model(data.get("fallback_model")))

    # ---- 4. fallback_providers (top-level) ----
    errs.extend(_check_fallback_providers(data.get("fallback_providers")))

    # ---- 5. auxiliary.* blocks ----
    errs.extend(_check_auxiliary(data.get("auxiliary")))

    # ---- 6. top-level compression block with provider api_key (atlas pattern) ----
    comp = data.get("compression")
    if isinstance(comp, dict) and comp.get("provider") not in ("auto", "", None):
        ak = comp.get("api_key", "")
        if isinstance(ak, str) and ak.startswith("${"):
            errs.append(
                f"compression.api_key: unexpanded env var: {ak!r}"
            )
        prov = str(comp.get("provider", "")).lower()
        if prov in BANNED_PROVIDERS:
            errs.append(f"compression.provider: {comp['provider']!r} is banned/dead")

    # ---- 7. delegation block (tortillaria-ops pattern) ----
    deleg = data.get("delegation")
    if isinstance(deleg, dict) and deleg.get("provider") not in ("auto", "", None):
        ak = deleg.get("api_key", "")
        if isinstance(ak, str) and ak.startswith("${"):
            errs.append(
                f"delegation.api_key: unexpanded env var: {ak!r}"
            )
        prov = str(deleg.get("provider", "")).lower()
        if prov in BANNED_PROVIDERS:
            errs.append(f"delegation.provider: {deleg['provider']!r} is banned/dead")

    # ---- 8. deepseek refs in model config sections ----
    errs.extend(_check_deepseek_in_model_sections(data))

    # ---- 9. nested providers.*.fallback_providers (kilo pattern) ----
    providers_block = data.get("providers")
    if isinstance(providers_block, dict):
        for pname, pblock in providers_block.items():
            if isinstance(pblock, dict):
                nested_fp = pblock.get("fallback_providers")
                if nested_fp is not None:
                    nested_errs = _check_fallback_providers(
                        nested_fp, f"providers.{pname}.fallback_providers"
                    )
                    errs.extend(nested_errs)
                    # Also scan for deepseek in nested fallback model names
                    for j, entry in enumerate(nested_fp if isinstance(nested_fp, list) else []):
                        if isinstance(entry, dict):
                            model_name = entry.get("model", "")
                            if "deepseek" in str(model_name).lower():
                                errs.append(
                                    f"providers.{pname}.fallback_providers[{j}]:"
                                    f" deepseek ref in model: {model_name!r}"
                                )

    return errs


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def check() -> dict[str, list[str]]:
    """
    Parse and validate ~/.hermes/config.yaml and every per-profile config.yaml.

    Returns:
        dict mapping profile name (or "__global__") to a list of error strings.
        An empty list means the config is valid.
    """
    results: dict[str, list[str]] = {}

    # --- global config ---
    if GLOBAL_CONFIG.exists():
        results["__global__"] = _check_single_config(GLOBAL_CONFIG)
    else:
        results["__global__"] = [f"Config file not found: {GLOBAL_CONFIG}"]

    # --- per-profile configs ---
    if PROFILES_DIR.exists():
        for profile_dir in sorted(PROFILES_DIR.iterdir()):
            if not profile_dir.is_dir():
                continue
            cfg_path = profile_dir / "config.yaml"
            if not cfg_path.exists():
                continue
            profile_name = profile_dir.name
            results[profile_name] = _check_single_config(cfg_path)

    return results


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    results = check()
    total_profiles = len(results)
    total_errors = sum(len(v) for v in results.values())
    clean = [k for k, v in results.items() if not v]
    flagged = {k: v for k, v in results.items() if v}

    print(f"Scanned {total_profiles} configs ({len(clean)} clean, {len(flagged)} with issues)")
    print(f"Total error/warning strings: {total_errors}")
    print()

    if flagged:
        for name, errs in sorted(flagged.items()):
            print(f"  [{name}]")
            for e in errs:
                print(f"    - {e}")
            print()
    else:
        print("  All configs are clean.")
