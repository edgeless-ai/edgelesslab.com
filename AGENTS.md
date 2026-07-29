# EdgelessLab Agent Instructions

These instructions apply to Claude Code, Codex, Hermes workers, and any other
agent changing or publishing `edgelesslab.com`.

## Canonical Source and Production Owner

- Local checkout: `/Users/djm/claude-projects/edgelesslab.com`
- Canonical production repository: `https://github.com/edgeless-ai/edgelesslab.com`
- Production custom domain: `https://edgelesslab.com`
- Personal fork: `https://github.com/thedavidmurray/edgelesslab.com`

The personal fork is not the production source of truth. A successful push and
green Pages deployment there only update
`https://thedavidmurray.github.io/edgelesslab.com/`. They do not update the
custom domain.

Do not infer the production target from the local remote named `origin`.
Resolve the GitHub Pages owner before every deploy:

```bash
gh api repos/edgeless-ai/edgelesslab.com/pages \
  --jq '{status, cname, html_url, build_type}'
```

The expected result has `cname: "edgelesslab.com"` and
`html_url: "https://edgelesslab.com/"`.

## Required Deployment Procedure

1. Read [`docs/deployment-runbook.md`](docs/deployment-runbook.md).
2. Preserve unrelated worktree changes.
3. Run the relevant tests and a complete static export.
4. Confirm `CNAME` and `public/CNAME` both contain `edgelesslab.com`.
5. Push explicitly to `edgeless-ai/edgelesslab.com`, unless the current branch
   is already tracking that repository and the tracking relationship has been
   verified.
6. Require green Frontend Tests, E2E Tests, and Deploy to GitHub Pages.
7. Verify the custom domain itself with HTTP and a clean browser session.

GitHub Pages may cache an older custom-domain object for up to 600 seconds.
Compare headers and the direct Pages artifact before diagnosing a failed
deployment. A new artifact at the personal fork's `github.io` URL is not
evidence that production changed.

## Production Verification

At minimum, verify:

```bash
curl -sSIL https://edgelesslab.com/index.html
curl -sSL https://edgelesslab.com/ | rg \
  'Edgeless Lab \| Systems, Field Notes, and Generative Work'
curl -sSL https://edgelesslab.com/field-notes/ | rg 'Field Notes'
```

Then open the production site in a clean browser session and check the console.
For navigation or search changes, exercise the actual interaction. A route
returning HTTP 200 is not sufficient evidence that client-side behavior works.

## Content and Safety

- Never publish credentials, tokens, provider keys, private infrastructure
  addresses, or reversible secret fingerprints.
- Do not replace standalone creative artifacts with partial build output.
- Canvas control panels must be hideable so the art can be viewed alone.
- The public writing section is called Blog. The experimental archive is
  called Field Notes.
- Shop remains visible, but Shop implementation is a separate product surface.
