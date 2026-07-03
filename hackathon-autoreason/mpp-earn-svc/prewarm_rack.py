"""
Pre-render every rack design onto a shirt and bake the render URL into designs.json,
so the off-the-rack product view is instant (no live render wait). Mirrors "save a
render from when it was made." Idempotent: skips designs that already have a mockup.
"""
import json
import time
import urllib.error
import urllib.request

DESIGNS = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/designs.json"
EARN = "http://127.0.0.1:8400/mockup"
PRODUCT_ID = 12        # Gildan 64000
VARIANT_ID = 505       # Black (the rack's locked colorway)


def render(art_url):
    body = json.dumps({"product_id": PRODUCT_ID, "catalog_variant_id": VARIANT_ID, "art_url": art_url}).encode()
    for attempt in range(8):
        req = urllib.request.Request(EARN, method="POST", data=body)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            if d.get("mockup_url"):
                return d["mockup_url"]
            print("   pending, retry…", flush=True)
            time.sleep(10)
        except urllib.error.HTTPError as e:
            # 502 wraps Printful's per-minute rate limit → wait out the window
            print(f"   {e.code} rate-limited, backing off 62s", flush=True)
            time.sleep(62)
        except Exception as e:
            print("   err", str(e)[:80], flush=True)
            time.sleep(10)
    return None


def main():
    designs = json.load(open(DESIGNS))
    done = 0
    for d in designs:
        if d.get("verdict") != "premium":
            continue
        if d.get("mockup"):
            done += 1
            continue
        url = render(d["art_url"])
        if url:
            d["mockup"] = url
            done += 1
            json.dump(designs, open(DESIGNS, "w"), indent=1)  # checkpoint
            print(f"  OK {d['slug']} -> {url[:70]}", flush=True)
        else:
            print(f"  FAIL {d['slug']}", flush=True)
        time.sleep(2)
    print(f"\nrack pre-rendered: {done} designs have a mockup", flush=True)


if __name__ == "__main__":
    main()
