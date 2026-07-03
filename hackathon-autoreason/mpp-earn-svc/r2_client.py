"""
Cloudflare R2 art hosting for the headless mockup flow.

Art must be at a PUBLIC URL for Printful's mockup generator + order print files.
Temp designs (for mockups) live under designs/tmp/; designs for actual ORDERS
get promoted to designs/orders/ (kept). This is what lets agents only spend on
URL-hosted art instead of spamming.

Env: CLOUDFLARE_API_TOKEN (R2 edit) — in /Users/djm/claude-projects/.env.
"""
from __future__ import annotations
import hashlib
import os
import urllib.error
import urllib.request
from typing import Any, Dict

ACCOUNT_ID = "ae4279904a9110de9f5bd770c41718da"
BUCKET = "edgeless-assets"
PUBLIC_BASE = "https://pub-bb7dda5df9fe4493a86f5ca35c42fb79.r2.dev"
_API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/r2/buckets/{BUCKET}/objects"


def _tok() -> str:
    return os.environ.get("CLOUDFLARE_API_TOKEN", "")


def enabled() -> bool:
    return bool(_tok())


def public_url(key: str) -> str:
    return f"{PUBLIC_BASE}/{key.lstrip('/')}"


def upload_bytes(key: str, data: bytes, content_type: str = "image/jpeg") -> Dict[str, Any]:
    """PUT object to R2 via the CF REST API. Returns {ok, url|error}."""
    if not _tok():
        return {"ok": False, "error": "cloudflare_not_configured"}
    req = urllib.request.Request(f"{_API}/{key.lstrip('/')}", method="PUT", data=data)
    req.add_header("Authorization", f"Bearer {_tok()}")
    req.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
        return {"ok": True, "url": public_url(key), "key": key, "bytes": len(data)}
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": e.read().decode("utf-8", "replace")[:200], "status": e.code}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


def upload_file(local_path: str, *, prefix: str = "designs/tmp",
                content_type: str = "image/jpeg") -> Dict[str, Any]:
    """Upload a local art file; key is content-addressed so identical art reuses one object."""
    data = open(local_path, "rb").read()
    digest = hashlib.sha256(data).hexdigest()[:16]
    ext = os.path.splitext(local_path)[1] or ".jpg"
    return upload_bytes(f"{prefix}/{digest}{ext}", data, content_type)
