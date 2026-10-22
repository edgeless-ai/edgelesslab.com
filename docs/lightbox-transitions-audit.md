# Native lightbox transition pilot — t_91b5228c

Status: implementation and Chrome/Firefox verification complete; Safari verification and full export blocked. Do not merge/deploy until those gates pass.

## Inventory and conversion

Audited tracked JS, TS, TSX, CSS and HTML for forced layout reads around class changes, double animation frames, zero-delay timers, hidden display/visibility rules, and transition completion handlers. Generated `out/` copies are deployment artifacts, not independent sources.

Converted two lightboxes, with changes mirrored between authoring and public files:

- `pen-plotter/index.html` / `public/pen-plotter/index.html`
- `pen-plotter/addendum.html` / `public/pen-plotter/addendum.html`

These had `display: none` together with an opacity transition that could not animate entry/exit reliably. No existing JS reflow workaround was present in these handlers; this change fixes the display/opacity pattern without introducing one. The base state remains `display: none; opacity: 0`, the open state `display: flex; opacity: 1`. Guarded native transitions include both `opacity` and `display`, `transition-behavior: allow-discrete`, and an `@starting-style` entry state. Reduced motion disables transitions. Initial and closing `inert` state keeps exiting or hidden controls out of focus/click interactions; opening clears it alongside `aria-hidden`.

Neither lightbox is a top-layer dialog/popover, so `overlay` is not applicable. Existing navigation, Escape, close-button and backdrop behavior remain unchanged.

## Hits deliberately retained / not converted

- `public/creative-demos/rejection-machine/index.html:758`: `progress.offsetWidth` restarts a width progress transition on a visible element. This is not a display-none entry; `@starting-style` does not restart a transition on an element that remains rendered.
- `public/creative-demos/telemetry-jelly-terminal/index.html:507,512`: layout reads restart jelly and LED keyframe animations on visible elements. Removing them in favor of entry styling would remove repeat-trigger behavior. Not display-toggle conversions.
- `public/total-serialism/app/preset-manager.css:114` and mirrored `app/pen-plotter/preset-manager.css`: tooltip uses `visibility` and opacity on hover, without a display-none toggle or JS reflow. Preserve the existing hover interaction; a native display conversion is unnecessary for this task.
- `src/components/command-palette.tsx`: conditional React mounting, animation utilities, and an animation-frame callback to reset/focus the input. This callback is not a forced-reflow class-toggle hack. Supporting a CSS display exit would require changing component lifetime and keyboard/focus behavior, beyond a drop-in transition replacement.
- Tracked `out/pen-plotter/*.html`: generated copies remain untouched because the complete static export currently fails. Rebuild via the deployment runbook before shipping; do not manually publish partial build output.

## Compatibility and upstream findings

The parent Baseline note is useful for `@starting-style` and `transition-behavior` individually, but does not establish support for transitions of the `display` property itself.

Current MDN browser-compat-data explicitly lists display animation support in Chrome 117+ and Safari 18+, with Firefox unsupported:
https://github.com/mdn/browser-compat-data/blob/main/css/properties/display.json (`is_animatable`).
https://developer.mozilla.org/en-US/docs/Web/CSS/display#animating_display

Observed Firefox 151 supports `@starting-style` / `allow-discrete`, but does not animate display. Entry opacity fades; exit instantly hides without leaving interactive controls. The CSS feature guard cannot detect that property-specific support gap. Older browsers without allow-discrete use the plain display toggle. Do not promise animated exit in Firefox based only on the parent's safe label.

qmd recovered the Fireship Baseline note and the canonical positive-definition reference. Following [[context-engineering-positive-definition-good-work]], correctness means observable entry/exit semantics in supported browsers, an operable fallback, reduced-motion compliance, noninteractive closed/exiting controls, unchanged navigation, and reproducible browser checks.

## Reproducible verification

Install: `npm ci`, then `npx playwright install chromium firefox webkit`.

- `LIGHTBOX_BROWSER=chrome node scripts/test-lightbox-transitions.mjs` — PASS, 6 scenarios, Google Chrome 154.0.8037.98.
- `LIGHTBOX_BROWSER=firefox node scripts/test-lightbox-transitions.mjs` — PASS, 6 scenarios, Firefox 151.0.
- Chromium 149.0.7827.55 — six scenarios also passed during the combined run; that combined run subsequently timed out on WebKit.
- `npx eslint scripts/test-lightbox-transitions.mjs` — PASS.
- `git diff --check` — PASS.

Each browser runs both public pages under native, reduced-motion, and simulated unsupported-feature styles. Checks include entry/exit midpoint and settled state, inert/ARIA state, neighbor navigation, Escape, close button, backdrop, and reopening during exit. The harness also verifies transition rules and absence of reflow/timer hooks in all four source/served lightbox handlers. WAAPI midpoint sampling and a style flush exist only in tests to avoid headless frame-throttling races; production handlers contain neither.

The harness substitutes a small manifest assembled from real repository records for efficient loading; it does not fabricate catalog values or verify the entire live catalog, imagery, full Next.js export, or production deployment. No visual screenshot certification is claimed.

## Blocking gates

- Safari 26.5.2 WebDriver returns: `You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.` An operator must enable this and test both pages for entry/exit, navigation, reopen, reduced motion and inert behavior. Safari has not passed.
- Node Playwright WebKit run timed out after 90 seconds; this is not Safari verification and no WebKit pass is claimed.
- `npm run build` and full `npm run lint` stop at the existing TypeScript error: `src/lib/analytics-consent.ts(167,7): TS2353: 'disable_beacon' does not exist in type 'Partial<PostHogConfig>'`. The file is unchanged by this patch. Design-system gate and all 69 design-system tests passed before the type error. Full static export did not run to completion.

No merge or deployment performed. This pilot remains draft pending those gates.
