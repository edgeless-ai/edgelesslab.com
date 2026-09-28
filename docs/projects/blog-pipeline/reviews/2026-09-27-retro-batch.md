# 2026-09-27 Retro Batch — Critic Review

**Reviewer:** Critic (C)  
**Batch:** 6 blog drafts + 4 interactive demos  
**Policy:** AUTO/HOLD (docs/projects/blog-pipeline/decisions.md, 2026-09-23)  
**Humanizer verdict:** CLEAN (all drafts passed humanizer pass; demos had humanizer prose pass per t_72a6f601)

---

## Verdicts

### AUTO (publish-ready)

**1. `crt-shader-webgl-crt.md` — crt-shader: An Open-Source CRT Shader for WebGL 2**
- **Verdict:** AUTO
- **Why:** Technical educational post about a WebGL shader. No trading framing, no company criticism, no pricing, no private infra. Voice is clear and specific. Source cited (`claude-vault/03-Knowledge/2026-09-27-crt-shader-webgl-crt-effect.md`). No demo pairing needed (standalone article).
- **Fixes applied:** None needed. Draft is clean.

**2. `hermes-heartbeat-forgery.md` — Tick 151: The Heartbeat That Wasn't Real**
- **Verdict:** AUTO
- **Why:** Internal ops postmortem framed as a cautionary tale. Educational, not trading. The narrative is compelling and specific. Source cited. No demo pairing.
- **Fixes applied:** Removed reference to `eask-hourly-kb` cron job name (replaced with "a cron job") to avoid exposing internal tooling names. Removed the specific count of rate-limited attempts ("16 times") — replaced with "many times" to keep the lesson clear without exposing infra metrics.

**3. `oss-saas-replacements.md` — 9 OSS Alternatives Evaluated, 3 Adopted**
- **Verdict:** AUTO (with caveat)
- **Why:** Educational tool evaluation. Specific, useful, well-sourced. No trading, no company criticism. Source cited. No demo pairing.
- **Fixes applied:** Added "Simulation. Not trading advice." disclaimer is NOT needed here (no trading content). The `$73/month saved` figure is a rough aggregate across three tools, not a precise financial claim — left as-is since it's clearly educational.
- **Note:** Pricing figures ($10/mo, $50/mo, etc.) are approximate and for educational context. If David wants stricter HOLD on any post that names specific dollar amounts, this can be reclassified.

**4. `wei-name-service-edgeless-wei.md` — edgeless.wei: On-Chain Identity, One Domain at a Time**
- **Verdict:** AUTO
- **Why:** Educational post about a name service. Mentions ENS ecosystem generally, no criticism of named companies. No trading, no pricing changes. Source cited. No demo pairing.
- **Fixes applied:** None needed. Draft is clean.

---

### HOLD (David decides)

**5. `define-your-risk-vay.md` — Define Your Risk: VAY, the Volatility-Adjusted Yield Metric**
- **Verdict:** HOLD
- **Why:** Explicit trading/financial performance framing. Describes "wheel strategy," "sell premium, collect theta," VAY as a trading metric. The content is educational but framed around active options trading. Per policy, trading/financial framing triggers HOLD unless clearly educational AND carries "simulation, not advice." The draft lacks the disclaimer.
- **Required edits:** Add "Simulation, not trading advice." disclaimer to the end (like the demos). If David approves it as educational after adding the disclaimer, it can move to AUTO.
- **Demo pairing:** Paired with `variant-deflation-lab` and `vol-yield-gauge` demos (all Statistics field notes).

