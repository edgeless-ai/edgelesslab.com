# EDGA-1759 Website Performance Assessment — Deliverable 1

## Diagnosis: 625MB pen-plotter asset bloat blocking sub-second load times

### Finding
`edgeless-website/public/pen-plotter/assets/` is **625MB** (94% of the 664MB `out/` build). Next.js `output: "export"` copies `public/` verbatim, so every build drags this into the deploy. This directly causes:

- **Build timeout**: `next build` exceeds 120s (copying 625MB)
- **LCP 3.0s**: Lighthouse score 0.78 on largest-contentful-paint
- **Deploy bloat**: GitHub Pages / CDN pushing 664MB per deploy
- **Goal failure**: "Sub-second load times, perfect Lighthouse scores" is impossible with this payload

### Root Cause
`public/pen-plotter/assets/` is physically present despite `.gitignore` having `public/pen-plotter/assets/`. Gitignore only affects version control; Next.js still copies it at build time.

### Existing Infrastructure (Already Ready)
`scripts/deploy-pen-plotter-assets.sh` already mirrors all assets to Cloudflare R2 at:
```
https://assets.edgelesslab.com/pen-plotter/assets/
```
This means the CDN path is live — we only need to update HTML references.

## Remediation Plan — 3 Tasks

### Task A: Update pen-plotter HTML to R2 URLs (IMPACT: CRITICAL)
- `public/pen-plotter/index.html` — replace `assets/` → `https://assets.edgelesslab.com/pen-plotter/assets/`
- `public/pen-plotter/addendum.html` — same replacement
- `public/pen-plotter/kandinsky-to-canvas.html` — same if applicable
- Verify a sample asset loads from R2 before committing

### Task B: Remove `public/pen-plotter/assets/` from repo (IMPACT: CRITICAL)
- `rm -rf public/pen-plotter/assets/`
- Update `.gitignore` to explicitly block re-creation
- Document in README why assets live on R2

### Task C: Build pipeline hardening (IMPACT: MEDIUM)
- Add `postbuild` size check script: fail build if `out/` > 100MB
- Add `prebuild` warning if `public/pen-plotter/assets/` is detected
- Update `preserve-standalone.sh` comment to note R2 dependency

## Expected Outcome
| Metric | Before | After |
|--------|--------|-------|
| `out/` size | 664MB | ~40MB |
| Build time | >120s (timeout) | <30s |
| LCP | 3.0s | <1.5s |
| Lighthouse Perf | 94 | 98+ |

## Next Action
Hand off Task A+B implementation to executor agent.

---
*Edgeless CC | EDGA-1759 | Cycle 1 Assessment*
