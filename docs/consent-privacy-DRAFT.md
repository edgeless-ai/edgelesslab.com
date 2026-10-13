# Consent & Privacy — UNPUBLISHED DRAFT (pending David / counsel)

This file is not compiled into the public privacy page. Do not publish this
proposal without David and counsel approving the data-handling statements.
The existing public privacy prose is intentionally unchanged in this task.

## Current implementation and unresolved policy conflict

Main and shop analytics default to opt-in. No optional PostHog pageviews,
cookieless counting, interaction events, or analytics ingest run before valid
acceptance or after rejection. `NEXT_PUBLIC_ANALYTICS_MODE=disabled` on main
(and the shop's corresponding build setting) prevents analytics even with
acceptance. The v2 cookie is authoritative; legacy acceptance never migrates.
Legacy rejection may migrate when the v2 cookie is absent.

Cookie contract: `edgeless.analytics-consent.v2`, literal `accepted` or
`rejected`, `Path=/`, `SameSite=Lax`, `Max-Age=15552000`, `Secure` on HTTPS.
`Domain=edgelesslab.com` is used only on the apex and its subdomains; other
hosts use a host-only cookie. Conflicting/duplicate scopes fail closed, with
rejection taking precedence. Storage cannot substitute for a blocked cookie.

The current public privacy page says that pre-consent cookieless counting
continues after rejection. **That conflicts with this implementation.** Other
existing claims about anonymity, identifiers, and cross-site tracking also
require review against actual PostHog and ingest behavior. This draft does not
validate those claims or provide a legal compliance conclusion.

## Proposed replacement wording — NOT APPROVED / NOT PUBLISHED

> Optional website analytics are off until you accept. Before acceptance and
> after rejection, we do not send optional analytics events, including
> cookieless pageviews. Your choice is stored in a consent cookie shared by
> edgelesslab.com and shop.edgelesslab.com. You can change it in Analytics
> settings. Withdrawing consent stops further optional analytics and removes
> accessible browser analytics identifiers; it does not delete events already
> sent. Analytics can also be disabled by site configuration.

## Review required before publication

- David/counsel must approve wording and resolve the existing policy conflict.
- Confirm consent-cookie lifetime, scope, and required-cookie treatment.
- Describe actual accepted-event data, processors, retention, and user rights.
- Review identity/anonymity claims and the limits of browser cleanup (inaccessible
  cookie paths, HttpOnly cookies, and blocked browser storage cannot be erased by
  client JavaScript).
- Decide how the shop privacy page and main privacy page will stay consistent.

## Reproduce implementation checks (no deployment)

Run `npx vitest run`, then build the static preview with
`NEXT_PUBLIC_POSTHOG_KEY=phc_consent_verification_test NEXT_PUBLIC_ANALYTICS_MODE=opt-in npm run build`.
Run `npx playwright test --config=playwright.consent.config.ts` against that export.
The synthetic public test key is not a production credential. All PostHog
transport is intercepted by the browser suite. The harness masks webdriver,
HeadlessChrome UA and client hints to exercise normal-visitor SDK behavior;
otherwise SDK bot filtering can falsely hide accepted-state capture.
Do not deploy the test export or publish this draft wording.
