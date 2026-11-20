# ProvenanceGuard publication witness

Task: `t_cd598e3d`; critic gate: `t_48eac8fd` (27/27 accepted).

- Public demo: https://marimo.edgelesslab.com/2606.18037-provenanceguard-policy/
- Production deployment: https://ddcb3d24.edgeless-marimo.pages.dev
- Preview deployment: https://ae228212.edgeless-marimo.pages.dev
- Witness date: 2026-11-20 UTC.
- Independent evidence: `output/marimo-deployments/t_cd598e3d/` in the operator artifact store.

## Identity and mechanism

The approved export was published without editing or re-exporting it: 710 files,
26,371,693 bytes. Its index SHA-256 is
`56100a7d994b09d67c87931bbb48e7cd6209686983906f6568a2bbb72aa40cf6`.
The notebook SHA-256 is
`e0ded6acd399d99a2ee6109bc09bcbe94e355c199832812147ed708651d29dc7`.
Its site manifest digest is
`0028f067fd67296abe5280a2735e5898ffce3fd5b5f8ea2f84a4aa4278afb0f0`.

The verifier independently checked the paper's Figure 5 counts (138/139 true
blocks; 67/222 false blocks) and executed the actual notebook's arithmetic AST
against a rational-arithmetic oracle at all 151 slider settings and the exact
139/361 held-out mix: 152 cases pass. The notebook preserves its explicit
fixed-rate sensitivity-analysis boundary: no model rerun, transfer validation,
medical readiness or production-readiness result is claimed.

## Browser and delivery gates

Fresh Chromium contexts at 1440×1000 and 390×844 passed locally, on the preview,
and on the public URL. Each run checks HTTP 200, actual WASM execution, exact
headings at 38.5%, 80%, and 5%, SVG mutation and return to default, lower-page
limitations, visible control geometry, and zero document/internal output
overflow. No console, page, request, or HTTP errors occurred; cold-start external
requests were restricted to the disclosed public runtime/package hosts.

At 38.5% the output is 568 held/1,000 and 67.3% precision; at 80% it is 855 held
and 92.9% precision. SVG inner-content hashes change from
`a9483e68a2c6cbc3c8d3214ef40dbb050872ade4806338c17082d108ff796ee7` to
`cbe9f39a3a63192a1cb5eaa93c26ecc80c908d5149e5d65227154b25224274ed`.

The existing hash-pinned Pages catalog was extended by exactly one 710-file
source and one asset-deduplication rewrite. All 22,962 previously deployed
logical paths were preserved and independently HTTP/hash verified on the prior
immutable deployment. All 23,672 logical paths pass HTTP/hash checks on both
new immutable deployments; all 64 HTML/fallback probes pass on the custom domain.
Cloudflare canonical `/index.html` → `/` redirects are followed and recorded.
The packaged upload has 2,420 physical files (shared assets deduplicated), below
the Pages file cap. `published_url` was set only after the live browser gates.

## Rollback and scope

Prior production deployment: `fd485159-0088-4599-8536-815366c99745`.
If rollback is required, use the Cloudflare Pages rollback procedure in the
publication runbook, then revert this gallery/catalog PR via a new PR. Do not
push to main. No `out/` build artifacts or notebook implementation changes are
included in this gallery registration.
