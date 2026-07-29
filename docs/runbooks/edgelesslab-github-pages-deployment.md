# EdgelessLab GitHub Pages Deployment

**Status:** Canonical operational runbook

**Updated:** 2026-07-29

**Production owner:** `edgeless-ai/edgelesslab.com`

## Non-Negotiable Source of Truth

`https://edgelesslab.com` is published by:

```text
https://github.com/edgeless-ai/edgelesslab.com
```

The local checkout is:

```text
/Users/djm/claude-projects/edgelesslab.com
```

The repository `thedavidmurray/edgelesslab.com` is a personal fork. Its Pages
artifact appears at `https://thedavidmurray.github.io/edgelesslab.com/`, but it
does not own the production custom domain.

## Why This Runbook Exists

On 2026-07-29, a complete redesign was pushed to the personal fork. Its build,
tests, and Pages deployment all passed, but `edgelesslab.com` remained on the
old artifact. GitHub Pages configuration revealed:

- `edgeless-ai/edgelesslab.com`: `cname = edgelesslab.com`
- `thedavidmurray/edgelesslab.com`: `cname = null`

The local remote name `origin` was therefore not a reliable production signal.
The organization repository was updated explicitly, after which the custom
domain served the new artifact.

## Operator Procedure

### Resolve ownership before publishing

```bash
gh api repos/edgeless-ai/edgelesslab.com/pages \
  --jq '{status, cname, html_url, build_type, source}'
```

Expected production facts:

```text
cname: edgelesslab.com
html_url: https://edgelesslab.com/
build_type: workflow
```

### Verify local state

```bash
cd /Users/djm/claude-projects/edgelesslab.com
git remote -v
git status --short --branch
git branch -vv
```

Preserve unrelated worktree changes. Do not assume a remote named `origin`
points to production.

### Test

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm exec vitest run
pnpm exec playwright test
```

### Publish explicitly when tracking is ambiguous

```bash
git -c credential.helper='!gh auth git-credential' \
  push https://github.com/edgeless-ai/edgelesslab.com.git HEAD:main
```

Never force-push. Integrate divergent histories in a temporary worktree and
preserve organization-only commits.

### Require green canonical workflows

```bash
gh run list \
  --repo edgeless-ai/edgelesslab.com \
  --branch main \
  --limit 10
```

Require Frontend Tests, E2E Tests, and Deploy to GitHub Pages to pass.

### Verify production

```bash
curl -sSIL https://edgelesslab.com/index.html
curl -sSL https://edgelesslab.com/ | \
  rg 'Edgeless Lab \| Systems, Field Notes, and Generative Work'
```

GitHub Pages can retain a custom-domain object for 600 seconds. Inspect
`last-modified`, `etag`, `age`, and `x-cache`. A fresh artifact on a fork's
`github.io` URL does not prove the custom domain has changed.

Finally, use a clean browser session to exercise navigation and search and to
check the console. Search must be opened and queried, not merely rendered in
the static HTML.

## Related Repository Runbook

The implementation-specific copy lives at:

```text
/Users/djm/claude-projects/edgelesslab.com/docs/deployment-runbook.md
```
