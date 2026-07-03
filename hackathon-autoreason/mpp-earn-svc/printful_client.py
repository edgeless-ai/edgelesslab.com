"""
Printful POD client — HEADLESS / white-label drop-ship.

Flow: edgelesslab.com → OUR Stripe (we are Merchant of Record) → on
payment_intent.succeeded, create a Printful DRAFT order → confirm it for
fulfillment. The customer never sees Printful.

Replaces the Fourthwall pod_client (FW is Merchant-of-Record — can't own-checkout).
Print files are pulled from a public HTTPS URL (no presigned upload — the GCS
signing that blocked Fourthwall is gone).

Env (in /Users/djm/claude-projects/.env):
    PRINTFUL_API_KEY   - Bearer private token (verified working)
    PRINTFUL_STORE_ID  - id of the Manual/API store (account-level token → required header)

Spec: hackathon-autoreason/docs/pod-printful-integration.md
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

BASE = "https://api.printful.com"
DEFAULT_PRODUCT_ID = 71  # Bella+Canvas 3001 "Unisex Staple T-Shirt" (verified 2026-06-22)


def _key() -> str:
    return os.environ.get("PRINTFUL_API_KEY", "")


def _store_id() -> str:
    return os.environ.get("PRINTFUL_STORE_ID", "")


def _enabled() -> bool:
    return bool(_key())


def _request(method: str, path: str, *, body: Optional[dict] = None,
             timeout: float = 30.0) -> Dict[str, Any]:
    """Authenticated JSON request to the Printful API. Returns {ok, status, body|error}."""
    if not _key():
        return {"ok": False, "status": 0, "error": "printful_not_configured"}
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data)
    req.add_header("Authorization", f"Bearer {_key()}")
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    # account-level token → send the store id on store-scoped calls
    if _store_id():
        req.add_header("X-PF-Store-Id", _store_id())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return {"ok": True, "status": resp.status, "body": json.loads(raw) if raw else None}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")[:500]
        return {"ok": False, "status": e.code, "error": raw or e.reason}
    except urllib.error.URLError as e:
        return {"ok": False, "status": 0, "error": str(e.reason)}
    except Exception as e:  # pragma: no cover
        return {"ok": False, "status": 0, "error": str(e)[:300]}


# --------------------------------------------------------------------------- #
# Health / catalog
# --------------------------------------------------------------------------- #
def health() -> Dict[str, Any]:
    """Auth + store probe."""
    if not _enabled():
        return {"configured": False}
    prod = _request("GET", f"/v2/catalog-products/{DEFAULT_PRODUCT_ID}")
    stores = _request("GET", "/v2/stores")
    store_count = len((stores.get("body") or {}).get("data", []) or []) if stores["ok"] else None
    return {
        "configured": True,
        "auth_ok": prod["ok"],
        "status": prod.get("status"),
        "store_id_set": bool(_store_id()),
        "store_count": store_count,
        "error": prod.get("error") if not prod["ok"] else None,
    }


def get_catalog_product(product_id: int = DEFAULT_PRODUCT_ID) -> Dict[str, Any]:
    return _request("GET", f"/v2/catalog-products/{product_id}")


def get_variants(product_id: int = DEFAULT_PRODUCT_ID, limit: int = 100) -> Dict[str, Any]:
    return _request("GET", f"/v2/catalog-products/{product_id}/catalog-variants?limit={limit}")


# --------------------------------------------------------------------------- #
# Order flow (the dealbreaker): create draft -> confirm
# --------------------------------------------------------------------------- #
def build_catalog_item(*, catalog_variant_id: int, art_url: str, name: str,
                       retail_price: str, placement: str = "front",
                       technique: str = "dtg", quantity: int = 1) -> Dict[str, Any]:
    """One order line: a catalog variant with our art on a placement (public URL pull)."""
    return {
        "source": "catalog",
        "catalog_variant_id": catalog_variant_id,
        "quantity": quantity,
        "retail_price": retail_price,
        "name": name,
        "placements": [{
            "placement": placement,
            "technique": technique,
            "layers": [{"type": "file", "url": art_url}],
        }],
    }


def create_draft_order(*, stripe_id: str, recipient: Dict[str, Any],
                       items: List[Dict[str, Any]], shipping: str = "STANDARD") -> Dict[str, Any]:
    """POST /v2/orders — draft, NOT charged. `stripe_id` -> external_id for idempotency.

    `items` are dicts from build_catalog_item(). Returns {ok, status, body|error};
    on success body.data.id is the order id for confirm_order().
    """
    payload = {
        "external_id": stripe_id,
        "shipping": shipping,
        "recipient": recipient,
        "order_items": items,
    }
    return _request("POST", "/v2/orders", body=payload)


def estimate_costs(*, catalog_variant_id: int, recipient: Dict[str, Any],
                   quantity: int = 1, art_url: str = "") -> Dict[str, Any]:
    """REAL Printful cost for a variant shipped to a specific address — NOT an estimate
    we invent, but Printful's own cost calculation (subtotal + shipping + tax + fees).

    `recipient` is the v1 estimate shape: {address1, city, state_code, country_code, zip}.
    Returns {ok, total_cents, costs} where total_cents is what Printful will actually
    charge us. Used to price at-cost sales at the exact break-even number.
    """
    item: Dict[str, Any] = {"variant_id": int(catalog_variant_id), "quantity": int(quantity)}
    if art_url:
        item["files"] = [{"url": art_url}]
    r = _request("POST", "/orders/estimate-costs", body={"recipient": recipient, "items": [item]})
    if not r.get("ok"):
        return {"ok": False, "error": r.get("error"), "status": r.get("status")}
    costs = ((r.get("body") or {}).get("result") or {}).get("costs") or {}
    total = costs.get("total")
    if total is None:
        return {"ok": False, "error": "no_total_in_estimate", "costs": costs}
    return {"ok": True, "total_cents": round(float(total) * 100), "costs": costs}


def confirm_order(order_id: int | str) -> Dict[str, Any]:
    """POST /v2/orders/{id}/confirmation — submit for fulfillment (charges our Printful balance).

    Call ONLY after Stripe payment_intent.succeeded. Falls back to /confirm if
    /confirmation 404s (the two research agents disagreed; spec says /confirmation).
    """
    r = _request("POST", f"/v2/orders/{order_id}/confirmation")
    if (not r["ok"]) and r.get("status") == 404:
        r = _request("POST", f"/v2/orders/{order_id}/confirm")
    return r


def get_order(order_id: int | str) -> Dict[str, Any]:
    return _request("GET", f"/v2/orders/{order_id}")


def find_order_by_external_id(stripe_id: str) -> Dict[str, Any]:
    """Idempotency helper: look up an existing order by our Stripe external_id."""
    return _request("GET", f"/v2/orders?external_id={urllib.parse.quote(stripe_id)}")


# --------------------------------------------------------------------------- #
# Webhooks (shipment tracking -> our own branded emails)
# --------------------------------------------------------------------------- #
def register_webhook(callback_url: str,
                     types: Optional[List[str]] = None) -> Dict[str, Any]:
    """v1 /webhooks (set/replace — NOT additive). Send X-PF-Store-Id on account token."""
    types = types or ["package_shipped", "order_failed", "order_canceled",
                      "order_put_hold", "order_remove_hold"]
    return _request("POST", "/webhooks", body={"url": callback_url, "types": types})


# --------------------------------------------------------------------------- #
# Mockups — photorealistic art-on-garment render (async). THE customizer preview.
# --------------------------------------------------------------------------- #
def get_mockup_styles(product_id: int = DEFAULT_PRODUCT_ID) -> Dict[str, Any]:
    """GET /v2/catalog-products/{id}/mockup-styles → style ids to feed create_mockup_task."""
    return _request("GET", f"/v2/catalog-products/{product_id}/mockup-styles")


def create_mockup_task(*, product_id: int, catalog_variant_ids: List[int], art_url: str,
                       placement: str = "front", technique: str = "dtg",
                       mockup_style_ids: Optional[List[int]] = None,
                       fmt: str = "jpg") -> Dict[str, Any]:
    """POST /v2/mockup-tasks — renders our art onto the real garment. art_url must be PUBLIC."""
    product = {
        "source": "catalog",
        "catalog_product_id": product_id,
        "catalog_variant_ids": catalog_variant_ids,
        "placements": [{
            "placement": placement,
            "technique": technique,
            "layers": [{"type": "file", "url": art_url}],
        }],
    }
    if mockup_style_ids:
        product["mockup_style_ids"] = mockup_style_ids
    return _request("POST", "/v2/mockup-tasks", body={"format": fmt, "products": [product]})


def poll_mockup(task_id: int | str) -> Dict[str, Any]:
    """GET /v2/mockup-tasks?id={id} — status pending|completed|failed; urls under data.catalog_variant_mockups."""
    return _request("GET", f"/v2/mockup-tasks?id={task_id}")
