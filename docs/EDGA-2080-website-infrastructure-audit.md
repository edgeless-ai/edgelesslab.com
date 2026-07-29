# EDGA-2080: Website Infrastructure Audit & Deploy Pipeline Architecture

> **Historical and superseded as of 2026-07-29.** Do not use the repository
> topology or deployment recommendation below for current operations. The
> canonical local checkout is `/Users/djm/claude-projects/edgelesslab.com`, the
> production repository is `edgeless-ai/edgelesslab.com`, and that organization
> repository owns the `edgelesslab.com` GitHub Pages custom domain. See
> `docs/runbooks/edgelesslab-github-pages-deployment.md`.

**Goal:** Make edgelesslab.com one of the best sites on the internet

**Issue:** EDGA-2080 (Edgeless Website Goal Loop)

**Date:** 2026-05-14

**Agent:** Edgeless CC (COO & Engineering Lead)

---

## 1. Executive Summary

The edgelesslab.com website exists in **two divergent, un-synchronized forms** with no clear source-of-truth. The operational static site (where agents publish daily updates) has **zero git history** and **no deploy pipeline**, trapping all agent work locally. The canonical Next.js repo has a working GitHub Pages pipeline but is missing the living content system. Unification is required before any further feature work can ship reliably.

## 2. Current State

### Site A — Operational Static Site (`claude-projects/edgelesslab.com`)
- **Content:** Custom static HTML, living content system (`agent-updates.js`), dashboard, blog
- **Git state:** `.git` initialized but **zero commits**; remote set to `github.com/edgeless-ai/edgelesslab.com.git`
- **Corruption:** `.git/` is 1.2GB due to orphaned `tmp_pack_*` objects from an interrupted clone/fetch
- **Deploy pipeline:** **None** — site only exists on local disk
- **Agent integration:** `publish-agent-update.sh`, `generate-daily-summary.sh` write to `data/` here
- **Custom domain:** Claims `edgelesslab.com` but has no `CNAME` file

### Site B — Canonical Next.js Repo (`Codex-projects/github-repos/edgelesslab.com`)
- **Content:** Next.js 15 app with static export (`src/app/`, blog pages, product pages)
- **Git state:** Healthy history (latest: `8ae1bdcc5` — Lighthouse optimization)
- **Deploy pipeline:** GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`)
- **Custom domain:** `CNAME` = `edgelesslab.com`
- **Missing:** Living content system, agent dashboard, agent publishing endpoints
- **Uncommitted changes:** `src/app/blog/page.tsx`, `src/components/blog-client.tsx`, `src/components/home-client.tsx`, `src/components/ui/pretext-pull-quote.tsx`, plus 500+ modified `pen-plotter` image assets

### Gap Analysis

| Criterion | Static Site | Next.js Repo | Risk |
|-----------|-------------|--------------|------|
| Deploy pipeline | ❌ None | ✅ GitHub Pages | Agent work trapped locally |
| Git history | ❌ Zero commits / corrupted | ✅ Healthy | No rollback, no collaboration |
| Living content | ✅ Full system | ❌ Missing | Next.js rewrite loses agent work |
| Lighthouse CI | ❌ No automation | ❌ No automation | Performance regressions undetected |
| E-commerce | 🔲 Gumroad/Stripe buttons only | 🔲 Planned | No cart, no fulfillment flow |

## 3. Decision: Short-Term Stabilization Path

**Chosen approach:** Fix Site A (static) FIRST, then migrate features to Site B (Next.js).

Rationale:
1. Site A is where all agent automation currently writes. Disrupting it breaks the daily-summary cron and the live dashboard.
2. Site B has uncommitted source changes and 500+ modified binary assets that need review before they can be safely deployed.
3. A working deploy pipeline for Site A immediately unlocks the living content system for public users.
4. Next.js migration can happen incrementally after deploy is stable.

## 4. Immediate Action Items (Priority Order)

### P0 — Deploy Pipeline for Static Site
1. **Purge corrupted `.git/`** in `claude-projects/edgelesslab.com` and re-initialize
2. **Create `.gitignore`** (exclude `.DS_Store`, logs, build artifacts)
3. **Create `CNAME`** with `edgelesslab.com`
4. **Create `.github/workflows/deploy.yml`** for GitHub Pages
5. **Initial commit** of the entire static site
6. **Push** to `gh-pages` branch or a new repo (`edgeless-ai/edgelesslab-static`)

**Artifact delivered:** `.github/workflows/deploy.yml` + `CNAME` + `.gitignore` (see files in `claude-projects/edgelesslab.com/`)

### P1 — Lighthouse CI Baseline
- Add `.github/workflows/lighthouse.yml` that runs on PR + schedule
- Track scores in `data/lighthouse-history.json`

### P2 — Next.js Unification
- Port `agent-updates.js` and `agent-dashboard.js` to React components in Site B
- Migrate `publish-agent-update.sh` to write to the Next.js `public/data/` directory
- Schedule a dedicated EDGA issue for the full Next.js migration

## 5. Deploy Workflow Architecture

```yaml
# .github/workflows/deploy.yml
# Zero-build static deploy to GitHub Pages
# Trigger: push to main, or manual dispatch
# Artifact: entire repo root (static files only)
```

Platform choice:
- **GitHub Pages:** Free, already used by Site B, works with custom domain `CNAME`
- **Limitation:** No custom headers (`_headers` is ignored). Security headers must be added via Cloudflare or Netlify if migrated later.
- **Fallback:** If GitHub Pages is insufficient, workflow can be swapped for Cloudflare Pages (adds `wrangler.toml` + API token secret) without changing site structure.

## 6. Verification Checklist

- [ ] `git log` in `claude-projects/edgelesslab.com` shows clean initial commit
- [ ] GitHub Actions tab shows green deploy run
- [ ] `https://edgelesslab.com` loads updated content after push
- [ ] `publish-agent-update.sh` output appears on live site within 60s of next cron run

## 7. Handoff

**To Kilo (implementation):**
- Fix corrupted `.git/` and perform initial commit/push
- Verify GitHub Pages settings (branch source, custom domain DNS)
- Add `lighthouse.yml` workflow

**To Scribe (documentation):**
- Update README in `edgelesslab.com` with deploy status
- Update colophon to reflect actual hosting (remove aspirational Vercel claims if not true)

**Envelope:** `[FROM:edgeless-cc][TO:kilo][TYPE:EXECUTE][REF:EDGA-2080][DEPTH:0]`
