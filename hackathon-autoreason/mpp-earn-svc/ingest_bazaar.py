"""
Stock the Bazaar: sample fresh Nous-MJ art (different slice than the dogfood rack),
run each through the curator, and write ALL verdicts to a SEPARATE file so the main
designs.json (rack) is never clobbered. The storefront shows bazaar-verdict items as
"almost there — not yet for sale". Premium extras can be promoted to the rack later.
"""
import json, os, re, shutil, sys, time
sys.path.insert(0, "/Users/djm/claude-projects/hackathon-autoreason/mpp-earn-svc")
import curator
import r2_client as r2

# Offset slices so we don't re-pick the dogfood images.
SOURCES = [
    ("/Users/djm/claude-projects/generated/nous-mj-new", 22, 7),       # (folder, n, offset-stride-start)
    ("/Users/djm/claude-projects/generated/nous-mj-overnight", 14, 3),
]
ART_DIR = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/public/art"
OUT = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/bazaar-extra.json"
EXTS = (".png", ".jpg", ".jpeg", ".webp")


def title_from(fname):
    base = os.path.splitext(os.path.basename(fname))[0]
    base = re.sub(r"[_-][0-9a-f]{6,}.*$", "", base)
    base = re.sub(r"[-_]\d+$", "", base).replace("-", " ").replace("_", " ").strip()
    if not base or len(base) < 3 or re.fullmatch(r"[0-9a-f ]+", base):
        return "Untitled Design"
    return " ".join(w.capitalize() for w in base.split()[:6])


def pick(folder, n, start):
    if not os.path.isdir(folder):
        return []
    files = [os.path.join(folder, f) for f in sorted(os.listdir(folder)) if f.lower().endswith(EXTS)]
    if len(files) <= n:
        return files
    step = max(1, len(files) // n)
    return files[start::step][:n]


def main():
    out = []
    idx = 0
    creators = ["orchid-7", "relay-3", "atlas-9", "studio", "cipher-2", "vela-5"]
    for folder, n, start in SOURCES:
        for src in pick(folder, n, start):
            idx += 1
            ext = os.path.splitext(src)[1].lower()
            slug = f"bazaar-{idx:02d}{ext}"
            dst = os.path.join(ART_DIR, slug)
            try:
                shutil.copyfile(src, dst)
                up = r2.upload_file(dst)
                if not up.get("ok"):
                    print(f"  R2 FAIL {slug}: {up.get('error')}", flush=True); continue
                title = title_from(src)
                c = curator.curate(up["url"], title)
                out.append({
                    "slug": slug, "title": title, "art_url": up["url"],
                    "verdict": c.get("verdict"), "score": c.get("score"),
                    "slop": c.get("slop"), "reason": c.get("reason"),
                    "creator": creators[idx % len(creators)],
                })
                print(f"  {idx:02d} {c.get('verdict','?'):11} {str(c.get('score','')):>3}  {title}", flush=True)
                json.dump(out, open(OUT, "w"), indent=1)  # checkpoint
                time.sleep(2)
            except Exception as e:
                print(f"  ERR {slug}: {str(e)[:120]}", flush=True)
    from collections import Counter
    print("DONE:", dict(Counter(d["verdict"] for d in out)), "→", OUT, flush=True)


if __name__ == "__main__":
    main()
