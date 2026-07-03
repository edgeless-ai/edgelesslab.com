"""
Prewarm the Printful mockup cache for every (blank, art) combo the demo shows.

Renders are slow (~15-25s each) but only need to happen ONCE — results are
written to mockup_cache.json, which the running service loads on startup. After
this runs, every customizer pick is an instant cache hit (the browser just
fetches an already-rendered URL), so the demo never shows a live render wait.

Run via prewarm.sh (which loads the API keys from .env).
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import printful_client as pf
import r2_client as r2

ART_DIR = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/public/art"
TEMPLATES_FILE = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/pod-templates.json"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "mockup_cache.json")

# The three art slugs the rail offers (must match artPicks in main.jsx).
ART_SLUGS = [
    "0571c9bd-34a7-427e-bbc0-51327bd19de7_0.jpg",  # Hermes Vessel
    "03f9a3fd-69c9-4f4d-8d19-c4ec703772a1_0.jpg",  # Damiless Signal
    "0645a00c-724e-4494-937c-e14b3fe82d86_0.jpg",  # Nous Compass
]


def load_cache():
    try:
        with open(CACHE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _is_rate_limited(resp):
    return "TooManyRequests" in str(resp.get("error", "")) or "too many requests" in str(resp.get("error", "")).lower()


def render_one(product_id, variant_id, art_slug, art_url):
    # Printful rate-limits the mockup generator per-minute; back off and retry.
    task = None
    for attempt in range(5):
        task = pf.create_mockup_task(product_id=product_id, catalog_variant_ids=[variant_id], art_url=art_url)
        if task.get("ok"):
            break
        if _is_rate_limited(task):
            time.sleep(62)
            continue
        return None, f"create_failed: {str(task.get('error'))[:120]}"
    if not task or not task.get("ok"):
        return None, "create_failed: rate_limited_giveup"
    b = task.get("body") or {}
    cand = b.get("data", b)
    if isinstance(cand, list):
        cand = cand[0] if cand else {}
    task_id = b.get("id") or (cand.get("id") if isinstance(cand, dict) else None)
    for _ in range(20):
        time.sleep(3)
        p = pf.poll_mockup(task_id)
        data = (p.get("body") or {}).get("data", {})
        if isinstance(data, list):
            data = data[0] if data else {}
        st = data.get("status")
        if st == "completed":
            for m in data.get("catalog_variant_mockups", []):
                for mk in m.get("mockups", []):
                    if mk.get("mockup_url"):
                        return mk["mockup_url"], None
            return None, "completed_no_url"
        if st == "failed":
            return None, f"failed: {str(data)[:120]}"
    return None, "timeout"


def main():
    templates = json.load(open(TEMPLATES_FILE))
    cache = load_cache()

    # Upload the 3 art files to R2 once (content-addressed → reused).
    art_urls = {}
    for slug in ART_SLUGS:
        path = os.path.join(ART_DIR, slug)
        up = r2.upload_file(path)
        if not up.get("ok"):
            print(f"R2 upload FAILED for {slug}: {up.get('error')}", flush=True)
            continue
        art_urls[slug] = up["url"]
    print(f"art uploaded: {list(art_urls)}", flush=True)

    jobs = []
    for t in templates:
        for slug in ART_SLUGS:
            key = f"{t['id']}:{t['catalog_variant_id']}:{slug}"
            if cache.get(key, {}).get("mockup_url"):
                continue  # already cached
            if slug not in art_urls:
                continue
            jobs.append((key, t["id"], t["catalog_variant_id"], slug, art_urls[slug]))

    print(f"{len(jobs)} combos to render ({len(templates)} blanks × {len(ART_SLUGS)} art)", flush=True)
    done = fail = 0
    # Sequential + spacing keeps us under Printful's mockup-generator rate limit.
    for (key, pid, vid, slug, aurl) in jobs:
        url, err = render_one(pid, vid, slug, aurl)
        if url:
            cache[key] = {"mockup_url": url, "art_url": art_urls[slug]}
            done += 1
            json.dump(cache, open(CACHE_FILE, "w"))  # checkpoint after each
            print(f"  OK   {key}", flush=True)
        else:
            fail += 1
            print(f"  FAIL {key} → {err}", flush=True)
        time.sleep(4)

    json.dump(cache, open(CACHE_FILE, "w"))
    print(f"\ndone: {done} rendered, {fail} failed, {len(cache)} total cached", flush=True)


if __name__ == "__main__":
    main()
