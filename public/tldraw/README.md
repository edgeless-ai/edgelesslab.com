# Swarm Specimen SDK assets

These original assets were downloaded from the tldraw 3.15.6 CDN, not generated or substituted. The versioned manifest records each source URL, SHA-256 and byte length. Keep the SDK version and `src/app/lab/swarm-specimen/assets.ts` import in sync.

Refresh intentionally with `node scripts/vendor-tldraw-fonts.mjs` after installing the pinned dependency. The script derives font names, icon names and embed types from the installed SDK source; review changes on upgrades. The specimen uses English and hides the editor UI, but the SDK still preloads English translations, the icon sprite and embed icons. Other locales are not vendored because this route offers no language selector.

CSP retains existing origin allowlists; it permits blob fetches/images for SDK probes and rasterization, and data fonts for fonts embedded into SVG exports. Network font loading remains same-origin. No tldraw CDN origin was added to CSP.

The browser regression verifies all served asset hashes, every font's actual FontFace load, zero CSP violations/page errors, controls, agent placement, a nonblank PNG download, and zero Home requests for tldraw chunks. Changes are not production verification: approval, deployment and a clean live browser check remain required.
