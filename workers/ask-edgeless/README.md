# Ask Edgeless — quarantined draft previews

Uses pinned `@page-agent/core` 1.12.4, not a custom agent loop. Browser actions are navigate/search/filter/scroll/open-product plus terminal `done`; built-in click/type/JavaScript tools are removed. DOM/source text is untrusted. Navigation requires exact index membership, and cart/checkout/personal-data requests are refused. Grounding comes from the generated Blog/Field Notes/Lab index and the real shop `/catalog.json`.

Production flags remain **false**, with an additional production-hostname guard. Drafts: site [#120](https://github.com/edgeless-ai/edgelesslab.com/pull/120), shop [#14](https://github.com/thedavidmurray/edgeless-store-api/pull/14). No production merge, deploy, or activation is authorized by these drafts.

## Current hold: runtime prerequisite t_ef9b8888

`t_ef9b8888` is the spec-complete replacement for orientation-only `t_be6c22c2`. Its implementation and independent review are still pending; no runtime activation or account/token-bound attestation is implied.

The existing deployed preview endpoint remains `ASK_ENABLED=disabled` (HTTP404 `disabled`). Preview HTML is available, but this prevents the UTC budget reset silently reopening unsafe inference. **Do not re-enable until scoped runtime privacy, per-attempt reservation and pre-call zero-cost admission have independently passed review.**

This revision fixes the site-owned R4–R6 findings from review t_c0e42f0e and adds a fail-closed integration contract for R1–R3. It does NOT claim those shared-runtime findings are fixed. The relay defaults OFF unless `ASK_RUNTIME_POLICY=ask-edgeless-v1`; it calls only `http://127.0.0.1:3001/v1/ask-edgeless/chat/completions`, never the unsafe shared completion route. That endpoint is a **pending prerequisite**, not a fallback implemented here. A numeric `ask_admission` receipt must prove policy v1, exactly one reserved attempt, free-only/counts-only admission and consistent measured/reserved tokens. A receipt check is not itself proof that the runtime implements that policy; independent adapter-spy and sink tests are mandatory before activation.

## Site boundary

- `protocol.mjs` owns the exact positive `AgentOutput` schema and forced tool choice, shared by browser/Worker/relay. Missing, changed or additional tools are rejected before networking. Browser-provided model/limits/URL never select the upstream route.
- Upstream bodies are incrementally capped at 16,384 bytes (without trusting Content-Length). Exactly one typed function call with one permitted bounded action is accepted. Extra action fields, wrong types, unsafe URLs, malformed arguments, empty/multiple choices and finish reasons other than `tool_calls` fail closed. Output usage components must be nonnegative integers, add up, remain within reservation and respect the 1,024-output-token ceiling.
- PageAgentCore packs task/history in one user message. That packed string is preserved exactly (including prior-action results). Unsupported standalone assistant/tool-history clients and state >24,000 characters are rejected explicitly, never silently sliced. The intentionally bounded 2,000-character DOM excerpt is separate from packed control state.
- A singleton SQLite-backed Durable Object atomically enforces 30 requests/rolling minute/IP and 1,000,000 conservative reserved tokens/UTC day across both previews. Reservations are serialized UTF-8 request bytes +1,024 framing +1,024 output. No refund on errors or uncertain outcomes. Schema-valid usage is counted even when a completion subsequently fails validation; unknown usage remains conservatively reserved. **This outer bound alone does not prove hidden runtime attempts are covered.** Never reset/change the namespace/object/cap to make tests pass.
- Applied action and model completion are independent. A successful filter followed by truncation/error has terminal `truncated`/`failed`, never `complete`. Navigation is deferred until a valid successful `done` response. Max-step exhaustion, cancellation and packed-state overflow cannot report completion. Browser retries are disabled. The terminal event contains only status/action/numeric usage, no conversation text.
- Worker/relay never log request/response bodies or provider error text. Observability stays disabled. Widget has `ph-no-capture`, `ph-mask`, `rr-block` and private markers; bundling strips upstream console calls. These local controls are NOT an end-to-end runtime/privacy or analytics-exfiltration certification.

## Verification without inference

```sh
npm ci
npm run test:ask-edgeless
node scripts/build-ask-edgeless.mjs
node scripts/ask-edgeless-terminal-regression.mjs
npm run build
npx vitest run
SMOKE_PORT=19087 npx playwright test
```

The terminal regression runs the actual rebuilt browser bundle with explicitly synthetic local fixtures. It checks filter→length, typed truncation error, empty choices, wrong tool, malformed args, oversized packed state and valid completion. Only the valid completion may pass the same terminal predicate used by live acceptance. **These fixtures are not source catalog facts, inference measurements or live-preview acceptance.**

Build the separate shop using its frozen `merch-demo/pnpm-lock.yaml`: `pnpm install --frozen-lockfile && pnpm run build`. Copy the regenerated public bundle into the shop draft before committing its matching asset.

## Later real-preview gate (blocked until prerequisite + review)

1. Preserve original Worker name, budget namespace/object, cap and quarantine. Follow `wrangler.preview.example.jsonc` using isolated staging from `node scripts/prepare-ask-edgeless-preview.mjs "$SITE_PREVIEW" "$SHOP_PREVIEW" "$SHOP_CHECKOUT" "$STAGING"`. Never alter production export flags.
2. After independent runtime/site re-review, use server-side scoped credentials, the fixed scoped runtime endpoint and the explicit policy flag. No metered or unknown-cost fallback. No shared profile routing changes. Preview-only deployment is not production permission.
3. Run `node scripts/ask-edgeless-preview-check.mjs "$SITE_PREVIEW" "$SHOP_PREVIEW" "$EVIDENCE"`. It exercises five real prompts, requires typed successful terminal status and validated proxy outputs for the first three, zero-inference refusals for the last two, real source URL/DOM state, measured token counts, and no browser LLM/cart calls. Blog/shop PNGs and JSON are written. Any error writes `pass:false`.
4. After a full quiet minute, run `node scripts/ask-edgeless-rate-probe.mjs "$SITE_PREVIEW"` (zero-inference refusals; request31 must be HTTP429).
5. Only after ALL acceptance + independent review pass, ask David the single production question: **Enable on prod?** Keep this card blocked until that point rather than representing drafts/screenshots or an applied filter as completion.

Old five-prompt `pass:true` evidence from before terminal-status validation is invalid: the shop filter applied but the narrative truncated. Prior real token counts are historical, not fresh acceptance evidence. No new inference is authorized solely to bypass this hold.
