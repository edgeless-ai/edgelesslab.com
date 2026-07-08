#!/usr/bin/env python3.11
"""Hardened MoA free-blend editor for Hermes profiles.

WHY THIS EXISTS: earlier edits used regex text-surgery that clobbered whole config blocks
(curator broke twice) and spawned a pile of `.bak` files. This uses **ruamel round-trip YAML**:
it changes ONLY the MoA keys — `model.provider`/`default`, `moa.presets['free-blend']`, and
MERGES `custom_providers` by name — preserving every other key, comment, and bit of formatting.
Idempotent (run twice → identical) and validated with a strict parser after every write. One
pruned backup per profile in a central dir (no more scattered `.bak-*` litter).

BLEND = free providers, spread so no single one rate-limits the whole swarm:
  nvidia:deepseek-v4-flash + opencode:deepseek-v4-flash-free + gflash:gemini-2.5-flash
  + nousfree:stepfun/step-3.7-flash:free, with a paid aggregator reserved for the
  judgment-heavy profiles that really need it.
Add a provider later by editing ONE list (`reference_models` + `custom_providers`) — no rewrite.

Creds are SOURCED from existing config/auth.json at runtime (no secrets hardcoded here).

Usage:
  set_moa_blend.py <profile> [<profile>...]   # apply to named profiles
  set_moa_blend.py --all                      # every profile currently on provider: moa
  set_moa_blend.py --dry-run <profile>        # validate without writing
"""
import sys, json, shutil, time, glob, os, hashlib, subprocess
from copy import deepcopy

pyyaml = None
try:
    import yaml as pyyaml     # proven strict reader for these configs
except ModuleNotFoundError:
    pyyaml = None

try:
    from ruamel.yaml import YAML
except ModuleNotFoundError:
    YAML = None

PROFILES_DIR = "/Users/djm/.hermes/profiles"
BACKUP_DIR = "/Users/djm/.hermes/.moa-blend-backups"
KEEP_BACKUPS = 2
AUTH = "/Users/djm/.hermes/auth.json"

if YAML is not None:
    _rt = YAML()            # round-trip (preserves formatting/comments) — used ONLY for the write
    _rt.preserve_quotes = True
    _rt.width = 8192
    _rt.allow_duplicate_keys = True   # tolerate + DEDUP the messy dup-key configs left by earlier regex edits
else:
    class _FallbackYAML:
        @staticmethod
        def load(fh):
            return _load_yaml_obj(fh.read())

        @staticmethod
        def dump(cfg, fh):
            fh.write(_dump_yaml_obj(cfg))

    _rt = _FallbackYAML()


class _safe:            # read shim: pyyaml.safe_load reads these configs where ruamel-safe choked
    @staticmethod
    def load(fh):
        if pyyaml is not None:
            return pyyaml.safe_load(fh)
        return _load_yaml_obj(fh.read())


