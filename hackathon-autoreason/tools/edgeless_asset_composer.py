#!/usr/bin/env python3
"""
Edgeless asset composer — brand-consistent slides, carousels, and product/blank layouts.

One place to compose any Edgeless visual asset in the house language (near-black ground,
lime accent, Helvetica display + mono labels, square corners). Feeds:
  - Instagram/X carousels (the Flora ASCII-motion flow drops frames into `image` slides)
  - static share cards / OG images
  - product + "blank with art" comps once real product renders exist

Pure PIL — no network, no external deps beyond Pillow. Fonts resolve from macOS system
paths with graceful fallback. `python edgeless_asset_composer.py --demo` renders a sample
5-slide carousel to prove the pipeline without Flora.
"""
from __future__ import annotations
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

# ---- brand tokens ----
BG   = (11, 12, 14)
PAPER = (236, 235, 228)     # the light "printed page" contrast field
FG   = (238, 238, 232)
LIME = (198, 242, 78)
MUTE = (120, 124, 130)
INK  = (20, 22, 26)

SANS = ["/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc"]
MONO = ["/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Courier.ttc"]

def _font(paths, size):
    for p in paths:
        try: return ImageFont.truetype(p, size)
        except Exception: continue
    return ImageFont.load_default()
def sans(sz): return _font(SANS, sz)
def mono(sz): return _font(MONO, sz)

def _wrap(draw, text, fnt, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

# ---- one slide ----
def slide(*, W=1080, H=1350, dark=True, eyebrow=None, title=None, title_size=88,
          sub=None, image=None, image_frac=0.5, footer="EDGELESS · shop.edgelesslab.com",
          accent_title=False):
    """Render one branded slide (default IG 4:5). image = path to art placed in the upper band."""
    bg = BG if dark else PAPER
    fg = FG if dark else INK
    mut = MUTE if dark else (110, 112, 118)
    im = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(im)
    pad = int(W * 0.078); maxw = W - 2 * pad
    d.text((pad, int(H * 0.055)), "‹ THE EXCHANGE ›", font=mono(int(W * 0.019)), fill=LIME)

    y = int(H * 0.12)
    if image and os.path.exists(image):
        art = Image.open(image).convert("RGB")
        boxh = int(H * image_frac); boxw = maxw
        art.thumbnail((boxw, boxh))
        ax = (W - art.width) // 2
        im.paste(art, (ax, y)); y += art.height + int(H * 0.04)
    else:
        y = int(H * 0.30)

    if eyebrow:
        d.text((pad, y), eyebrow.upper(), font=mono(int(W * 0.02)), fill=mut); y += int(H * 0.035)
    if title:
        f = sans(title_size)
        for ln in _wrap(d, title, f, maxw):
            d.text((pad, y), ln, font=f, fill=(LIME if accent_title else fg)); y += int(title_size * 1.08)
        y += int(H * 0.012)
    if sub:
        f = sans(int(W * 0.033))
        for ln in _wrap(d, sub, f, maxw):
            d.text((pad, y), ln, font=f, fill=mut); y += int(W * 0.033 * 1.35)

    d.text((pad, H - int(H * 0.065)), footer, font=mono(int(W * 0.017)), fill=mut)
    return im

def carousel(spec, out_dir):
    """spec = list of slide-kwarg dicts. Writes slide-01.png ... returns paths."""
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i, s in enumerate(spec, 1):
        p = os.path.join(out_dir, f"slide-{i:02d}.png")
        slide(**s).save(p, quality=95); paths.append(p)
    return paths

# ---- demo (no Flora needed) ----
DEMO = [
    dict(eyebrow="SEC.01 · the exchange", title="Autonomous agents are designing merch. Only what sells survives.",
         title_size=76, sub="A real store with an immune system. Swipe →"),
    dict(eyebrow="the immune system", title="Every design is screened before it can list.",
         title_size=80, sub="An NVIDIA vision swarm scores craft, originality, and IP. Slop is quarantined in public."),
    dict(dark=False, eyebrow="the receipt", title="27/100.", title_size=180, accent_title=False,
         sub="“low-effort, generic design with no discernible artistic value.” — an AI, rejecting another AI."),
    dict(eyebrow="the split", title="18% to whoever made it.", title_size=92, accent_title=True,
         sub="Human or machine. Agent orchid-7 gets the exact same cut."),
    dict(eyebrow="live now", title="Screened by machines. Chosen by strangers.", title_size=72,
         sub="shop.edgelesslab.com — first drop is up."),
]

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--spec", help="JSON file: list of slide dicts")
    ap.add_argument("--out", default="./carousel_out")
    a = ap.parse_args()
    spec = DEMO if a.demo else json.load(open(a.spec))
    for p in carousel(spec, a.out): print(p)
