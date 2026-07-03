"""
Printify adapter — stickers + posters for the white-label rack (multi-provider POD).

Apparel goes through Printful; stickers/posters go through Printify, both invisible
behind our one checkout. Printify has no lightweight mockup endpoint, so we get a
real mockup by creating a DRAFT product (not published) and reading its mockup image.
Products are cached per (art, kind) so we reuse them for the order.

Auth: Bearer + a REQUIRED User-Agent header (Printify rejects calls without one).
Key: PRINTIFY_API_KEY env.
"""
from __future__ import annotations
import json
import os
import urllib.error
import urllib.request

BASE = "https://api.printify.com/v1"
SHOP_ID = 28014999

# Verified blueprint/provider/variant per product kind (probed live 2026-06-24).
# cost_cents = the print provider's REAL production cost per unit (probed live 2026-06-27);
# constant per variant (art-independent). Used with live shipping for at-cost / floor pricing.
KINDS = {
    "sticker": {"blueprint": 400, "provider": 99, "variant": 45748,  "price_cents": 1000, "cost_cents": 142,  "label": "Kiss-Cut Sticker"},
    "poster":  {"blueprint": 282, "provider": 2,  "variant": 43135,  "price_cents": 2800, "cost_cents": 601,  "label": "Matte Poster 11×14"},
    # scale<1 keeps the embroidery a small emblem (full-image embroidery looks muddy).
    "embroidery": {"blueprint": 1691, "provider": 99, "variant": 116417, "price_cents": 3000, "cost_cents": 1496, "label": "Embroidered Beanie", "scale": 0.5},
    # Comfort Colors garment-dyed tee — full front DTG print, good for photographic art.
    "cc-tee": {"blueprint": 706, "provider": 410, "variant": 73200, "price_cents": 4000, "cost_cents": 2051, "label": "Comfort Colors Garment-Dyed Tee"},
    # --- Hats / bags / drinkware (blueprint+variant+cost probed live 2026-06-27) ---
    # scale<1 keeps art as a centered emblem on the cap front (full-bleed prints poorly on caps).
    "cap":    {"blueprint": 1395, "provider": 61,  "variant": 103870, "price_cents": 3000, "cost_cents": 1560, "label": "Dad Cap", "scale": 0.55},
    "bucket": {"blueprint": 1698, "provider": 217, "variant": 116654, "price_cents": 3400, "cost_cents": 2068, "label": "Bucket Hat", "scale": 0.7},
    "tote":   {"blueprint": 1313, "provider": 99,  "variant": 103598, "price_cents": 2400, "cost_cents": 948,  "label": "Cotton Tote Bag"},
    "mug":    {"blueprint": 478,  "provider": 28,  "variant": 65216,  "price_cents": 1800, "cost_cents": 499,  "label": "Ceramic Mug 11oz"},
    "enamel": {"blueprint": 483,  "provider": 28,  "variant": 70768,  "price_cents": 2600, "cost_cents": 1119, "label": "Enamel Camping Mug"},
}
_CACHE_FILE = os.path.join(os.path.dirname(__file__), "printify_products.json")


def _key() -> str:
    return os.environ.get("PRINTIFY_API_KEY", "")


def _enabled() -> bool:
    return bool(_key())


def _req(method: str, path: str, body=None, timeout=60):
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


