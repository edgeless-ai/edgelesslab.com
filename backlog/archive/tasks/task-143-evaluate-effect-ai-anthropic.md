---
id: 143
title: "Evaluate @effect/ai-anthropic for Claude API Integration"
epic: 1-kernel
priority: P2
effort: M
status: completed
depends_on: []
blocks: [144, 147]
created: 2026-03-07
updated: 2026-03-10
source: "Effect-TS ecosystem deep analysis + production research"
tags: [effect, anthropic, typescript, evaluation, gate-task]
---

# Task 143: Evaluate @effect/ai-anthropic for Claude API Integration

## Context

This is the **gate task** — all other Effect tasks (144, 147) depend on this evaluation. The go/no-go decision here determines whether we invest in the Effect ecosystem.

### What We Know (Validated 2026-03-10)

- **Effect core**: 33M monthly npm downloads, genuinely significant adoption
- **@effect/ai-anthropic**: Pre-1.0, depends on `@effect/experimental` (literal "experimental" in dependency chain)
- **effect-smol**: NOT a lightweight Effect — it's the Effect v4 development repo. No published npm package. Ignore for now
- **Learning curve**: 1-2 months to reach intermediate proficiency (services, layers, error channel)
- **API breakage risk**: All @effect/ai packages are pre-1.0, meaning breaking changes expected

### Why This Matters

Current Claude API usage is scattered across Python scripts using the unified `llm_client.py` (which routes through OpenRouter → Gemini → Anthropic → OpenAI). Effect would only be relevant for **new TypeScript tooling**, not replacing existing Python infrastructure.

Key question: **Is the DX improvement worth the learning curve and API instability risk?**

## Decision Framework

| Factor | Weight | Assessment |
|--------|--------|------------|
| Type safety for tool definitions | High | Effect Schema is genuinely excellent here |
| Provider agnosticism | Medium | We already have this in Python via llm_client.py |
| Built-in retry/timeout | Medium | Effect's Schedule module is production-grade |
| Streaming support | Medium | Effect Stream is solid but complex |
| Testing via service injection | High | This is Effect's killer feature |
| API stability risk | High (negative) | Pre-1.0 + @effect/experimental dependency |
| Learning curve | High (negative) | 1-2 months for team proficiency |
| Community support | Medium | Large community but steep onramp |

## Acceptance Criteria

### Phase 1: Environment Setup (1 hour)
- [ ] Create `examples/effect-ai-poc/` with `pnpm init`
- [ ] Install: `pnpm add effect @effect/ai @effect/ai-anthropic @effect/platform-node`
- [ ] Verify all dependencies resolve (check for peer dependency conflicts)
- [ ] Document actual installed versions of all @effect/* packages

### Phase 2: Core Evaluation (2-3 hours)
- [ ] Basic chat completion — does it work end-to-end?
- [ ] Tool definition using Effect Schema — compare ergonomics with raw Anthropic SDK
- [ ] Streaming response — test with `Stream.runCollect` and `Stream.runForEach`
- [ ] Error handling — test retry with `Schedule.exponential("1 second").pipe(Schedule.compose(Schedule.recurs(3)))`
- [ ] Service injection — can you mock the LLM layer in tests without network calls?

### Phase 3: Decision (30 min)
- [ ] Write evaluation document with concrete code comparison
- [ ] Score each criteria from decision framework
- [ ] **GO**: If DX improvement is substantial AND API feels close to stable → proceed to task-144
- [ ] **NO-GO**: If learning curve outweighs benefits OR API is too unstable → archive tasks 144-147
- [ ] **DEFER**: If promising but too early → set calendar reminder for 6 months

## Version Targeting

**Target Effect v4 beta** (`4.0.0-beta.30+` as of 2026-03-10). v3 → v4 has major API changes:
- Schema: `Schema.UUID` → `Schema.String.check(isUUID())`, `Schema.Literal("a","b")` → `Schema.Literals(["a","b"])`
- Services: `Context.Tag` → `ServiceMap.Service`
- All `*FromSelf` schemas drop suffix
- `validate*` APIs removed entirely
- Bundle size: ~70KB → ~20KB (71% reduction)

The existing code examples in this task file use v3 patterns. During evaluation, use v4 imports from `effect/unstable/*` paths where needed.

### @effect/ai-anthropic Capabilities (from source)
- All Claude models with typed model selection
- Prompt caching via `cacheControl` annotations
- Extended thinking (reasoning parts with signatures)
- Provider-defined tools: bash, computer use, text editor
- Token usage with cache metrics
- Stateful `Chat` sessions with agentic loop support
- `ExecutionPlan` for multi-provider fallback with retry

## Anti-Patterns to Avoid

- Don't evaluate against Python infrastructure (apples to oranges)
- Don't spend more than 4 hours on this evaluation
- Don't build anything production-grade — this is a spike
- Don't assume effect-smol is relevant (it's Effect v4 dev repo, not a lightweight alternative)
- Don't use v3 code examples from blog posts — they're outdated. Use v4 LLMS.md from the repo

## Artifacts
- `examples/effect-ai-poc/` — Proof of concept code
- `docs/effect-ai-evaluation.md` — Findings, scores, and go/no-go decision

## Completion Notes (2026-03-10)

Outcome: **GO for selective internal tooling only**.

Completed artifacts:
- `examples/effect-ai-poc/`
- `docs/effect-ai-evaluation.md`

Important limitation:
- `ANTHROPIC_API_KEY` was not available in the workspace, so the live Anthropic path was not exercised in this turn. The mock fallback, structured output, streaming, build, and typecheck paths all passed.

## Risk: The "Experimental" Question

The @effect/ai packages depend on `@effect/experimental`. This could mean:
1. **Benign**: Just the package name, APIs are actually stable
2. **Real**: APIs will break between minor versions
3. **Transitional**: Moving to stable soon

The evaluation MUST test: install the package, write code, then check if there's a newer version that breaks the code. Check the changelog/release notes for frequency of breaking changes.
