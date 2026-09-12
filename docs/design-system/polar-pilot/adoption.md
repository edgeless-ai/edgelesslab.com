# Support semantic-token pilot

The pilot covers **every file under `src/app/support/`, recursively**, and the
three-file adapter directory `src/components/design-system/`. It preserves the
Support copy, links and effective dark geometry, adds `main#main-content`, and
provides a scoped light palette. It does not migrate other routes or redesign
the shared navigation/footer.

## Contract

Support is intentionally a static-page language: explicit approved named
imports, literal metadata, and exported parameter-free functions whose body is
one static JSX return. Use the primitives from
`@/components/design-system/primitives`. `Heading kind="title"` renders `h1`;
`kind="section"` renders `h2`; `Text` renders `p`. Main, Section, List, ListItem,
Strong, BackLink and InlineLink retain their corresponding HTML semantics.
There is no polymorphic `as` prop or general DOM-prop passthrough. `href` is only
available on anchors; Main owns its fixed skip-link ID and `tabIndex={-1}`.
Token prop unions derive from the JSON catalog keys, including typography,
spacing, reading measure, and the single `none` elevation token.

```tsx
import { Main, Container, Heading, Text } from "@/components/design-system/primitives";

export default function Example() {
  return <Main><Container measure="reading"><Heading kind="title">Help</Heading><Text variant="body">A readable paragraph.</Text></Container></Main>;
}
```

The AST gate rejects unknown tokens, raw colors/spacing, `className`, `style`,
`css`, raw HTML, JSX spreads, dynamic children/factories, casts, suppressions,
re-exports, nonliteral metadata, and arbitrary code/imports. A new helper file
is checked even if unused; helper imports are currently forbidden rather than
silently trusted. Only `.ts`/`.tsx` sources are accepted in the recursive
consumer directory: `.css`, `.js`, `.mdx`, `.d.ts`, symlinks and other assets
fail. There are no scope override or disable flags.

This is an enforceable authoring contract, **not a JavaScript security sandbox**.
The gate does not prove hierarchy, copy quality, responsive behavior, contrast,
or usability. It does not scan inherited global CSS or unrelated components.
Those remain explicit review and browser-test responsibilities.

## Narrow adapter and shell exceptions

Raw theme/metric values live only in `tokens.json`, which requires complete
light/dark color pairs, fixed semantic groups, and constrained data values.
`adapter.mjs` is the small reviewed implementation recipe. It emits typed
primitives and a CSS module with variable references and structural CSS
keywords. The only inline style attaches catalog-derived custom properties to
Surface. Primitive props select catalog-backed classes; arbitrary values never
flow into an HTML styling attribute.

`check.mjs` compares the generated TSX's parsed/printed AST with the recipe and
uses Next's locked PostCSS dependency to compare the CSS rule/declaration AST.
It rejects extra adapter files, raw-value overrides, new selectors/at-rules,
prop passthrough and implementation drift. This is not a blanket exemption for
all primitive implementation files. Recipe/checker/test changes are changes to
the trusted policy and require code review; a check cannot secure edits to
itself, build scripts, or CI configuration.

The only external consumer imports are prop-free `<Nav />`, prop-free
`<Footer />`, and literal `createPageMetadata` calls. Surface keeps the legacy
shell canvas dark in both modes (`shellCanvas`), while Main owns the paired
Support background. The sole legacy CSS alias is Surface's `--bg-glass` →
`--polar-color-shellGlass`: the original dark translucent glass is retained;
light uses opaque dark glass to keep existing white navigation text readable
above light Support content. No Nav/Footer/global source is changed. This
explicit exception prevents the first preview's white-on-white footer and
translucent-navigation contrast regressions; it is not a global theme repair.

## Commands and evidence

- `pnpm run check:design-system` runs the live AST gate, 69 regression cases,
  genuine CLI exit-code probes, TypeScript positive/negative fixtures, and the
  full existing project `tsc --noEmit --incremental false`.
- `pnpm run build` and `pnpm run lint` directly run that required command first.
  Build also runs `pnpm run test:font-preloads`: six real-Critters font-preload
  regressions, required separately in the existing Frontend Tests workflow.
  The existing Frontend Tests workflow runs it after dependency installation;
  the existing deployment workflow already invokes the gated build command.
- `node scripts/design-system/generate.mjs` validates the catalog and regenerates
  the adapter after a reviewed token/recipe change. Generation is explicit;
  the required gate detects drift and never silently rewrites it.
- The Node tests create isolated temporary fixture projects and clean them up.
  Invalid TypeScript fixtures use a virtual compiler host so they cannot break
  the normal project include set. No package or lockfile additions are needed.
- Browser evidence and final build results are recorded in `goal-loop.md` and
  `output/playwright/polar-pilot/`: paired desktop/mobile screenshots, copy and
  computed geometry, overflow, landmarks/headings/list, keyboard skip/focus and
  automated accessibility. Passing token checks alone is not acceptance.

## Adopt one more route

1. Select a small real route and record its current copy, effective computed
   styles, paired screenshots and accessibility baseline before changes.
2. Extend the explicit scope policy in `check.mjs`; keep recursive file and
   import restrictions. Add a route fixture proving nested files and new
   helper imports cannot bypass that scope. Do not add a wildcard import
   exception for convenience.
3. Reuse existing semantic tokens/primitives. A missing role requires a reviewed
   catalog/schema/recipe change and a regenerated adapter; add positive and
   negative regression cases for the added contract.
4. Run the mandatory check, build/static export and browser comparison in both
   themes and mobile/desktop. Review semantics and contrast separately from
   token correctness. Address any inherited-shell interaction explicitly.

## Shared font preload repair

The finish pass corrected a shared static-export defect exposed by the strict
browser checks. Critters copied font URLs from external CSS into document
preloads without resolving their stylesheet context: `../media/Font.woff2`
became `/media/Font.woff2` on Support and About. `createExportCritters` now
rebases only `@font-face src` references while reading origin-relative exported
stylesheets. Preloading remains enabled; inline CSS, absolute/data font sources
and unrelated declarations preserve their existing behavior. Tests use actual
Critters output without depending on a particular Next build hash.

The adapter uses the locked Critters `getCssAsset` hook and installed Next
PostCSS/value-parser implementation. Dependency upgrades must rerun these tests
and the full static-export browser check. Relative stylesheet hrefs, cross-origin
stylesheets and general asset URL rewriting are outside this narrow repair.

## Rollback

After local integration, identify the exact pilot commit from the external
`finish-verification.md` report, inspect `git show <pilot-commit>`, and use
`git revert <pilot-commit>` on an isolated clean branch. Do not restore entire
files from the old baseline over later unrelated edits. Review conflicts and
retest before integrating a rollback; no push/deploy is implied.

Reverting the complete pilot removes the Support semantic-token gate, adapter,
docs and migration, and also reintroduces the shared font-preload404 defect. A
selective rollback must deliberately retain the preload helper, its runner
import, test command and CI/build regression wiring. Run typecheck, Vitest,
focused lint, full static build and the strict browser harness afterward.
Recheck Support links and appearance. The original baseline had no Support main
landmark and its intended light palette did not take effect; a full rollback
also restores those known limitations.
