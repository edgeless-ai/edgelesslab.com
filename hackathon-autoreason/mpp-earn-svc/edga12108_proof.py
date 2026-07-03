"""
EDGA-12108 verifier: prove live register_image + create_product(draft) end-to-end.

Runs the same pod_client used in production. Sources `fourthwall/.env` so creds
match the live service. Writes a JSON result next to this script, prints a
single short summary line, and exits 0 on success. Intended as a one-shot
verification — delete or move to tests/ after archival.
"""
from __future__ import annotations

import json, os, sys, time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)              # hackathon-autoreason/
FW_ENV = os.path.join(PROJECT, "fourthwall", ".env")
sys.path.insert(0, HERE)                     # so `import pod_client` resolves

# Load FW_* -> POD_* translation, exactly like start.sh does.
if not os.path.isfile(FW_ENV):
    print(f"missing: {FW_ENV}", file=sys.stderr); sys.exit(2)
with open(FW_ENV) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())
# Translate FW_* -> POD_* for pod_client
os.environ["POD_BASE"]         = os.environ.get("FW_STORE_URL", "")
os.environ["POD_API_USER"]     = os.environ.get("FW_API_EMAIL", "")
os.environ["POD_API_KEY"]      = os.environ.get("FW_API_KEY", "")
os.environ["POD_API_PASSWORD"] = os.environ.get("FW_API_PASSWORD", "")

import pod_client as pod  # noqa: E402

ART = os.path.join(PROJECT, "merch-demo", "public", "art")
img_path = sorted(
    (os.path.join(ART, n) for n in os.listdir(ART) if n.lower().endswith(".jpg")),
    key=lambda p: os.path.getsize(p),
)[0]
with open(img_path, "rb") as f:
    img_bytes = f.read()

# Pick a real product template via the live API (cached list call).
list_resp = pod._request("GET", "/product-templates?limit=100")
if not list_resp.get("ok"):
    print(f"templates lookup failed: {list_resp}", file=sys.stderr); sys.exit(3)
templates = ((list_resp.get("body") or {}).get("items")
             or (list_resp.get("body") or {}).get("results")
             or [])
items_are_dicts = isinstance(templates, dict)
if items_are_dicts:
    templates = list(templates.values())
# Pick something simple — first t-shirt style with a small base price.
def _pick_template(items):
    if not isinstance(items, list):
        return None
    # Prefer "Supersoft T-Shirt" type entries; fall back to the first item.
    for t in items:
        if not isinstance(t, dict):
            continue
        name = (t.get("name") or "").lower()
        if "supersoft" in name or "t-shirt" in name or "tee" in name:
            return t
    for t in items:
        if isinstance(t, dict):
            return t
    return None
t = _pick_template(templates)
if not t:
    print(f"no templates in response: keys={list((list_resp.get('body') or {}).keys())[:8]}", file=sys.stderr); sys.exit(3)
template_id = t.get("id") or t.get("productTemplateId") or t.get("product_template_id")
template_name = t.get("name") or template_id
print(f"template picked: {template_name} ({template_id})")

# Step 1: register_image (the upload-url flow in pod_client).
up = pod.register_image(img_bytes, content_type="image/jpeg",
                        filename=f"edga12108-{int(time.time())}.jpg")
if not up.get("ok"):
    print(f"register_image failed: {up}", file=sys.stderr); sys.exit(4)
media_id = up["media_id"]
print(f"register_image: media_id={media_id} cached={up.get('cached')} bytes={up.get('bytes')}")

# Step 2: create_product(draft)
name = f"EDGA-12108 live draft {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%MZ')}"
pr = pod.create_product(template_id=template_id, media_id=media_id, name=name,
                        description="Live creation proof for EDGA-12108 — agent created a real Fourthwall draft product.",
                        price_cents=2999, publish=False)
if not pr.get("ok"):
    print(f"create_product failed: {pr}", file=sys.stderr); sys.exit(5)
product = pr.get("body") or {}
product_id = (product.get("id")
              or product.get("productId")
              or product.get("product_id"))
shop_id = "sh_6fc34dca-cd92-4764-8df8-88c45dda2a35"
dashboard_url = f"https://my-shop.fourthwall.com/admin/products/{product_id}" if product_id else None

result = {
    "ran_at": datetime.now(timezone.utc).isoformat(),
    "image_file": os.path.basename(img_path),
    "image_bytes": len(img_bytes),
    "template_id": template_id,
    "template_name": template_name,
    "media_id": media_id,
    "media_cached": up.get("cached"),
    "create_status": pr.get("status"),
    "product_id": product_id,
    "dashboard_url": dashboard_url,
    "raw_product_keys": sorted(list(product.keys()))[:25],
    "publish_on_create": False,
}
out_path = os.path.join(HERE, ".edga12108_proof.json")
with open(out_path, "w") as f:
    json.dump(result, f, indent=2)

print("EDGA-12108 LIVE draft product created:")
print(f"  product_id={product_id}")
print(f"  dashboard={dashboard_url}")
print(f"  proof={out_path}")
