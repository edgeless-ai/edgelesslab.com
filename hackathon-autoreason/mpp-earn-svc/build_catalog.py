#!/usr/bin/env python3
"""
Build a sampled Printify catalog and write it where the storefront will read it.

Samples up to ~6-10 blueprints per major category (keeps runtime to a couple of
minutes), normalizes each into a KINDS-shaped entry via catalog_client, and writes
merch-demo/src/data/printify-catalog.json atomically. Prints per-category counts.

Run:
    cd hackathon-autoreason/mpp-earn-svc
    set -a; . ../../.env 2>/dev/null; . ~/.hermes/profiles/hive/.env 2>/dev/null; set +a
    python3 build_catalog.py
"""
from __future__ import annotations

import json
import os
import sys

import catalog_client

# Major categories the storefront will surface. We sample each so the catalog has
# breadth rather than 60 t-shirts. Apparel is large, so give it a touch more.
CATEGORIES = [
    "Apparel",
    "Drinkware",
    "Home & Living",
    "Accessories",
    "Hats",
    "Bags",
    "Phone Cases",
]
PER_CATEGORY = 8          # keep ~6-10 per category
MAX_BLUEPRINTS = 120      # global deep-fetch cap (safety rail)

OUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "merch-demo", "src", "data", "printify-catalog.json",
)


def _atomic_write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def main() -> int:
    if not catalog_client.enabled():
        print("ERROR: PRINTIFY_API_KEY not set in environment.", file=sys.stderr)
        return 1

    print(f"Building Printify catalog sample (<= {PER_CATEGORY}/category, "
          f"cap {MAX_BLUEPRINTS} deep-fetches)...")

    entries = catalog_client.build_catalog(
        categories=CATEGORIES,
        max_blueprints=MAX_BLUEPRINTS,
        per_category_cap=PER_CATEGORY,
    )

    # Stable ordering: by category (in declared order) then label.
    cat_order = {c: i for i, c in enumerate(CATEGORIES)}
    entries.sort(key=lambda e: (cat_order.get(e["category"], 99), e["label"]))

    payload = {
        "source": "printify",
        "generated_by": "build_catalog.py",
        "note": "Sampled catalog breadth. Curator/swarm gates every design before listing.",
        "count": len(entries),
        "entries": entries,
    }
    _atomic_write_json(OUT_PATH, payload)

    # Summary
    counts: dict = {}
    for e in entries:
        counts[e["category"]] = counts.get(e["category"], 0) + 1

    print(f"\nWrote {len(entries)} entries -> {OUT_PATH}")
    print("Per-category counts:")
    for cat in CATEGORIES + sorted(c for c in counts if c not in CATEGORIES):
        if counts.get(cat):
            print(f"  {cat:<16} {counts[cat]}")
    if not entries:
        print("  (no entries — check API key / connectivity)")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
