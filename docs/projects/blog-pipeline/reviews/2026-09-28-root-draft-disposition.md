# Root draft queue disposition — 2026-09-28

The root `drafts/*.md` directory is the pipeline inbox. This pass cleared the inbox without publishing:

- `hermes-heartbeat-forgery.md` → `drafts/superseded/`: an independently reviewed AUTO version already exists at `content/blog/hermes-heartbeat-forgery.md` and is registered in commit `629b45cd0`.
- `kimi-k3-cheap-demo-premium-infrastructure.md` → `drafts/hold/`: named-company comparison plus model pricing and benchmark claims require HOLD review under the AUTO/HOLD policy.
- `the-7-second-duplicate.md` → `drafts/hold/`: the post contains trading-program performance and strategy details, so it is HOLD pending reputational/financial review.
- `the-80-turn-loop-that-taught-us-silence.md` → `drafts/review/`: potentially AUTO, but quotations and internal incident details require independent privacy/fact review.
- `the-loop-is-not-the-guarantee.md` → `drafts/review/`: potentially AUTO, pending source, current-API, and humanizer verification.
- `the-skill-is-the-new-prompt.md` → `drafts/review/`: potentially AUTO, pending verification of model/company comparisons, quantitative claims, and humanizer status.

No file in this batch was published or pushed. The follow-up critic card owns the three review candidates and confirms the two HOLD classifications for the weekly digest.
