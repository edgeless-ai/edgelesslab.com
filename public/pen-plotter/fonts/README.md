# Pen-plotter font provenance

Typography is unchanged: Boska 300/400/500 normal and italic, JetBrains Mono 400/500/700 normal and 400 italic, with the original Google Fonts Unicode ranges. The repeated normal JetBrains declarations use the same variable WOFF2 bytes and are represented as weight range 400–700. All faces retain `font-display: swap`.

JetBrains Mono's twelve WOFF2 files are bundled unchanged under SIL OFL 1.1 (see `OFL.txt`), from Google's stylesheet:
https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap
File 11 is the normal Latin subset and is preloaded by the page.

Boska's six official WOFF2 files are downloaded unchanged from Fontshare by `node scripts/prepare-pen-plotter-fonts.mjs` before the build. URLs and SHA-256 digests are pinned in `scripts/pen-plotter-boska.json`. The downloader validates existing files, retries bounded network requests, and fails closed on changed publisher bytes. For direct local development, run that command once before `pnpm dev`.

Boska is proprietary freeware under ITF's Free Font License:
https://www.fontshare.com/licenses/itf-ffl
The current license explicitly permits self-hosting on the licensee's own websites using CSS @font-face (section 01), while prohibiting redistribution through public font repositories and font modification (section 02). Accordingly the Boska binaries are ignored, not committed or included in the PR; site builds obtain their own original copies directly from Fontshare and deploy them solely for this site's typography. No conversion, subsetting, or metadata changes are made. Review and comply with the current publisher terms when building/deploying.
