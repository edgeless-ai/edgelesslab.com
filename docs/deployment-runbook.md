# EdgelessLab GitHub Pages Deployment Runbook

## Purpose

Publish the static Next.js export to the repository that owns
`edgelesslab.com`, then verify the custom domain rather than a fork preview.

## Canonical Topology

| Surface | Canonical value |
|---|---|
| Local checkout | `/Users/djm/claude-projects/edgelesslab.com` |
| Production repository | `edgeless-ai/edgelesslab.com` |
| Production URL | `https://edgelesslab.com/` |
| Pages workflow | `.github/workflows/deploy.yml` |
| Build artifact | `out/` |
| Personal fork | `thedavidmurray/edgelesslab.com` |
| Personal preview | `https://thedavidmurray.github.io/edgelesslab.com/` |

The organization repository owns the verified custom domain. The personal fork
can build and deploy successfully without changing production.

## Preflight

### 1. Confirm the Pages owner

```bash
gh api repos/edgeless-ai/edgelesslab.com/pages \
  --jq '{status, cname, html_url, build_type, source}'
```

Expected:

- `cname` is `edgelesslab.com`
- `html_url` is `https://edgelesslab.com/`
- `build_type` is `workflow`

For comparison:

```bash
gh api repos/thedavidmurray/edgelesslab.com/pages \
  --jq '{status, cname, html_url, build_type, source}'
```

The personal fork should not be treated as production when `cname` is null.

### 2. Inspect local remotes and branch state

```bash
git remote -v
git status --short --branch
git branch -vv
```

Do not rely on the name `origin`. Verify the remote URL. Preserve unrelated
tracked and untracked work.

### 3. Confirm custom-domain files

```bash
test "$(cat CNAME)" = "edgelesslab.com"
test "$(cat public/CNAME)" = "edgelesslab.com"
```

### 4. Build and test

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec vitest run
pnpm exec playwright test
```

The build must report a successful static export. Test navigation, Field Notes,
and command-palette search when those surfaces change.

For notebook publication use the [checked publication gate](notebook-publication.md):
commit on a scoped PR branch and run `npm run publish:checked`. It builds and runs
the real suites plus publisher-only live notebook/entry-bundle checks, then pushes
only that clean, unchanged, verified SHA. Do not patch fixed notebook totals or
push repeatedly to discover locally reproducible test failures via email.

## Publish

When the local branch is not verified as tracking the canonical repository,
push with an explicit target:

```bash
git -c credential.helper='!gh auth git-credential' \
  push https://github.com/edgeless-ai/edgelesslab.com.git HEAD:main
```

Do not force-push. If histories diverge, fetch the canonical branch and
integrate it in a temporary worktree. Preserve organization-only commits.

## CI and Pages Verification

Find the new workflow runs:

```bash
gh run list \
  --repo edgeless-ai/edgelesslab.com \
  --branch main \
  --limit 10
```

Require success from:

- Frontend Tests
- E2E Tests
- Deploy to GitHub Pages

If Pages returns a 400 stating that another deployment is in progress, wait for
the earlier deployment to finish, then rerun only the failed deployment:

```bash
gh run rerun RUN_ID \
  --repo edgeless-ai/edgelesslab.com \
  --failed
```

This is a deployment lock race, not evidence of a bad artifact.

## Production Verification

### 1. Inspect the custom-domain object

```bash
curl -sSIL https://edgelesslab.com/index.html | \
  rg -i '^(last-modified:|etag:|age:|date:|x-cache:)'
```

GitHub Pages uses a `max-age=600` edge cache. A custom-domain response may
remain stale briefly after a successful deployment.

### 2. Verify expected content

```bash
curl -sSL https://edgelesslab.com/ | \
  rg 'Edgeless Lab \| Systems, Field Notes, and Generative Work'
curl -sSL https://edgelesslab.com/field-notes/ | rg 'Field Notes'
curl -sSL https://edgelesslab.com/blog/ | rg '<title>Blog \| Edgeless Lab'
curl -sSL https://edgelesslab.com/products/ | rg '<title>Resources \| Edgeless Lab'
```

### 3. Verify client-side behavior

Use a clean browser session:

- Load the homepage and confirm zero console errors.
- Open Field Notes and the original Total Serialism article.
- Open command-palette search, query `Total Serialism`, and confirm results.
- Test the mobile navigation when navigation changes.
- Check standalone creative pages without relying on Next.js route prefetch.

## Diagnosing the Fork Trap

Symptoms:

- CI is green.
- A `github.io` preview contains the new artifact.
- `edgelesslab.com` still serves the old page after cache expiry.

Diagnosis:

1. Query Pages configuration for both repositories.
2. Find the repository whose `cname` equals `edgelesslab.com`.
3. Compare commit SHAs and workflow runs in that repository.
4. Publish to the custom-domain owner.

Do not change DNS or remove `CNAME` to solve this symptom. The 2026-07-29
incident was caused by pushing to the personal fork while the organization
repository owned the domain.

## Gumroad Overlay CSP

A CSP source of `gumroad.com` does not include its subdomains. The loader at
`https://gumroad.com/js/gumroad.js` loads its bundle and overlay styles from
`https://assets.gumroad.com`, which must be allowed in both `script-src` and
`style-src`. Its overlay design stylesheet also loads fonts from that asset
origin, which must be allowed in `font-src`. The catalog links to
`https://edgelessai.gumroad.com`, so that
merchant origin must also be allowed in `frame-src`. The parent overlay does
not require additional `connect-src` origins; requests made inside the merchant
iframe are governed by Gumroad's own response policy, not the parent meta CSP.
Prefer these explicit HTTPS hosts over a blanket wildcard.

`npm run test:launch` includes source-policy regression tests. After building,
serve `out/` locally and run the real-network browser probe:

```bash
node scripts/verify-gumroad-csp.mjs http://127.0.0.1:8877 /path/to/local-evidence
```

After the reviewed production deployment, run the same probe against the
custom domain:

```bash
node scripts/verify-gumroad-csp.mjs https://edgelesslab.com /path/to/live-evidence
```

It checks `/products/`, `/`, and `/about/`, clicks a catalog purchase/download
link without buying anything, and writes `browser-report.json` and an overlay
screenshot. A local screenshot is not evidence of production deployment.
