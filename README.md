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
npm ci
npm run dev
```

## Contributing

Small, reviewable changes preferred. After editing routes or content, run `npm run build` and preview `out/` before opening a PR.

## Deploy

This repository deploys to GitHub Pages. Pushing to the `main` branch triggers the Pages workflow in `.github/workflows/deploy.yml`.

Build steps:
- install dependencies with `npm ci`
- run `npm run build`
- upload the `out/` artifact to GitHub Pages
- if Pages deployment fails the workflow retries once

Before pushing deploy-related changes, confirm:
- `npm run build` succeeds
- affected pages render correctly from `out/`
- `CNAME` still contains `edgelesslab.com` if custom domain settings need to stay intact

## License

See LICENSE in the repository root.
