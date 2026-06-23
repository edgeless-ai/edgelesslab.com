# OpenMontage — Architecture Analysis & What's Worth Lifting

> Investigated 2026-06-23. Repo: `calesthio/OpenMontage` · 14.9k★ · AGPL-3.0 · Python/TS · pushed 2026-06-22.
> Decision: **high relevance to our creative stack — harvest patterns, mind the AGPL boundary.**

## What it is

An **agent-orchestrated** video production platform. The headline architectural choice (from `docs/ARCHITECTURE.md`):

> "There is no runtime Python orchestrator; the agent _is_ the control plane."

The LLM coding assistant reads YAML pipeline manifests, follows Markdown "director" skills, calls Python tools via a registry, writes JSON checkpoints, and self-reviews — with optional human approval gates. This is **the same skill-driven, agent-as-orchestrator pattern we already use** (video-use, local-tts, Remotion, FLORA), just formalized into a full studio. That alignment is why it's worth mining rather than dismissing.

## High-level flow

```
topic → agent reads pipeline manifest (YAML)
      → per stage: read director skill (MD) → call Python tools → write checkpoint (JSON)
                 → self-review (meta/reviewer skill) → human approval gate (if configured)
      → final video
```

## Repo layout (the parts that matter)

| Path | What's there |
|------|--------------|
| `pipeline_defs/*.yaml` | 13 declarative pipelines (explainer, documentary-montage, cinematic, talking-head, podcast-repurpose, localization-dub, …) |
| `tools/` | 57+ Python tools grouped by category (analysis, audio, avatar, enhancement, graphics, subtitle, video) behind a `BaseTool` contract |
| `tools/base_tool.py` | The **tool contract**: tiers, stability, runtime (API/local), determinism, resume support, cost + runtime estimators, idempotency keys, retry policy |
| `tools/tool_registry.py` | Auto-discovery singleton; query tools by tier/status/capability |
| `tools/cost_tracker.py` | Budget governance: estimate → reserve → reconcile |
| `skills/meta/` | The orchestration brain: `reviewer.md`, `checkpoint-protocol.md`, `creative-intake.md`, `video-reference-analyst.md`, `animation-runtime-selector.md` |
| `skills/core/` | ffmpeg, remotion, hyperframes, color-grading, subtitle-sync, whisperx |
| `config.yaml` | Global governance: budget mode (observe/warn/cap), per-action approval $, checkpoint policy, output defaults |
| `docs/PROVIDERS.md` | Provider catalog + free-first setup ladder + 7-dimension scoring |

---

## What to lift (ranked by value to us)

### 1. The reviewer's CHAI critique discipline — **lift verbatim into our review skills**
`skills/meta/reviewer.md` encodes a hard rule grounded in the CMU/Harvard CHAI study (arXiv 2604.21718): every critique must be **Accurate** (point to a concrete artifact field/line/frame — no hallucinated criticism), **Complete** (after finding one issue, scan for the rest of that class before returning), and **Constructive** (every `critical` finding MUST carry a `proposed_fix` or it's downgraded to `investigation`). Severity ladder: critical / suggestion / nitpick / investigation.

This is directly portable to our `code-review`, `autoreason`, and any reviewer subagent — it's the same "findings ≠ critiques" bar we want everywhere, with a clean enforcement mechanism (no fix → downgrade).

### 2. The `BaseTool` contract + provider-scoring model — **adapt for our creative tool sprawl**
We already juggle FLORA (131 models), Venice, Midjourney, Qwen ZeroGPU, local MLX, ElevenLabs vs local-tts. OpenMontage's `BaseTool` exposes a uniform contract — `estimate_cost`, `estimate_runtime`, `idempotency_key`, tier/stability/runtime/determinism/resume — and `PROVIDERS.md` ranks providers on **task fit, quality, control, reliability, cost, latency, continuity**. Lifting this gives us a single scored menu instead of ad-hoc "which image gen today" decisions (a recurring memory pain: Google 429s, routing around quotas).

### 3. Budget governance (`config.yaml` + `cost_tracker.py`) — **the estimate→reserve→reconcile loop**
`budget: {mode: observe|warn|cap, total_usd, reserve_pct, single_action_approval_usd, require_approval_for_new_paid_tool}`. This is exactly the guardrail our swarm keeps re-learning the hard way (Anthropic-billing leaks, $348 leak, spend-breaker bugs). The estimate→reserve→reconcile pattern + per-action approval threshold is worth porting into the swarm's tool-calling layer, not just video.

### 4. Declarative YAML pipelines + checkpoint protocol — **for the content pipeline**
13 `pipeline_defs/*.yaml` manifests with per-stage `review_focus` + `success_criteria`, paired with `checkpoint-protocol.md` for resumable state. Our content pipeline (`docs/expertise/content-pipeline.yaml`) could adopt this manifest+checkpoint shape so a video render survives interruption and each stage has explicit acceptance criteria.

### 5. Free-first provider ladder — **directly useful, copy the list**
`PROVIDERS.md` gives a $0-first setup order (Pexels/Pixabay → Google TTS → ElevenLabs free → Piper local → fal.ai → …). Matches our "Nous free tier for light work" budget rule. Good reference for keeping edgelesslab content production at near-zero marginal cost.

---

## What NOT to do

- **Don't adopt wholesale.** It's a 57-tool platform; we'd inherit a lot of surface we don't need. Mine the 5 patterns above.
- **AGPL-3.0 boundary.** Fine for internal edgelesslab content production. Do **not** copy its code into anything we *distribute or host* as a product (Syndiq, edgelesslab features, edgeless-memory) — AGPL's network-use copyleft attaches. The *patterns/ideas* (reviewer rules, scoring dimensions, budget loop) are not copyrightable; reimplement those freely. Only the verbatim Python carries the license.
- **Remotion/HyperFrames overlap.** We already have `remotion` + `remotion-best-practices` skills — no need to import theirs.

## Suggested next step

Reimplement pattern #1 (CHAI reviewer rules) into our reviewer/code-review skills first — highest value, zero license risk, zero new dependencies. Then evaluate the budget loop (#3) for the swarm tool layer.