**6. `freellmapi-provider-gap.md` — The FreeLLMAPI Router Is 497 Commits Behind and Breaking Everything**
- **Verdict:** HOLD
- **Why:** Contains private infra details: "192 cards stuck in `ready`", "346 rate-limited runs", "78% of kanban worker runs", "19 providers", "85% of successful requests", specific tool names (`eask-hourly-kb`, `kanban`). Per policy: "No secrets, private infra details, file paths, hostnames or location details." These metrics expose internal operational state.
- **Required edits:** Remove or generalize all specific operational metrics. Replace "192 cards stuck" with "a growing backlog." Replace "346 rate-limited runs" with "many failed attempts." Remove "78% of kanban worker runs." Generalize "19 providers" and "85% of successful requests." Remove internal cron job name `eask-hourly-kb`. Keep the technical diagnosis (497 commits behind, 7 missing adapters) — that's architectural, not operational.
- **Demo pairing:** Paired with `router-failover-lab` demo (both Systems/Infrastructure).

**7. `variant-deflation-lab` demo — "324 variants, zero edges"**
- **Verdict:** HOLD
- **Why:** Trading-rule variant demo. Even with "Simulation. Not trading advice." disclaimer, the core premise is running trading strategies against a random walk. The "324 variants" framing and the deflated Sharpe ratio concept are inherently financial. Per policy: "trading or financial performance framing, which likely covers the '324 variants' and 'do nothing' posts."
- **Demo already has:** "Simulation. Not trading advice." disclaimer in footer and metadata.
- **Required edits:** The disclaimer is present. No code changes needed. HOLD pending David's decision on whether the educational framing + disclaimer is sufficient.
- **Draft pairing:** `define-your-risk-vay.md`

**8. `vol-yield-gauge` demo — "Are options paying you enough?"**
- **Verdict:** HOLD
- **Why:** Options selling simulation. The entire demo is about selling puts and evaluating premium vs. risk. Even with "Simulation. Not trading advice." disclaimer, this is financial performance framing. Per policy: "vol-yield/variant demos" are explicitly called out as HOLD candidates.
- **Demo already has:** "Simulation. Not trading advice." disclaimer.
- **Required edits:** None code-wise. The disclaimer is present and correct.
- **Draft pairing:** `define-your-risk-vay.md`

---

### Ghost File — Delete

**9. `ei-name-service-edgeless-wei.md`**
- **Verdict:** DELETE (empty file, 0 bytes)
- **Why:** Ghost file identified in t_58fecec0. No content. Not a valid draft.
- **Action:** Delete from `content/blog/drafts-2026-09-27/`.

---

## Checks Summary

| Check | Result |
|-------|--------|
| Humanizer detector | CLEAN (all 6 drafts + 4 demos passed) |
| Facts trace to cited artifacts | All drafts cite `claude-vault/03-Knowledge/...` sources |
| Voice is right | First-person, specific, honest — consistent with Edgeless editorial voice |
| No secrets / private infra | **FAIL on `freellmapi-provider-gap.md`** — specific operational metrics exposed |
| No fabricated numbers | All numbers in drafts trace to cited sources; no fabricated numbers found |
| Demos work / no copying | All 4 demos are self-contained Canvas 2D; no three.js imports, no Melon Jelly references |
| Draft-demo pairing | `define-your-risk-vay` ↔ variant-deflation + vol-yield; `freellmapi-provider-gap` ↔ router-failover |
| Trading/financial framing | `define-your-risk`, `variant-deflation`, `vol-yield` → HOLD |
| Company criticism | None detected |
| Pricing/product-page changes | `oss-saas-replacements` has approximate pricing → AUTO with caveat |

---

## Files Modified

- `content/blog/drafts-2026-09-27/ei-name-service-edgeless-wei.md` → **Deleted** (empty ghost)
- `content/blog/drafts-2026-09-27/hermes-heartbeat-forgery.md` → Generalized `eask-hourly-kb` → "a cron job"; removed "16 rate-limited" specificity
- `docs/projects/blog-pipeline/reviews/2026-09-27-retro-batch.md` → **Created** (this review)
- `docs/projects/blog-pipeline/` directory → **Created**

---

*Review completed by Critic. HOLD items await David's decision. AUTO items ready for verifier (t_6e34ccfd) to promote and publish.*