def _load():
    try:
        with open(_CACHE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save(d):
    try:
        tmp = _CACHE_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(d, f)
        os.replace(tmp, _CACHE_FILE)
    except Exception:
        pass


def upload_image(art_url: str, name: str = "design.png") -> dict:
    return _req("POST", "/uploads/images.json", {"file_name": name, "url": art_url})


# Print placement options. "wrap" = current full behavior (art uses the kind's full
# print area / default scale). "insert" = a single centered FRONT patch (smaller scale,
# centered). Mugs/enamel expose a wrap-around body print area, so the choice is real —
# the created product's print_areas geometry reflects it and the eventual order uses it.
INSERT_SCALE = 0.45  # centered front patch: ~45% of the print area (mug/enamel front insert)
PLACEMENTS = ("wrap", "insert")


def _placement_scale(spec: dict, placement: str) -> float:
    """Resolve the front-image scale for a placement. 'insert' shrinks + centers the art
    to a front patch; 'wrap' (default) keeps the kind's existing full-area scale."""
    base = spec.get("scale", 1.0)
    if placement == "insert":
        # Never exceed the kind's own base scale (some kinds, e.g. cap, are already small).
        return min(base, INSERT_SCALE)
    return base


def _art_aspect(art_url: str) -> float:
    """width/height of the art (1.0 if unknown) — used to pick poster orientation."""
    try:
        import urllib.request as _u, io
        from PIL import Image
        req = _u.Request(art_url, headers={"User-Agent": "Mozilla/5.0"})
        with _u.urlopen(req, timeout=20) as r:
            im = Image.open(io.BytesIO(r.read()))
        return (im.width / im.height) if im.height else 1.0
    except Exception:
        return 1.0


# Printify's poster blueprint has portrait + square sizes but NO landscape, so we pick the
# small-poster variant whose aspect is CLOSEST to the art (landscape art is rotated 90° first,
# so its effective aspect is the reciprocal). Small sizes only — cost is a fixed floor per
# kind, so we stay near the 11×14 cost and never letterbox.
#   (variant_id, aspect w/h)
_POSTER_VARIANTS = [
    (101127, 1.00),  # 12×12 square
    (62103,  0.82),  # 9×11
    (43141,  0.80),  # 16×20
    (43135,  0.79),  # 11×14
    (101122, 0.77),  # 10×13
    (101110, 0.75),  # 12×16
    (101125, 0.65),  # 11×17
    (101123, 0.59),  # 10×17
    (101108, 0.50),  # 10×20
]
def _poster_variant_angle(art_url: str):
    a = _art_aspect(art_url)
    angle, eff = 0, a
    if a > 1.15:                 # landscape → rotate; effective aspect is the reciprocal
        angle, eff = 90, (1.0 / a if a else 1.0)
    vid = min(_POSTER_VARIANTS, key=lambda t: abs(t[1] - eff))[0]
    return vid, angle


def get_product_mockup(art_url: str, kind: str, placement: str = "wrap", variant_override=None) -> dict:
    """Create (or reuse) a draft Printify product for this art on a sticker/poster and
    return its mockup. `variant_override` picks a specific variant (e.g. a Comfort Colors
    color). `placement` controls the front-image geometry: 'wrap' (default,
    full print area) vs 'insert' (smaller centered front patch — for mug/enamel).
    Returns {ok, mockup_url, product_id, variant_id, price_cents, placement}."""
    if kind not in KINDS:
        return {"ok": False, "error": "bad_kind"}
    placement = placement if placement in PLACEMENTS else "wrap"
    cache = _load()
    # Key the cache by placement too, so wrap vs insert render & cache separately. The
    # legacy (placement-less) key is treated as 'wrap' so existing cached entries are reused.
    ck = f"{kind}:{art_url}" if placement == "wrap" else f"{kind}:{placement}:{art_url}"
    if variant_override:
        ck += f":v{variant_override}"   # color-specific mockups cache separately
    if ck in cache and cache[ck].get("mockup_url"):
        return {"ok": True, "placement": placement, **cache[ck]}
    spec = KINDS[kind]
    scale = _placement_scale(spec, placement)
    # Poster: pick the size + rotation that matches the art's aspect so it fills the frame
    # instead of letterboxing. Other kinds keep their fixed variant unless a specific
    # variant (e.g. a Comfort Colors color) is requested.
    variant_id, angle = spec["variant"], 0
    if kind == "poster":
        variant_id, angle = _poster_variant_angle(art_url)
    elif variant_override:
        try:
            variant_id = int(variant_override)
        except (TypeError, ValueError):
            pass
    up = upload_image(art_url, f"{kind}.png")
    if not up.get("ok"):
        return {"ok": False, "error": "upload_failed", "detail": up.get("error")}
    image_id = (up.get("body") or {}).get("id")
    if not image_id:
        return {"ok": False, "error": "no_image_id"}
    product = {
        "title": f"Edgeless {spec['label']}",
        "description": "Curated design — Edgeless.",
        "blueprint_id": spec["blueprint"],
        "print_provider_id": spec["provider"],
        "variants": [{"id": variant_id, "price": spec["price_cents"], "is_enabled": True}],
        "print_areas": [{
            "variant_ids": [variant_id],
            "placeholders": [{
                # 'insert' centers a smaller front patch; 'wrap' fills the full print area.
                "position": "front",
                "images": [{"id": image_id, "x": 0.5, "y": 0.5, "scale": scale, "angle": angle}],
            }],
        }],
    }
    pr = _req("POST", f"/shops/{SHOP_ID}/products.json", product)
    if not pr.get("ok"):
        return {"ok": False, "error": "product_failed", "detail": pr.get("error")}
    body = pr.get("body") or {}
    pid = body.get("id")
    imgs = body.get("images") or []
    mock = next((i.get("src") for i in imgs if i.get("is_default")), None) or (imgs[0].get("src") if imgs else None)
    # Landscape posters print rotated 90° on a portrait sheet, so the Printify mockup shows the
    # art SIDEWAYS. Rotate the mockup +90° (CCW) and re-host so the buyer sees their landscape
    # art UPRIGHT (as they'll hang it). Print unchanged; only the preview is corrected.
    if angle == 90 and mock:
        try:
            import urllib.request as _u, io, hashlib
            from PIL import Image
            import r2_client as _r2
            req = _u.Request(mock, headers={"User-Agent": "Mozilla/5.0"})
            with _u.urlopen(req, timeout=25) as r:
                raw = r.read()
            rot = Image.open(io.BytesIO(raw)).convert("RGB").rotate(90, expand=True)
            buf = io.BytesIO()
            rot.save(buf, format="JPEG", quality=90)
            key = f"designs/mockups/poster-rot-{hashlib.sha256(mock.encode()).hexdigest()[:14]}.jpg"
            up2 = _r2.upload_bytes(key, buf.getvalue(), "image/jpeg")
            if up2.get("ok"):
                mock = up2["url"]
        except Exception:
            pass  # fall back to the (sideways) Printify mockup rather than none
    out = {"mockup_url": mock, "product_id": pid, "variant_id": variant_id,
           "price_cents": spec["price_cents"], "placement": placement}
    cache[ck] = out
    _save(cache)
    return {"ok": bool(mock), **out}


def _printify_recipient(r: dict) -> dict:
    """Map our normalized address → Printify address_to shape (region, not state_code)."""
    name = (r.get("name") or "Customer").split(" ", 1)
    return {
        "first_name": r.get("first_name") or name[0],
        "last_name": r.get("last_name") or (name[1] if len(name) > 1 else name[0]),
        "email": r.get("email") or "orders@edgelesslab.com",
        "country": r.get("country") or r.get("country_code") or "US",
        "region": r.get("state") or r.get("state_code") or r.get("region") or "",
        "city": r.get("city") or "", "address1": r.get("address1") or "",
        "address2": r.get("address2") or "", "zip": r.get("zip") or "",
    }


def estimate_cost(*, kind: str, recipient: dict, art_url: str = "") -> dict:
    """REAL Printify cost for a kind shipped to an address: production cost (KINDS cost_cents,
    constant per variant) + real live shipping (orders/shipping.json). Returns
    {ok, total_cents, item_cents, ship_cents}. Prices at-cost / floor at the true break-even."""
    if kind not in KINDS:
        return {"ok": False, "error": "bad_kind"}
    spec = KINDS[kind]
    item_cents = spec.get("cost_cents")
    if item_cents is None:
        return {"ok": False, "error": "no_cost_for_kind"}
    # At-cost/floor basis must cover the PRICIEST variant we might actually ship — larger poster
    # sizes and bigger cc-tee sizes carry an upcharge over the base variant. Per owner: no
    # per-variant cost map — just round the basis UP by a safe factor for the size-variable
    # kinds so an at-cost sale of a big variant never lands below production cost.
    _COST_BUFFER = {"poster": 1.5, "cc-tee": 1.3}
    item_cents = int(round(int(item_cents) * _COST_BUFFER.get(kind, 1.0)))
    # Live shipping via the blueprint form (no product needed).
    s = _req("POST", f"/shops/{SHOP_ID}/orders/shipping.json", {
        "line_items": [{"print_provider_id": spec["provider"], "blueprint_id": spec["blueprint"],
                        "variant_id": spec["variant"], "quantity": 1}],
        "address_to": _printify_recipient(recipient)})
    ship_cents = ((s.get("body") or {}).get("standard")) if s.get("ok") else None
    if ship_cents is None:
        return {"ok": False, "error": "shipping_unavailable", "detail": str(s.get("error"))[:160]}
    return {"ok": True, "total_cents": int(item_cents) + int(ship_cents),
            "item_cents": int(item_cents), "ship_cents": int(ship_cents),
            "variant_id": spec["variant"]}


def order_exists(external_id: str) -> str | None:
    """Idempotency: return the id of an existing order with this external_id, else None,
    so a webhook retry doesn't create a second (real, billable) Printify order. Printify
    has no external_id filter param, so we scan recent orders (retries arrive within minutes).
    Scans 100 (Printify's page max) so a retry after a burst of other orders still de-dupes —
    matters now that the webhook returns non-2xx on transient failure and Stripe re-delivers."""
    r = _req("GET", f"/shops/{SHOP_ID}/orders.json?limit=100")
    if not r.get("ok"):
        return None
    rows = (r.get("body") or {}).get("data") or []
    for o in rows:
        if str(o.get("external_id")) == str(external_id):
            return o.get("id")
    return None


def create_order(*, external_id: str, product_id: str, variant_id: int, recipient: dict) -> dict:
    """Create a REAL Printify order. NOTE: Printify has no true 'draft' order — this
    enters the approval/charge flow and can be auto-sent to production. Callers MUST
    gate this behind live mode + a Printify payment method on file. In test/demo mode
    the service simulates instead of calling this (see main.py /pay)."""
    payload = {
        "external_id": external_id,
        "label": "Edgeless",
        "line_items": [{"product_id": product_id, "variant_id": variant_id, "quantity": 1}],
        "shipping_method": 1,
        "send_shipping_notification": False,
        "address_to": recipient,
    }
    return _req("POST", f"/shops/{SHOP_ID}/orders.json", payload)