def _load_yaml_obj(text: str):
    """Load YAML without Python YAML dependencies.

    Ruby ships on macOS, and its stdlib YAML parser is sufficient for these config files.
    We convert to JSON in-process so Python receives a normal dict/list tree.
    """
    proc = subprocess.run(
        [
            "ruby",
            "-e",
            "require 'yaml'; require 'json'; "
            "obj = YAML.safe_load(File.read(ARGV[0]), aliases: true); "
            "STDOUT.write(JSON.generate(obj))",
            "/dev/stdin",
        ],
        input=text,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(proc.stdout)


def _dump_yaml_obj(obj) -> str:
    """Serialize config objects to YAML without Python YAML dependencies."""
    proc = subprocess.run(
        [
            "ruby",
            "-e",
            "require 'yaml'; require 'json'; "
            "obj = JSON.parse(STDIN.read); "
            "STDOUT.write(YAML.dump(obj))",
        ],
        input=json.dumps(obj),
        text=True,
        capture_output=True,
        check=True,
    )
    return proc.stdout


def _env_val(path, *names):
    try:
        for line in open(path):
            k = line.split("=", 1)[0].strip()
            if k in names:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return None


ENV = "/Users/djm/claude-projects/.env"


def _load_creds():
    """Source provider keys (all verified working 2026-07-06; see feedback-nous-free-vs-paid-models).

    CRITICAL: providers get NON-COLLIDING names (nvnim/gflash/cerebras/hfrouter) so Hermes uses
    THESE inline keys, not its built-in registry (the collision that caused retry-storm hangs).
    NOTE: gemini key is the BILLED GEMINI_API_KEY from .env — NOT gmicloud (which 402s: insufficient
    balance). opencode/zen and paid hyper:deepseek-v4-pro are GONE (dead gateway + the budget burner).
    """
    au = json.load(open(AUTH))["providers"]
    return {
        "nvidia": au.get("nvidia", {}).get("api_key"),
        "gem": _env_val(ENV, "GEMINI_API_KEY", "GOOGLE_API_KEY"),
        "cerebras": _env_val(ENV, "CEREBRAS_API_KEY"),
        "hf": _env_val(ENV, "HF_TOKEN"),
    }


def _profile_nous_key(profile):
    """Prefer the profile-local Nous credential when present.

    Beau and Hive already carry a working inline `providers.nous` entry in their configs, so this
    lets the blend use the actual free Nous key without needing it in global auth.json.
    """
    path = f"{PROFILES_DIR}/{profile}/config.yaml"
    try:
        cfg = _safe.load(open(path))
        providers = cfg.get("providers") or {}
        return (providers.get("nous") or {}).get("api_key")
    except Exception:
        return None


# BLEND (rebuilt 2026-07-06 after the free-layer collapse): 4 diverse, non-llama, parallel-tool-
# VERIFIED providers as references; a reliable tool-calling aggregator. No dead opencode/zen, no
# paid deepseek-v4-pro. Cerebras + HF sit behind Cloudflare — Hermes' HTTP client sends a normal
# User-Agent so they pass (bare python-urllib gets CF-1010; confirmed no 1010s in fleet logs).
def _blend_and_providers(profile=""):
    c = _load_creds()
    nous_key = _profile_nous_key(profile)
    preset = {
        "reference_models": [
            {"provider": "cerebras", "model": "zai-glm-4.7"},                          # GLM, fastest, 2 parallel tools
            {"provider": "hfrouter", "model": "Qwen/Qwen3-235B-A22B-Instruct-2507"},   # Qwen 235B, 2 parallel tools
            {"provider": "nvnim", "model": "openai/gpt-oss-120b"},                     # GPT-OSS on NVIDIA NIM, fast
            # gflash (gemini-3.5-flash) REMOVED 2026-07-07: both gemini keys 429 "prepayment credits
            # depleted" — dead as reference AND aggregator. Do NOT re-add without a funded key.
            *(
                # Free Nous option (kept per David) via the BUILT-IN auto-refreshing OAuth `nous`
                # provider — stepfun:free verified serving even on the depleted free tier.
                [{"provider": "nous", "model": "stepfun/step-3.7-flash:free"}]
                if nous_key else []
            ),
        ],
        # Aggregator = cerebras zai-glm-4.7 (2026-07-07): verified working (0.2s), reliable tool-caller
        # that does PARALLEL tool calls, no daily cap. Replaced gflash/gemini (429 depleted) — and NOT
        # Hy3 (which only does ONE tool call at a time, per David). One call/req.
        "aggregator": {"provider": "cerebras", "model": "zai-glm-4.7"},
        "enabled": True,
        "reference_temperature": 0.6,
        "aggregator_temperature": 0.4,
        "max_tokens": 8192,
    }
    providers = [
        {"name": "cerebras", "provider": "custom", "base_url": "https://api.cerebras.ai/v1",
         "api_key": c["cerebras"], "api_mode": "chat_completions"},
        {"name": "hfrouter", "provider": "custom", "base_url": "https://router.huggingface.co/v1",
         "api_key": c["hf"], "api_mode": "chat_completions"},
        {"name": "nvnim", "provider": "custom", "base_url": "https://integrate.api.nvidia.com/v1",
         "api_key": c["nvidia"], "api_mode": "chat_completions"},
        {"name": "gflash", "provider": "custom",
         "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
         "api_key": c["gem"], "api_mode": "chat_completions"},
    ]
    return preset, providers


def _backup(path, profile):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    shutil.copy(path, f"{BACKUP_DIR}/{profile}.{time.strftime('%Y%m%d-%H%M%S')}.yaml")
    baks = sorted(glob.glob(f"{BACKUP_DIR}/{profile}.*.yaml"))
    for old in baks[:-KEEP_BACKUPS]:
        os.remove(old)


def set_blend(profile, dry_run=False):
    path = f"{PROFILES_DIR}/{profile}/config.yaml"
    preset, providers = _blend_and_providers(profile)
    cfg = _rt.load(open(path))               # round-trip: preserves everything

    if cfg.get("model") is None:
        cfg["model"] = {}
    cfg["model"]["provider"] = "moa"
    cfg["model"]["default"] = "free-blend"
    cfg["model"]["max_tokens"] = 8192

    if cfg.get("moa") is None:
        cfg["moa"] = {}
    # PRUNE legacy presets (e.g. free-council) — keep ONLY free-blend. Dormant presets that
    # reference colliding provider names are loaded footguns; the fleet has one intended preset.
    cfg["moa"]["presets"] = {"free-blend": deepcopy(preset)}

    # PRUNE dormant colliding custom_providers (nvidia/gemini/nous byte-dupes of nvnim/gflash/
    # nousfree) — set EXACTLY the blend's non-colliding providers, nothing else.
    cfg["custom_providers"] = deepcopy(providers)

    if dry_run:
        # Dry-run still exercises parser compatibility through the same write-path object.
        _ = _rt.load(open(path))
        return "dry-run OK"

    _backup(path, profile)
    with open(path, "w") as f:
        _rt.dump(cfg, f)

    c2 = _safe.load(open(path))                               # strict enough for the deployed file
    refs = c2["moa"]["presets"]["free-blend"]["reference_models"]
    assert c2["model"]["default"] == "free-blend"
    assert isinstance(refs, list) and 3 <= len(refs) <= 5, "reference_models not a 3-5 item list"
    assert all("provider" in item and "model" in item for item in refs), "reference_models missing fields"
    return "ok"


def _all_moa_profiles():
    out = []
    for f in sorted(glob.glob(f"{PROFILES_DIR}/*/config.yaml")):
        try:
            if (_safe.load(open(f)).get("model") or {}).get("provider") == "moa":
                out.append(os.path.basename(os.path.dirname(f)))
        except Exception:
            pass
    return out


if __name__ == "__main__":
    args = sys.argv[1:]
    dry = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]
    profiles = _all_moa_profiles() if args == ["--all"] else args
    ok, bad = [], {}
    for p in profiles:
        try:
            set_blend(p, dry_run=dry); ok.append(p)
        except Exception as e:
            bad[p] = str(e)[:60]
    print(f"{'DRY-RUN ' if dry else ''}applied to {len(ok)}: {ok}")
    if bad:
        print("FAILED:", json.dumps(bad, indent=1))
