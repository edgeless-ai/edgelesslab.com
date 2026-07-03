"""
Printify catalog layer — groundwork for "nearly anything on Printify" product breadth.

This walks the Printify catalog (blueprints -> print providers -> variants) and
normalizes a curated sample into entries shaped like the hardcoded `KINDS` dict in
printify_client.py, so the rest of the service can treat any catalog product the same
way it treats the existing sticker/poster/embroidery kinds.

Same auth as printify_client: Bearer PRINTIFY_API_KEY + a REQUIRED User-Agent header.
The curator/swarm still gates every design before listing — this is product breadth only.

Catalog entry schema (one dict per kind):
    {
      "kind_key":     "tshirt-bella-canvas-3001",  # stable slug, usable as a `kind`
      "blueprint":    6,                            # blueprint_id
      "provider":     99,                           # print_provider_id (first/cheapest)
      "variant":      12345,                        # representative variant id
      "price_cents":  null|int,                     # heuristic retail price, or null
      "label":        "Unisex Jersey Short Sleeve Tee — White / M",
      "category":     "Apparel",
      "placeholders": ["front", "back"]             # available print positions for variant
    }
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request

BASE = "https://api.printify.com/v1"

# Tunable safety rails so a sample run finishes in a couple of minutes.
_SLEEP = 0.25            # throttle between catalog requests (be polite to the API)
_REQ_TIMEOUT = 45
_DEFAULT_MAX_BLUEPRINTS = 60   # hard cap on how many blueprints we deep-fetch


# ---------------------------------------------------------------------------
# auth / request (mirrors printify_client._req exactly)
# ---------------------------------------------------------------------------
def _key() -> str:
    return os.environ.get("PRINTIFY_API_KEY", "")


def enabled() -> bool:
    return bool(_key())


def _req(method: str, path: str, body=None, timeout=_REQ_TIMEOUT):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, method=method, data=data)
    req.add_header("Authorization", f"Bearer {_key()}")
    req.add_header("User-Agent", "Edgeless/1.0")  # REQUIRED by Printify
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode()
            return {"ok": True, "status": r.status, "body": json.loads(raw) if raw else None}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "error": e.read().decode("utf-8", "replace")[:400]}
    except Exception as e:
        return {"ok": False, "status": 0, "error": str(e)[:300]}


# ---------------------------------------------------------------------------
# raw catalog endpoints
# ---------------------------------------------------------------------------
def list_blueprints() -> list:
    """GET /catalog/blueprints.json — every product blueprint Printify offers."""
    r = _req("GET", "/catalog/blueprints.json")
    return r.get("body") or [] if r.get("ok") else []


def blueprint_providers(bp) -> list:
    """GET /catalog/blueprints/{bp}/print_providers.json — providers for a blueprint."""
    r = _req("GET", f"/catalog/blueprints/{bp}/print_providers.json")
    return r.get("body") or [] if r.get("ok") else []


def provider_variants(bp, provider) -> dict:
    """GET /catalog/blueprints/{bp}/print_providers/{provider}/variants.json.

    Returns the raw body: {"id": provider, "variants": [{id, title, placeholders, options}, ...]}.
    """
    r = _req("GET", f"/catalog/blueprints/{bp}/print_providers/{provider}/variants.json")
    return r.get("body") or {} if r.get("ok") else {}


# ---------------------------------------------------------------------------
# categorization
# ---------------------------------------------------------------------------
# Ordered: first matching rule wins. Matched against lower-cased "brand title".
_CATEGORY_RULES = [
    ("Phone Cases",      r"phone case|iphone|samsung|airpod|tough case|snap case|clear case"),
    ("Drinkware",        r"mug|tumbler|bottle|can cooler|flask|glass|coffee|shaker|stein"),
    ("Hats",             r"hat|cap|beanie|bucket|visor|snapback|trucker"),
    ("Bags",             r"bag|tote|backpack|pouch|fanny|duffel|drawstring|cosmetic"),
    ("Accessories",      r"sticker|magnet|pin|button|keychain|sock|patch|coaster|mouse pad|mousepad|notebook|journal|puzzle|ornament"),
    ("Home & Living",    r"poster|canvas|blanket|pillow|towel|mat|tapestry|flag|apron|curtain|rug|plaque|wall|frame|wood print|metal print|garden|candle|placemat"),
    ("Apparel",          r"shirt|tee|hoodie|sweat|tank|long sleeve|crewneck|jacket|dress|leggings|joggers|shorts|romper|bodysuit|polo|jersey|onesie|sweatpants|kids|baby|youth|toddler|unisex|women|men"),
]


def categorize(blueprint: dict) -> str:
    text = f"{blueprint.get('brand', '')} {blueprint.get('title', '')}".lower()
    for category, pat in _CATEGORY_RULES:
        if re.search(pat, text):
            return category
    return "Other"


def _slug(text: str, maxlen: int = 60) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:maxlen].rstrip("-") or "item"


# ---------------------------------------------------------------------------
# normalization helpers
# ---------------------------------------------------------------------------
def _cheapest_provider(providers: list) -> dict | None:
    """Pick a print provider. The providers list has no price, so we take the first
    (Printify orders providers with sensible defaults first). Returns the provider dict."""
    return providers[0] if providers else None


def _variant_placeholders(variant: dict) -> list:
    """Print positions available on a variant (front/back/sleeve/all-over/etc.)."""
    out = []
    for ph in variant.get("placeholders") or []:
        pos = ph.get("position")
        if pos and pos not in out:
            out.append(pos)
    return out


def _pick_variant(variants: list) -> dict | None:
    """Pick a representative variant: prefer one with a usable 'front' print area,
    else the first variant that has any placeholders, else the first variant."""
    if not variants:
        return None
    for v in variants:
        if "front" in _variant_placeholders(v):
            return v
    for v in variants:
        if _variant_placeholders(v):
            return v
    return variants[0]


def _heuristic_price_cents(category: str) -> int | None:
    """The catalog endpoints don't expose retail price (that's set per-product at
    creation time). Seed a sane default per category so the storefront has a number;
    real pricing comes from the curator/listing step. None = "price at list time"."""
    return {
        "Apparel":       2400,
        "Drinkware":     1800,
        "Home & Living": 2800,
        "Accessories":   1000,
        "Hats":          2200,
        "Bags":          2600,
        "Phone Cases":   2200,
        "Other":         2000,
    }.get(category)


def _entry_from_blueprint(bp: dict) -> dict | None:
    """Deep-fetch one blueprint into a normalized catalog entry, or None on failure."""
    bp_id = bp.get("id")
    if bp_id is None:
        return None
    try:
        providers = blueprint_providers(bp_id)
        time.sleep(_SLEEP)
        provider = _cheapest_provider(providers)
        if not provider:
            return None
        prov_id = provider.get("id")

        vbody = provider_variants(bp_id, prov_id)
        time.sleep(_SLEEP)
        variants = vbody.get("variants") or []
        variant = _pick_variant(variants)
        if not variant:
            return None

        placeholders = _variant_placeholders(variant)
        category = categorize(bp)
        title = bp.get("title", "Product")
        vtitle = variant.get("title", "")
        label = f"{title} — {vtitle}".strip(" —") if vtitle else title

        return {
            "kind_key": _slug(f"{bp_id}-{title}"),
            "blueprint": bp_id,
            "provider": prov_id,
            "variant": variant.get("id"),
            "price_cents": _heuristic_price_cents(category),
            "label": label,
            "category": category,
            "placeholders": placeholders,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# public: build a curated, normalized catalog
# ---------------------------------------------------------------------------
def build_catalog(categories=None, max_blueprints=_DEFAULT_MAX_BLUEPRINTS,
                  per_category_cap=None) -> list:
    """Walk blueprints -> first provider -> representative variant and return a
    normalized list of catalog entries (shaped like printify_client.KINDS values).

    Args:
        categories:        optional iterable of category names to keep (e.g.
                           ["Apparel", "Drinkware"]). None = keep all.
        max_blueprints:    hard cap on how many blueprints we deep-fetch (each costs
                           ~2 API calls). Keeps sample runs fast.
        per_category_cap:  optional cap on entries kept per category (sampling for
                           breadth without exhausting the whole catalog).

    Resilient: blueprints that error are skipped; requests are throttled; counts
    are capped so it never runs for ages.
    """
    if not enabled():
        return []

    wanted = set(categories) if categories else None
    blueprints = list_blueprints()
    time.sleep(_SLEEP)

    entries = []
    per_cat_counts: dict = {}
    fetched = 0

    for bp in blueprints:
        if fetched >= max_blueprints:
            break

        # Pre-filter by category from the (already-fetched) blueprint metadata so we
        # don't waste deep fetches on categories we don't want.
        if wanted is not None and categorize(bp) not in wanted:
            continue
        if per_category_cap is not None:
            cat = categorize(bp)
            if per_cat_counts.get(cat, 0) >= per_category_cap:
                continue

        entry = _entry_from_blueprint(bp)
        fetched += 1
        if not entry:
            continue
        if wanted is not None and entry["category"] not in wanted:
            continue
        if per_category_cap is not None:
            cat = entry["category"]
            if per_cat_counts.get(cat, 0) >= per_category_cap:
                continue
            per_cat_counts[cat] = per_cat_counts.get(cat, 0) + 1

        entries.append(entry)

    return entries
