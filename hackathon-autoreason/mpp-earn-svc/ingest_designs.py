"""
Dogfood ingestion: load David's real Nous Midjourney art into the store as designs,
run each through the anti-slop immune system (curator), and write designs.json that
the storefront gallery reads. This is the real marketplace catalog + a live dogfood
of the curator on real art.
"""
import json
import os
import re
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import curator
import r2_client as r2

SOURCES = [
    ("/Users/djm/claude-projects/generated/nous-mj", 16),          # deliberate, descriptive names
    ("/Users/djm/claude-projects/generated/nous-mj-new", 8),       # recent
    ("/Users/djm/claude-projects/generated/nous-mj-overnight", 6), # overnight batch
]
ART_DIR = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/public/art"
OUT = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/designs.json"
EXTS = (".png", ".jpg", ".jpeg", ".webp")


def title_from(fname: str) -> str:
    base = os.path.splitext(os.path.basename(fname))[0]
    base = re.sub(r"[_-][0-9a-f]{6,}.*$", "", base)   # strip hash/uuid tails
    base = re.sub(r"[-_]\d+$", "", base)
    base = base.replace("-", " ").replace("_", " ").strip()
    if not base or len(base) < 3 or re.fullmatch(r"[0-9a-f ]+", base):
        return "Untitled Design"
    return " ".join(w.capitalize() for w in base.split()[:6])


def pick(folder: str, n: int) -> list:
    if not os.path.isdir(folder):
        return []
    files = [os.path.join(folder, f) for f in sorted(os.listdir(folder))
             if f.lower().endswith(EXTS)]
    if len(files) <= n:
        return files
    step = max(1, len(files) // n)  # even sample across the folder
    return files[::step][:n]


def main():
    designs = []
    idx = 0
    for folder, n in SOURCES:
        for src in pick(folder, n):
            idx += 1
            ext = os.path.splitext(src)[1].lower()
            slug = f"dogfood-{idx:02d}{ext}"
            dst = os.path.join(ART_DIR, slug)
            shutil.copyfile(src, dst)
            up = r2.upload_file(dst)
            if not up.get("ok"):
                print(f"  R2 FAIL {slug}: {up.get('error')}", flush=True)
                continue
            title = title_from(src)
            c = curator.curate(up["url"], title)
            designs.append({
                "slug": slug, "title": title, "art_url": up["url"],
                "verdict": c.get("verdict"), "score": c.get("score"),
                "slop": c.get("slop"), "reason": c.get("reason"),
                "creator": ["orchid-7", "relay-3", "atlas-9", "studio"][idx % 4],
            })
            print(f"  {idx:02d} {c.get('verdict','?'):11} {str(c.get('score','')):>3}  {title}", flush=True)
            json.dump(designs, open(OUT, "w"), indent=1)  # checkpoint
            time.sleep(2)  # throttle the NIM vision calls
    prem = sum(1 for d in designs if d["verdict"] == "premium")
    baz = sum(1 for d in designs if d["verdict"] == "bazaar")
    quar = sum(1 for d in designs if d["verdict"] == "quarantined")
    print(f"\nDONE: {len(designs)} ingested → {prem} premium · {baz} bazaar · {quar} quarantined", flush=True)
    print(f"wrote {OUT}", flush=True)


if __name__ == "__main__":
    main()
