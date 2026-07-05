"""Shared helpers for enrichment resolvers (resolvers/*.py).

RESOLVER CONTRACT (mirrors the adapter registry — see spine/enrich.py):

    def resolve(signal: dict) -> dict | None

  `signal` is one quarantined Signal dict (no address AND no apn). Return:
    None                       — nothing to say: wrong jurisdiction, unusable
                                 name, live-only resolver in an offline run,
                                 or zero matches
    {"status": "resolved",     — exactly ONE exact-ish owner-name match
     "resolver": str,
     "confidence": float,      #  <= 0.4: a name match is never more than that
     "property": {...},        #  PropertyRef-shaped dict (apn/address/...)
     "evidence": {...}}        #  match receipts, merged into signal evidence
    {"status": "ambiguous",    — 2+ plausible parcels: NEVER guess; enrich
     "resolver": str,          #  records every candidate in evidence and the
     "candidates": [...],      #  signal stays pending
     "evidence": {...}}

  Optional module attributes: NAME (default: module name), ENABLED (default
  True), ORDER (default 100; lower runs first — live resolvers should outrank
  offline stand-ins).

NETWORK: all HTTP goes through the adapters politeness layer
(adapters/_common.py — descriptive UA, >=1s self rate-limit, bounded
retries, DEALFLOW_LIVE gate). Loaded here by file path under a private
module name so resolvers never fight tests that stub the adapters' copy.

stdlib only (requests needed only for live fetches, via the adapters layer).
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

RESOLVERS_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = RESOLVERS_DIR.parent
FIXTURES_DIR = PACKAGE_ROOT / "fixtures" / "resolvers"

_ADAPTERS_COMMON_PATH = PACKAGE_ROOT / "adapters" / "_common.py"
_ADAPTERS_COMMON_MOD = "dealflow_resolvers._adapters_common"

# Name-match confidence ceiling: an owner-name match alone can anchor a
# signal but never make it *certain* — names are ambiguous by design.
NAME_MATCH_CONFIDENCE = 0.35
MAX_NAME_CONFIDENCE = 0.4


def adapters_common():
    """The adapters politeness layer, loaded by path (cached privately)."""
    mod = sys.modules.get(_ADAPTERS_COMMON_MOD)
    if mod is None:
        spec = importlib.util.spec_from_file_location(
            _ADAPTERS_COMMON_MOD, _ADAPTERS_COMMON_PATH)
        mod = importlib.util.module_from_spec(spec)
        sys.modules[_ADAPTERS_COMMON_MOD] = mod
        spec.loader.exec_module(mod)
    return mod


def resolve_offline(offline: bool | None = None) -> bool:
    """Offline unless the run is live (cli.py --live / DEALFLOW_LIVE=1)."""
    return adapters_common().resolve_offline(offline)


def http_get_json(url: str, params: dict | None = None, **kw):
    """Polite GET via the adapters layer (UA, rate-limit, bounded retries)."""
    return adapters_common().http_get_json(url, params, **kw)


def load_fixture(name: str) -> dict | list:
    """Load a fixture file from fixtures/resolvers/."""
    with open(FIXTURES_DIR / name, encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# owner-name matching (shared by every name-based resolver)
# ---------------------------------------------------------------------------

# Tokens that are legal/recording noise, not name parts.
_SUFFIX_TOKENS = frozenset({
    "JR", "SR", "II", "III", "IV", "V", "TR", "TRS", "TRUST", "TRUSTEE",
    "TRUSTEES", "ETAL", "ETUX", "ETVIR", "REV", "LIVING", "ESTATE", "EST",
})

# Owner strings that mean "we don't actually know the owner".
_JUNK_NAMES = frozenset({
    "NOT AVAILABLE", "UNKNOWN", "N A", "NA", "NONE", "OWNER", "UNKNOWN OWNER",
    "OWNER UNKNOWN", "CURRENT OWNER", "OCCUPANT", "TBD",
})

_NAME_CLEAN_RE = re.compile(r"[^A-Z\s]")


def name_tokens(name) -> list[str]:
    """Uppercase A-Z tokens of a name string (punctuation stripped)."""
    s = _NAME_CLEAN_RE.sub(" ", str(name or "").upper())
    return [t for t in s.split() if t]


def person_tokens(name) -> tuple[str, list[str], str] | None:
    """'Janet Lorraine Lehman' -> ('JANET', ['LORRAINE'], 'LEHMAN').

    None when the string is not a usable person name (junk placeholder,
    fewer than 2 tokens, or an obvious org — orgs don't die, obituaries do).
    """
    toks = [t for t in name_tokens(name) if t not in _SUFFIX_TOKENS]
    if len(toks) < 2:
        return None
    if " ".join(toks) in _JUNK_NAMES:
        return None
    return toks[0], toks[1:-1], toks[-1]


def assessor_query_name(name) -> str | None:
    """First-middle-last person name -> the 'LAST FIRST' prefix that
    assessor owner indexes (OPA owner_1/owner_2 style) sort on."""
    p = person_tokens(name)
    if not p:
        return None
    first, _, last = p
    return f"{last} {first}"


def owner_name_matches(person_name, owner_field) -> bool:
    """Exact-ish match: assessor owner string vs a first-middle-last person.

    Requires last name and first name to match EXACTLY as whole tokens
    ('SMITH JOHNSON KEISHA' never matches 'John Smith'). Extra owner tokens
    beyond LAST FIRST must be prefix-compatible with the person's middle
    names in order ('L' ~ 'LORRAINE', 'FRED' ~ 'FREDERICK'); an owner token
    with no middle name to account for it is a DIFFERENT person. Suffix
    noise (JR/TR/III/...) is ignored on both sides.
    """
    p = person_tokens(person_name)
    if not p:
        return False
    first, middles, last = p
    o = [t for t in name_tokens(owner_field) if t not in _SUFFIX_TOKENS]
    if len(o) < 2 or o[0] != last or o[1] != first:
        return False
    extras = o[2:]
    if len(extras) > len(middles):
        return False
    return all(e.startswith(m) or m.startswith(e)
               for e, m in zip(extras, middles))
