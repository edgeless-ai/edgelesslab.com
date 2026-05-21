# EDGA-2157: Lighthouse Optimization — Current State & Blockers

**Date:** 2026-05-16  
**Agent:** Edgeless CC (97898794-ff86-48d5-9308-6e13cfa63c0b)  
**Status:** Git initialized, CI workflow added, remote missing

---

## 📊 Lighthouse Scores

### Local Hugo Build (`~/claude-projects/edgelesslab/`)
| Category | Score |
|----------|-------|
| Performance | **100** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

**Local build is already optimized.** No further code changes needed for the Hugo site.

### Live Site (`https://edgelesslab.com`)
| Category | Score |
|----------|-------|
| Performance | **77** → LCP 4.3s, TBT 300ms |
| Accessibility | ? |
| Best Practices | ? |
| SEO | ? |

**Critical finding:** The live site is a **Next.js app** (repo: `edgeless-ai/edgelesslab.com`), not the Hugo build. The Performance bottleneck is:
- **LCP 4.3s** (score 42)
- **Unused JavaScript** ~71 KiB
- **Speed Index 4.3s**

The Hugo source in `~/claude-projects/edgelesslab/` is **not what is deployed**.

---

## 🔧 What Was Done This Tick

1. **Initialized git** in `~/claude-projects/edgelesslab/`
2. **Added `.github/workflows/hugo.yml`** for GitHub Pages CI deployment
3. **Added `.gitignore`** for Hugo build artifacts
4. **Committed all source files** (458 files, root commit `f1e5a70`)
5. **Ran live Lighthouse audit** → confirmed live site is a different codebase (Next.js)

---

## ⚠️ Remaining Blockers

### Blocker 1: Git Remote
```
git remote add origin https://github.com/edgeless-ai/edgelesslab.git
```
- No repo `edgeless-ai/edgelesslab` exists on GitHub
- `gh` CLI is not authenticated → cannot create repo via API
- **Action required:** David to create the repo, or provide `gh auth login`

### Blocker 2: Deployment Target Confusion
Two competing codebases both claim `edgelesslab.com`:

| Path | Framework | Status |
|------|-----------|--------|
| `~/claude-projects/edgelesslab/` | Hugo | Local-only, no git remote |
| `~/claude-projects/edgelesslab.com/` | Next.js | **Currently deployed** to GitHub Pages |

**Question for David:** Is the Hugo site intended to replace the Next.js site, or are they separate projects?

### Blocker 3: Live Site Performance (if keeping Next.js)
If the Next.js site remains the deployed site, the 77 Performance score needs:
- Tree-shake/remove ~71 KiB of unused JS
- Optimize LCP (likely image/font loading)
- Add `next/font` or preload critical assets

---

## 📋 Recommended Next Steps

**Option A — Deploy Hugo site (replace Next.js)**
1. Create `edgeless-ai/edgelesslab` repo on GitHub
2. Set remote + push this repo
3. Enable GitHub Pages on the repo
4. Update DNS / CNAME if needed
5. Retire `edgelesslab.com` Next.js repo

**Option B — Keep Next.js, fix its Lighthouse**
1. Work in `~/claude-projects/edgelesslab.com/` (has git, CI already)
2. Run `npx lighthouse` on built output
3. Address unused JS and LCP issues
4. Push fixes → GitHub Pages auto-deploys

**Option C — Archive Hugo, focus on Next.js**
1. The Hugo source is already at 100/100 locally
2. No further work needed if it's not the deployed site
3. Close EDGA-2157 as "not applicable" or merge into Next.js performance work

---

## 💾 Artifacts

- Git repo initialized: `~/claude-projects/edgelesslab/.git/`
- CI workflow: `.github/workflows/hugo.yml`
- Commit: `f1e5a70` — "feat(deploy): init repo + add Hugo GitHub Pages workflow"
- Live Lighthouse report: `/tmp/live-lighthouse.json`
