"""
Build the static BLANK layer for the instant editor: for every blank in the catalog,
fetch its clean flat ghost image + exact front print-area coordinates from Printful's
template API, store them locally. These are static template assets (plain fetches, NOT
rate-limited renders), so the customizer can composite art onto them client-side with
zero render latency. The slow mockup render becomes optional (order/confirm only).
"""
import json
import os
import urllib.request

import printful_client as pf

TEMPLATES = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/pod-templates.json"
OUT_DIR = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/public/blanks"
OUT_JSON = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/blanks.json"
UA = {"User-Agent": "Mozilla/5.0"}


def front_template(product_id, variant_id):
    r = pf._request("GET", f"/mockup-generator/templates/{product_id}")
    res = (r.get("body") or {}).get("result") or {}
    tmpls = {t["template_id"]: t for t in res.get("templates", [])}
    vm = {v["variant_id"]: v for v in res.get("variant_mapping", [])}
    v = vm.get(variant_id) or (res.get("variant_mapping") or [{}])[0]
    for t in (v or {}).get("templates", []):
        if t.get("placement") == "front":
            return tmpls.get(t["template_id"])
    return None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    blanks = json.load(open(TEMPLATES))
    out = {}
    for b in blanks:
        pid, vid = b["id"], b["catalog_variant_id"]
        try:
            t = front_template(pid, vid)
            if not t or not t.get("image_url"):
                print(f"  SKIP {pid} {b['name']}: no front template", flush=True); continue
            tw, th = t["template_width"], t["template_height"]
            area = {
                "left": round(100 * t["print_area_left"] / tw, 2),
                "top": round(100 * t["print_area_top"] / th, 2),
                "width": round(100 * t["print_area_width"] / tw, 2),
                "height": round(100 * t["print_area_height"] / th, 2),
            }
            dst = os.path.join(OUT_DIR, f"{pid}.png")
            req = urllib.request.Request(t["image_url"], headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                open(dst, "wb").write(r.read())
            out[str(pid)] = {"ghost": f"/blanks/{pid}.png", "area": area}
            print(f"  OK {pid} {b['name'][:36]:36} area={area}", flush=True)
        except Exception as e:
            print(f"  FAIL {pid}: {str(e)[:90]}", flush=True)
    json.dump(out, open(OUT_JSON, "w"), indent=1)
    print(f"\nwrote {OUT_JSON} with {len(out)} blanks", flush=True)


if __name__ == "__main__":
    main()
