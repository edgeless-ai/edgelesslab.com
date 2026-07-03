"""
Cut the white-base ghost blanks into transparent-background garment PNGs so the
instant editor can tint them to ANY color client-side (CSS multiply) with zero
render latency. Printful only colors garments at render time; the template ghosts
are all white-on-white. We flood-fill the white background from the corners (the
garment's own edge shadow stops the fill) and keep everything else as the garment,
preserving fabric folds/shadows so a multiply tint looks photoreal.

One-time pure-CPU pass (no API, no rate limit). Writes {id}_cut.png next to {id}.png.
"""
import json
import os

from PIL import Image, ImageDraw

BLANKS = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/public/blanks"
OUT_JSON = "/Users/djm/claude-projects/hackathon-autoreason/merch-demo/src/data/blanks.json"
SEED = (255, 0, 255)  # magenta sentinel — not present in greyscale ghosts
THRESH = 22


def cut(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # flood-fill the background from all four corners
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if im.getpixel(xy) != SEED:
            ImageDraw.floodfill(im, xy, SEED, thresh=THRESH)
    src = im.load()
    # white-point normalize: lit fabric peaks ~200 (not 255), so multiply-tinting a
    # bright color muddies it. Scale so the 98th-percentile luminance -> ~250, which
    # keeps fold/shadow ratios but lets the tint show its true hue.
    lum = []
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            r, g, b = src[x, y]
            if (r, g, b) != SEED:
                lum.append((r + g + b) // 3)
    lum.sort()
    wp = lum[int(len(lum) * 0.98)] if lum else 255
    scale = min(2.2, 250 / max(wp, 1))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    kept = 0
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            if (r, g, b) == SEED:
                continue
            dst[x, y] = (min(255, int(r * scale)), min(255, int(g * scale)), min(255, int(b * scale)), 255)
            kept += 1
    return out, round(100 * kept / (w * h), 1)


def main():
    blanks = json.load(open(OUT_JSON))
    for pid, meta in blanks.items():
        src = os.path.join(BLANKS, f"{pid}.png")
        if not os.path.exists(src):
            print(f"  SKIP {pid}: no source", flush=True)
            continue
        out, pct = cut(src)
        dst = os.path.join(BLANKS, f"{pid}_cut.png")
        out.save(dst)
        meta["cut"] = f"/blanks/{pid}_cut.png"
        print(f"  OK {pid}: garment {pct}% -> {pid}_cut.png", flush=True)
    json.dump(blanks, open(OUT_JSON, "w"), indent=1)
    print(f"\nupdated {OUT_JSON}", flush=True)


if __name__ == "__main__":
    main()
