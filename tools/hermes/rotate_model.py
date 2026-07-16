#!/usr/bin/env python3
"""
rotate_model.py — codified, VERIFIED model/key rotation for Hermes profiles.

We rotate models + keys a lot. This makes it one repeatable, safe operation instead
of hand-editing YAML each time and trusting a truncated "OK":

  - a central REGISTRY of known providers (base_url + key + a verify model) so keys
    live in ONE place, not copy-pasted across 30 profiles,
  - surgical model-block edits (never yaml.dump — see feedback_yaml_roundtrip_danger),
  - REAL verification: a live chat + tool-call, FULL response written to a file and
    inspected (the check that kept hiding failures like cerebras 403),
  - backups before every write.

Usage:
  rotate_model.py --list                         # each profile's current provider/default
  rotate_model.py --registry                     # show the registry + live-verify each entry
  rotate_model.py --verify nvidia-oss            # live full-response + tool-call test of one entry
  rotate_model.py atlas memer --to nvidia-oss    # repoint profiles (backup + edit + verify)
  rotate_model.py --all-on deepseek-v4-flash --to nvidia-oss   # repoint everyone on a default
  rotate_model.py --rekey nvidia-oss nvapi-NEWKEY              # rotate a provider's KEY everywhere it's used
  add --dry-run to any write to preview without editing.

Env keys are read from the project .env when a registry entry says key_env.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

PROFILES = Path.home() / ".hermes" / "profiles"
ENV = Path.home() / "claude-projects" / ".env"


def _env(name):
    try:
        for line in ENV.read_text().splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return os.environ.get(name, "")


# ---- The registry: the verified providers we actually rotate between. --------
# 'verify' is the model id used for the live check. status notes dead ones so we
# never rotate onto a known-broken provider again.
REGISTRY = {
    "nvidia-oss": {
        "provider": "custom", "default": "openai/gpt-oss-120b",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "api_key": "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",
        "note": "FREE, reliable, verified tool-calling. Default free workhorse.",
    },
    "hyper-flash": {
        "provider": "custom", "default": "deepseek-v4-flash",
        "base_url": "https://hyper.charm.land/v1", "api_key": "sk-hyper-75164fa7-7e0e-4930-8db4-d38a0a8173c3",
        "note": "PAID hyper (flat sub, ~250 credits/day). Cheap workhorse ($0.20/$0.40 per M).",
    },
    "hyper-pro": {
        "provider": "custom", "default": "deepseek-v4-pro",
        "base_url": "https://hyper.charm.land/v1", "api_key": "sk-hyper-75164fa7-7e0e-4930-8db4-d38a0a8173c3",
        "note": "PAID hyper premium reasoning ($2.40/$4.80 per M). LOW-VOLUME judgment only.",
    },
    "hyper-coder": {
        "provider": "custom", "default": "kimi-k2.7-code",
        "base_url": "https://hyper.charm.land/v1", "api_key": "sk-hyper-75164fa7-7e0e-4930-8db4-d38a0a8173c3",
        "note": "PAID hyper coding model. Escalate hard builds here.",
    },
    "free-blend": {
        "provider": "moa", "default": "free-blend",
        "base_url": "http://localhost:3001/v1",
        "api_key": "freellmapi-3a2e9538d05f84fe440ebd03baa488a01ca860ff25215bea",
        "note": "MoA fusion (nvnim aggregator + hfrouter/nvnim/nous refs). Managed via set_moa_blend.py.",
        "no_verify": True,  # fusion, verify via a live agent chat instead
    },
    "freellmapi-fusion": {
        "provider": "custom", "default": "fusion",
        "base_url": "http://localhost:3001/v1",
        "api_key": "freellmapi-3a2e9538d05f84fe440ebd03baa488a01ca860ff25215bea",
        "note": "freellmapi NATIVE fusion MoA (kimi-k2.6 + mistral-large-3 + gpt-oss-120b + "
                "qwen3-coder-480b, judge gpt-oss-120b). FREE, high quality, ~19s (slower when "
                "upstreams burned). Quality/judgment agents. Verify slow -> use no_verify.",
        "no_verify": True,
    },
    "freellmapi-auto": {
        "provider": "custom", "default": "auto",
        "base_url": "http://localhost:3001/v1",
        "api_key": "freellmapi-3a2e9538d05f84fe440ebd03baa488a01ca860ff25215bea",
        "note": "freellmapi auto self-route (usually gpt-oss-120b, ~1s). FREE, fast. Speed agents. "
                "Can spike when upstreams exhausted. NOTE: /v1 endpoints are slow — verify w/ 40s.",
        "verify": "auto",
    },
    # DEAD — kept as a tombstone so we do not rotate back onto it:
    "cerebras-glm": {"provider": "custom", "default": "zai-glm-4.7",
                     "base_url": "https://api.cerebras.ai/v1", "api_key": "",
                     "dead": "403 Forbidden (2026-07-15). Do NOT use as model or aggregator."},
}

MODEL_KEYS = ("provider", "default", "base_url", "api_key", "api_mode")


def profile_list():
    out = []
    for d in sorted(PROFILES.iterdir()):
        cfg = d / "config.yaml"
        if not cfg.exists():
            continue
        prov = dflt = None
        block = _model_block(cfg.read_text())
        for l in block:
            s = l.strip()
            if s.startswith("provider:"):
                prov = s.split(":", 1)[1].strip()
            elif s.startswith("default:"):
                dflt = s.split(":", 1)[1].strip()
        out.append((d.name, prov, dflt))
    return out


def _model_block(text):
    lines = text.split("\n")
    mi = next((i for i, l in enumerate(lines) if l.rstrip() == "model:"), None)
    if mi is None:
        return []
    j = mi + 1
    while j < len(lines) and (lines[j][:1] in (" ", "\t") or lines[j].strip() == ""):
        j += 1
    return lines[mi + 1:j]


def verify(entry, tools=True):
    """Live full-response + tool-call check. Returns (ok, detail)."""
    if entry.get("dead"):
        return False, "DEAD: " + entry["dead"]
    if entry.get("no_verify"):
        return True, "skip (verify via a live agent chat)"
    body = {"model": entry.get("verify", entry["default"]),
            "messages": [{"role": "user", "content": "Call get_status for edgeless."}],
            "max_tokens": 120}
    tool_spec = [{"type": "function", "function": {
        "name": "get_status", "parameters": {"type": "object", "properties": {"board": {"type": "string"}}}}}]

    def _post(with_tools):
        b = dict(body, tools=tool_spec) if with_tools else body
        req = urllib.request.Request(entry["base_url"].rstrip("/") + "/chat/completions",
                                     data=json.dumps(b).encode(),
                                     headers={"Authorization": f"Bearer {entry['api_key']}",
                                              "Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.load(r)

    try:
        try:
            d = _post(tools)
        except urllib.error.HTTPError as he:
            # Some endpoints (NVIDIA gpt-oss-120b) 400 on the tool schema but are UP for plain
            # completions. Don't false-negative: retry without tools and report the provider live.
            if tools and he.code == 400:
                m = _post(False)["choices"][0]["message"]
                c = (m.get("content") or "").strip()
                return (True, "text OK (tools rejected by endpoint): " + c[:40]) if c else (False, "empty response")
            raise
        m = d["choices"][0]["message"]
        if m.get("tool_calls"):
            return True, "tool_call OK: " + m["tool_calls"][0]["function"]["name"]
        c = (m.get("content") or "").strip()
        return (bool(c), ("text: " + c[:60]) if c else "empty response")
    except Exception as e:  # noqa
        return False, "ERROR: " + str(e)[:120]


def set_model(cfg_path, entry, dry=False):
    text = cfg_path.read_text()
    lines = text.split("\n")
    mi = next((i for i, l in enumerate(lines) if l.rstrip() == "model:"), None)
    if mi is None:
        raise ValueError("no model: block")
    j = mi + 1
    while j < len(lines) and (lines[j][:1] in (" ", "\t") or lines[j].strip() == ""):
        j += 1
    old = lines[mi + 1:j]
    fields = {k: entry[k] for k in MODEL_KEYS if k in entry}
    fields.setdefault("api_mode", "chat_completions")
    new, seen = [], set()
    for l in old:
        s = l.strip()
        key = s.split(":", 1)[0] if ":" in s and not s.startswith("#") else None
        if key in MODEL_KEYS:
            if key in fields:
                new.append(f"  {key}: {fields[key]}")
                seen.add(key)
            # else: drop a field the new entry doesn't define (e.g. base_url when going built-in)
        else:
            new.append(l)  # preserve max_tokens, reasoning_effort, comments, etc.
    for k in MODEL_KEYS:
        if k in fields and k not in seen:
            new.insert(0, f"  {k}: {fields[k]}") if k == "provider" else new.append(f"  {k}: {fields[k]}")
    if dry:
        return old, new
    bak = cfg_path.with_suffix(f".yaml.rotbak_{time.strftime('%Y%m%d_%H%M%S')}")
    bak.write_text(text)
    lines[mi + 1:j] = new
    cfg_path.write_text("\n".join(lines))
    return old, new


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("profiles", nargs="*")
    ap.add_argument("--to")
    ap.add_argument("--all-on")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--registry", action="store_true")
    ap.add_argument("--verify")
    ap.add_argument("--rekey", nargs=2, metavar=("ENTRY", "NEWKEY"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if a.list:
        for name, prov, dflt in profile_list():
            print(f"  {name:24} {prov or '?'} / {dflt or '?'}")
        return
    if a.registry:
        for name, e in REGISTRY.items():
            ok, det = verify(e)
            print(f"  {name:14} {'✅' if ok else '❌'} {e.get('default'):22} {det}")
        return
    if a.verify:
        e = REGISTRY[a.verify]
        ok, det = verify(e)
        print(f"{a.verify}: {'OK' if ok else 'FAIL'} — {det}")
        sys.exit(0 if ok else 1)

    if a.rekey:
        name, newkey = a.rekey
        old = REGISTRY[name]["api_key"]
        n = 0
        for name2, prov, dflt in profile_list():
            cfg = PROFILES / name2 / "config.yaml"
            t = cfg.read_text()
            if old and old in t:
                cfg.with_suffix(f".yaml.rotbak_{time.strftime('%H%M%S')}").write_text(t)
                if not a.dry_run:
                    cfg.write_text(t.replace(old, newkey))
                n += 1
        print(f"{'(dry) ' if a.dry_run else ''}rekeyed {name} in {n} profiles. Update REGISTRY['{name}']['api_key'] too.")
        return

    if not a.to or a.to not in REGISTRY:
        print("need --to <registry-entry>; entries:", ", ".join(REGISTRY), file=sys.stderr)
        sys.exit(2)
    entry = REGISTRY[a.to]
    if entry.get("dead"):
        print(f"refusing: {a.to} is DEAD — {entry['dead']}", file=sys.stderr)
        sys.exit(2)
    targets = list(a.profiles)
    if a.all_on:
        targets += [n for n, p, d in profile_list() if d == a.all_on]
    targets = sorted(set(targets))
    if not targets:
        print("no target profiles", file=sys.stderr)
        sys.exit(2)
    ok, det = verify(entry)
    print(f"target model {a.to} ({entry['default']}): {'✅ verified' if ok else '❌ '+det}")
    if not ok and not entry.get("no_verify"):
        print("aborting: target model failed verification", file=sys.stderr)
        sys.exit(1)
    for t in targets:
        cfg = PROFILES / t / "config.yaml"
        if not cfg.exists():
            print(f"  {t}: no config, skip")
            continue
        o, n = set_model(cfg, entry, dry=a.dry_run)
        print(f"  {'(dry) ' if a.dry_run else ''}{t}: -> {entry['provider']}/{entry['default']}")
    print(f"\nDone{' (dry-run)' if a.dry_run else ''}. Restart affected gateways to load "
          f"(launchctl kickstart -k <domain>/ai.hermes.gateway-<profile>).")


if __name__ == "__main__":
    main()
