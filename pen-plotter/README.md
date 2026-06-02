# Pen Plotter Autoresearch — Editorial

A field journal for an autonomous loop running on 40 generative pen-plotter factories.
Forty-one thousand five hundred and seventy-two specimens, scored by six algorithmic
signals and five vision-language judges.

**Live**: https://edgelesslab.com/pen-plotter/
**Addendum** (full catalog): https://edgelesslab.com/pen-plotter/addendum.html

---

## What it is

A five-section editorial set in the form of a specimen book:

- **§01 Hero** — the opening, the counts, the question the loop is answering
- **§02 Method** — how the scoring was recalibrated, shown as a live before/after
- **§03 Catalog** — 1,296 curated specimens in a 36×36 grid, sorted by composite score
- **§04 Anomaly — Best of Run** — seven editorial spreads, one per factory tier
- **§05 Colophon** — type stack, credits, the mark

Plus a standalone **addendum** page rendering every kept specimen in a 40-pixel mass
grid — a printer's proof sheet for the entire run.

## Design

Warm aged paper, deep cold ink, a single sodium-vapor amber accent.

| | |
|-|-|
| **Display** | Boska (301 / 401 / 501 / 701 / 1301 / 1401 / 1501 / 1701) |
| **Mono** | JetBrains Mono |
| **Paper** | `#f3eddd` |
| **Ink** | `#0c0a08` |
| **Accent** | `#c2410c` (sodium amber) |
| **Rule** | `#d4cab4` |
| **Grain** | subtle SVG noise on `body` |

The aesthetic is a printed field journal: registration marks, mono section markers,
hairline rules, a drop cap in §01, scholarly spacing in §04.

## References

- Swiss specimen books (the grid, the rule weights)
- Edward Tufte's *Visual Display of Quantitative Information* (§02 method panels)
- *Dot Dot Dot* and *Slanted* magazine pacing (§04 spreads)
- Pen-plotter community at [beardicus/awesome-plotters](https://github.com/beardicus/awesome-plotters)

## Build & preview

No build step — `index.html` and `addendum.html` are single-file static pages with
inline CSS and JavaScript. Fonts load from Fontshare and Google Fonts.

```bash
# Local preview
python3.11 -m http.server 8924
# open http://localhost:8924/
```

## Regenerate catalog assets

After new specimens land in `../autoresearch/output/`:

```bash
python3.11 make_catalog.py              # curated 1,296 grid (80px thumbs + 720px lightbox mediums)
python3.11 make_catalog.py --addendum   # full 39,414 addendum (40px mass grid)
```

The script reads `../autoresearch/experiments.tsv`, filters `kept=yes`, sorts by
composite score, and writes:

- `assets/manifest.json` / `assets/manifest-full.json`
- `assets/thumbs/*.webp` / `assets/thumbs-full/*.webp`
- `assets/medium/*.webp` (curated only, for the lightbox)

Thumbnails are cached by filename — reruns are cheap.

## Regenerate the share card

```bash
python3.11 make_og.py   # writes assets/og-image.png (1200×630)
```

## Deploy

See `HANDOFF.md` for the full deploy sequence. Summary: rsync into
`edgeless-website/public/pen-plotter/`, `next build`, rsync `out/pen-plotter/` to the
repo root of `edgeless-ai/edgelesslab.com`, push to `main`, GitHub Pages takes it from
there.

## Credits

- **Autoresearch loop, factories, scoring, editorial**: David Murray · [@qt_djm](https://x.com/qt_djm)
- **Studio**: [Edgeless Lab](https://edgelesslab.com)
- **Type**: Boska by [Indian Type Foundry](https://fontshare.com/fonts/boska) · JetBrains Mono by [JetBrains](https://www.jetbrains.com/lp/mono/)
- **Pen-plotter community**: [awesome-plotters](https://github.com/beardicus/awesome-plotters)

---

*A field journal for what the algorithms loved — and what they got wrong.*
