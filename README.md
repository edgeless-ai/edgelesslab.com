# edgelesslab.com

Source for the public site at `https://edgelesslab.com`. It is a static Next.js export that serves pages, labs, docs, and generated artifacts.

## What lives here

- public pages such as index, blog posts, about, terms, and privacy
- lab experiences and generated artifacts
- static assets and exported build output under `out/`

## Getting started

```bash
git clone https://github.com/edgeless-ai/edgelesslab.com.git
cd edgelesslab.com
pnpm install --frozen-lockfile
pnpm dev
```

## Contributing

Small, reviewable changes preferred. After editing routes or content, run
`pnpm build` and preview `out/` before opening a PR.

## Deploy

This repository deploys to GitHub Pages. Pushing to the `main` branch triggers the Pages workflow in `.github/workflows/deploy.yml`.

The production source of truth is
[`edgeless-ai/edgelesslab.com`](https://github.com/edgeless-ai/edgelesslab.com).
The personal fork at `thedavidmurray/edgelesslab.com` can produce a successful
Pages build, but it does not own `edgelesslab.com` and cannot publish the custom
domain.

Before deploying, read [`docs/deployment-runbook.md`](docs/deployment-runbook.md)
and verify the Pages owner:

```bash
gh api repos/edgeless-ai/edgelesslab.com/pages \
  --jq '{status, cname, html_url, build_type}'
```

Build steps:

- install dependencies with `pnpm install --frozen-lockfile`
- run `pnpm build`
- upload the `out/` artifact to GitHub Pages
- if Pages deployment fails the workflow retries once

Before pushing deploy-related changes, confirm:

- `pnpm build` succeeds
- affected pages render correctly from `out/`
- `CNAME` still contains `edgelesslab.com` if custom domain settings need to stay intact
- the push target is `edgeless-ai/edgelesslab.com`, regardless of the local remote name
- Frontend Tests, E2E Tests, and Deploy to GitHub Pages all pass
- `https://edgelesslab.com` itself serves the new artifact after the GitHub Pages cache window

## License

See LICENSE in the repository root.
