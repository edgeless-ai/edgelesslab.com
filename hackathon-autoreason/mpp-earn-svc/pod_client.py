"""
Print-on-Demand Partner client.

Wraps the live API surface needed to take a paid design and create a real
printable product + an order record. The functions are intentionally
generic (no partner name baked in) so we don't claim cobranding.

Required environment variables:
    POD_BASE         - shop base URL (e.g. https://edgelesslab-shop.fourthwall.com)
    POD_API_USER     - API user email
    POD_API_KEY      - API key (ptkn_*)
    POD_API_PASSWORD - API user password

Auth flow follows the published Platform API: Basic Auth with the API key
as username and the API password as the password.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Cache: avoid re-uploading the same image bytes to the partner's CDN.
# Keyed by sha256(bytes). The cache file lives next to the service.
# ---------------------------------------------------------------------------
CACHE_PATH = os.path.join(os.path.dirname(__file__), "pod_image_cache.json")


def _load_cache() -> Dict[str, Any]:
    try:
        with open(CACHE_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_cache(cache: Dict[str, Any]) -> None:
    try:
        with open(CACHE_PATH, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception:
        pass


def _auth_header() -> str:
    user = os.environ.get("POD_API_USER", "")
    key = os.environ.get("POD_API_KEY", "")
    pw = os.environ.get("POD_API_PASSWORD", "")
    # Fourthwall Platform API uses Basic auth = API-user (email-like username) : password.
    # Verified working via direct curl. Prefer the username; fall back to a raw key.
    if user and pw:
        token = base64.b64encode(f"{user}:{pw}".encode()).decode()
        return f"Basic {token}"
    if key and pw:
        token = base64.b64encode(f"{key}:{pw}".encode()).decode()
        return f"Basic {token}"
    return ""


def _base() -> str:
    # Platform API base — NOT the storefront domain. POD_BASE points at the
    # storefront (edgelesslab-shop.fourthwall.com), which 302-redirects to HTML
    # and breaks JSON parsing. The real Platform API lives here.
    return os.environ.get(
        "POD_API_BASE", "https://api.fourthwall.com/open-api/v1.0"
    ).rstrip("/")


def _enabled() -> bool:
    return bool(_base() and _auth_header())


def _request(method: str, path: str, *, data: Optional[bytes] = None,
             content_type: str = "application/json", timeout: float = 20.0) -> Dict[str, Any]:
    """Authenticated JSON request to the partner API."""
    url = _base() + path
    req = urllib.request.Request(url, method=method, data=data)
    req.add_header("Authorization", _auth_header())
    req.add_header("Accept", "application/json")
    if data is not None and content_type:
        req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return {
                "ok": True,
                "status": resp.status,
                "body": json.loads(body) if body else None,
            }
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:400]
        return {"ok": False, "status": e.code, "error": body or e.reason}
    except urllib.error.URLError as e:
        return {"ok": False, "status": 0, "error": str(e.reason)}
    except Exception as e:  # pragma: no cover
        return {"ok": False, "status": 0, "error": str(e)[:300]}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def health() -> Dict[str, Any]:
    """Cheap health probe: GET /shops/current."""
    if not _enabled():
        return {"configured": False}
    r = _request("GET", "/shops/current")
    return {
        "configured": True,
        "base": _base(),
        "live_ok": r["ok"],
        "status": r.get("status"),
        "shop_id": (r.get("body") or {}).get("id") if r["ok"] else None,
        "error": r.get("error") if not r["ok"] else None,
    }


def list_templates(page: int = 1, page_size: int = 50) -> Dict[str, Any]:
    """GET /product-templates/page/<n>."""
    r = _request("GET", f"/product-templates?limit={page_size}")
    return r


def register_image(image_bytes: bytes, *, content_type: str = "image/jpeg",
                   filename: str = "design.jpg") -> Dict[str, Any]:
    """Upload design bytes via the two-step flow:
        POST /media/upload-url        -> { upload_url, media_id }
        PUT  upload_url (raw bytes)   -> 200
    Returns: { ok, media_id, error? }
    """
    if not _enabled():
        return {"ok": False, "error": "pod_not_configured"}
    digest = hashlib.sha256(image_bytes).hexdigest()
    cache = _load_cache()
    cached = cache.get(digest)
    if cached and cached.get("media_id"):
        return {"ok": True, "media_id": cached["media_id"], "cached": True, "bytes": len(image_bytes)}

    # 1. Ask the partner for a presigned upload URL.
    r1 = _request("POST", "/media/upload-url",
                  data=json.dumps({
                      "fileName": filename,
                      "contentType": content_type,
                      "contentLength": len(image_bytes),
                  }).encode())
    if not r1["ok"]:
        return {"ok": False, "stage": "upload_url", "error": r1.get("error"), "status": r1.get("status")}
    upload_url = ((r1.get("body") or {}).get("uploadUrl")
                  or (r1.get("body") or {}).get("upload_url"))
    media_id = ((r1.get("body") or {}).get("mediaId")
                or (r1.get("body") or {}).get("media_id"))
    if not upload_url or not media_id:
        return {"ok": False, "stage": "upload_url", "error": "missing upload_url/media_id",
                "body": r1.get("body")}

    # 2. PUT raw bytes to the presigned URL.
    try:
        put = urllib.request.Request(upload_url, method="PUT", data=image_bytes)
        put.add_header("Content-Type", content_type)
        with urllib.request.urlopen(put, timeout=20.0) as resp:
            _ = resp.read()
    except urllib.error.HTTPError as e:
        return {"ok": False, "stage": "upload_put", "status": e.code,
                "error": e.read().decode("utf-8", errors="replace")[:300]}
    except Exception as e:  # pragma: no cover
        return {"ok": False, "stage": "upload_put", "error": str(e)[:300]}

    cache[digest] = {"media_id": media_id, "ts": time.time(), "bytes": len(image_bytes)}
    _save_cache(cache)
    return {"ok": True, "media_id": media_id, "cached": False, "bytes": len(image_bytes)}


def create_product(*, template_id: str, media_id: str, name: str,
                   description: str = "", price_cents: int = 2999,
                   publish: bool = False) -> Dict[str, Any]:
    """POST /products with the chosen template + uploaded media.

    `publish=False` keeps the product as a draft so the demo cannot leak live
    merchandise during the hackathon window.
    """
    if not _enabled():
        return {"ok": False, "error": "pod_not_configured"}
    body = {
        "name": name,
        "description": description,
        "price": price_cents / 100.0,
        "currency": "USD",
        "productTemplateId": template_id,
        "mediaIds": [media_id],
        "publishOnCreate": publish,
        "draft": not publish,
    }
    r = _request("POST", "/products", data=json.dumps(body).encode())
    return r


def create_order(*, product_id: str, intent_id: str,
                 buyer_email: str = "demo@edgeless.local") -> Dict[str, Any]:
    """POST /orders with a fulfilled-product reference."""
    if not _enabled():
        return {"ok": False, "error": "pod_not_configured"}
    body = {
        "productId": product_id,
        "quantity": 1,
        "buyerEmail": buyer_email,
        "externalOrderId": intent_id,
    }
    r = _request("POST", "/orders", data=json.dumps(body).encode())
    return r
