# Pen Plotter Editorial — Session Handoff

**Last updated**: 2026-04-08
**Status**: Live at https://edgelesslab.com/pen-plotter/ — shipped 2026-04-08
**Companion**: https://edgelesslab.com/pen-plotter/addendum.html (full catalog mass grid)

---

## Current live state

| Item | State |
|------|-------|
| URL | https://edgelesslab.com/pen-plotter/ |
| Sections | §01 Hero · §02 Method · §03 Catalog (1296) · §04 Best of Run (7 spreads) · §05 Colophon |
| Addendum | ~15,833 specimens, 40px mass grid |
| Host | GitHub Pages (`edgeless-ai/edgelesslab.com`, `main` branch) |
| Type stack | Boska (Fontshare) + JetBrains Mono (Google Fonts) |
| Palette | `#f3eddd` paper · `#0c0a08` ink · `#c2410c` sodium amber |
| OG image | `assets/og-image.png` (1200×630) |

## File map

```
editorial/
├── index.html              # the editorial, single-file (inline CSS/JS)
├── addendum.html           # full-catalog mass grid
├── make_catalog.py         # manifest + thumbnail generator
├── make_og.py              # OpenGraph card renderer (1200×630)
├── HANDOFF.md              # this file
├── README.md               # public-facing readme
└── assets/
    ├── og-image.png
    ├── manifest.json           # curated 1296 entries {id,factory,score,thumb,medium}
    ├── manifest-full.json      # ~15,833 entries for addendum
    ├── thumbs/                 # 80px webp (curated §03)
    ├── thumbs-full/            # 40px webp (addendum)
    ├── medium/                 # 720px webp (lightbox)
    ├── mediums-all/            # 720px webp (§04 spreads)
    ├── pieces/                 # standalone curated PNGs for spreads
    └── fonts/                  # self-hosted Boska fallbacks
```

## Local edit loop

```bash
cd /Users/djm/claude-projects/pen-plotter-art/editorial

# 1. Edit index.html / addendum.html / make_catalog.py

# 2. Regenerate catalog if specimens changed
python3.11 make_catalog.py              # curated (1296)
python3.11 make_catalog.py --addendum   # full (~15,833)

# 3. Local preview
python3.11 -m http.server 8924
# open http://localhost:8924/
# open http://localhost:8924/addendum.html

# 4. Regenerate OG card if hero/colophon changed
python3.11 make_og.py
```

## Deploy sequence (ship a new version)

```bash
# 1. Sync editorial source → edgeless-website/public/pen-plotter/
rsync -a --delete \
  /Users/djm/claude-projects/pen-plotter-art/editorial/ \
  /Users/djm/claude-projects/edgeless-website/public/pen-plotter/

# 2. Build Next.js static export
cd /Users/djm/claude-projects/edgeless-website
npx next build

# 3. Sync build output → repo root (what GH Pages serves)
rsync -a --delete out/pen-plotter/ ../pen-plotter/

# 4. Commit + push
cd ..
git add pen-plotter
git commit -m "deploy: pen-plotter editorial <what changed>"
git push origin main

# 5. Watch the deploy
gh api repos/edgeless-ai/edgelesslab.com/actions/runs?per_page=3 \
  --jq '.workflow_runs[] | {status, conclusion, head_sha: .head_sha[0:7]}'
```

Propagation: 1–3 minutes after the GitHub Pages action turns green.

## Working on changes — gotchas

- **Do NOT deploy to Vercel.** DNS points at GitHub Pages. Vercel builds silently no-op.
- **Do NOT use `/autoresearch/` as a URL path** — there's a Karpathy-style framework dir at the repo root with that name. Use `/pen-plotter/`.
- **Brand is "Edgeless Lab" (singular).** Never "Edgeless Labs".
- **`index.html` is single-file.** CSS and JS are inline — keeps the editorial portable and no build step required.
- **`make_catalog.py` is cached by filename.** Safe to rerun. To force regen of a specific thumb, delete it from `assets/thumbs/` first.
- **Medium thumbs (720px) are only generated in curated mode.** The lightbox pulls from `assets/medium/`.

## Known not-yet-done / backlog

- [ ] Real-device mobile testing (tested in Chrome devtools responsive only)
- [ ] Print stylesheet pass — currently renders okay but hasn't been tuned
- [ ] Addendum page: virtualized grid for browsers that stutter on 15K DOM nodes (currently CSS-grid only)
- [ ] Accessibility audit — alt text on thumbs is generic (`specimen {id}`), could embed factory + score
- [ ] Scrollytelling upgrade for §04 spreads (currently static)

## Recently completed

- [x] Score recalibration animation in §02 (IntersectionObserver, 900ms tween, ink→amber color flip) — stagger timing is final
- [x] 36×36 grid (1296) catalog with lightbox
- [x] Addendum page with full 15,833 specimens
- [x] 7 editorial spreads in §04 with magazine pacing
- [x] Colophon §05 with type stack + credits
- [x] OG card + Twitter card meta
- [x] Sodium-amber accent locked in (replaced earlier red `#b91c1c`)
- [x] Drop cap on §01 opening paragraph
- [x] GitHub Pages deploy path validated end-to-end

## Related docs

- Autoresearch loop: `../autoresearch/HANDOFF.md`
- Memory files (global): `~/.claude/projects/-Users-djm-claude-projects-pen-plotter-art/memory/`
  - `project_pen_plotter_editorial.md` — full spec
  - `reference_github_pages_deploy.md` — deploy details
