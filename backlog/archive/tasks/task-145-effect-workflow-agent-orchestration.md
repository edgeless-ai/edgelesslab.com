---
id: 145
title: "Evaluate @effect/workflow for Durable Agent Orchestration"
epic: 1-kernel
priority: P3
effort: L
status: completed
depends_on: []
blocks: []
created: 2026-03-07
updated: 2026-03-10
source: "Effect-TS ecosystem deep analysis + production research"
tags: [effect, workflow, agent-orchestration, evaluation, durable]
---

# Task 145: Evaluate @effect/workflow for Durable Agent Orchestration

## Context

### What We Know (Validated 2026-03-10)

- **@effect/workflow** is at version 0.16.0 — pre-1.0 but with 835K monthly npm downloads (surprisingly high)
- **Architecture**: Library-based (no separate server like Temporal), which dramatically lowers ops burden
- **Persistence**: SQL-based via `@effect/sql-*` — supports PostgreSQL, MySQL, SQLite, and 10+ other backends
- **Key primitives**: `Workflow.make`, `Activity`, `DurableClock.sleep`, `DurableDeferred.await`
- **Compensation**: Built-in saga pattern for rollback on failure
- **Cluster support**: `@effect/cluster` for distributed execution (optional)

### Honest Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pre-1.0 API instability | High | Pin exact versions, wrap in thin adapter |
| Steep learning curve | High | Effect core proficiency is prerequisite |
| PostgreSQL requirement | Medium | We don't currently run Postgres; SQLite possible for dev |
| No separate workflow server | Low (feature) | Library model = less ops, but no Web UI for workflow inspection |
| Debugging durable workflows | Medium | Less tooling than Temporal's Web UI |

### Why This Might Be Worth It Anyway

Our current agent patterns are **stateless and non-resumable**. If Claude Code crashes mid-task, all context is lost. Durable workflows would enable:

1. **Resumable research sprints** — crash at step 7 of 10, resume from step 7
2. **Human-in-the-loop workflows** — `DurableDeferred.await(approval)` pauses workflow until user responds
3. **Multi-agent orchestration** — spawn parallel agents as Activities, collect results
4. **Scheduled operations** — `DurableClock.sleep("6 hours")` without consuming resources
5. **Saga rollbacks** — if step 5 fails, compensate steps 1-4

## Design: Research Workflow POC

```typescript
import { Workflow, Activity, DurableClock, DurableDeferred } from "@effect/workflow"
import { Schema, Effect } from "effect"

// Define workflow
const ResearchWorkflow = Workflow.make("DeepResearch", {
  payload: Schema.Struct({
    topic: Schema.String,
    depth: Schema.Literal("quick", "medium", "thorough")
  }),
  success: Schema.Struct({
    summary: Schema.String,
    sources: Schema.Array(Schema.String),
    confidence: Schema.Number
  }),
  idempotencyKey: ({ topic }) => `research-${topic}`
})

// Define activities (atomic, retryable units of work)
const webSearch = Activity.make("WebSearch", {
  execute: (query: string) => Effect.gen(function* () {
    // Search logic here
    return results
  }),
  retry: { times: 3, delay: "exponential" }
})

const synthesize = Activity.make("Synthesize", {
  execute: (findings: Finding[]) => Effect.gen(function* () {
    const llm = yield* LanguageModel
    return yield* llm.generate({ prompt: synthesisPrompt(findings) })
  })
})

// Workflow implementation
const workflow = ResearchWorkflow.implement(
  Effect.gen(function* (payload) {
    // Phase 1: Search (parallel)
    const results = yield* Effect.all([
      webSearch.execute(`${payload.topic} overview`),
      webSearch.execute(`${payload.topic} recent developments`),
      webSearch.execute(`${payload.topic} expert analysis`)
    ], { concurrency: 3 })

    // Phase 2: Synthesize
    const draft = yield* synthesize.execute(results.flat())

    // Phase 3: Human review (durable wait)
    const approval = DurableDeferred.make("HumanReview")
    yield* notify("Draft ready for review")
    const feedback = yield* DurableDeferred.await(approval)
    // ↑ Workflow persists here. Process can restart. Resume when signal arrives.

    // Phase 4: Final output
    if (feedback.approved) {
      return { summary: draft, sources: allSources, confidence: 0.85 }
    } else {
      // Retry with feedback
      const revised = yield* synthesize.execute([...results.flat(), feedback.notes])
      return { summary: revised, sources: allSources, confidence: 0.75 }
    }
  })
)
```

## Acceptance Criteria

### Prerequisites
- [ ] Basic Effect proficiency (can write Effect.gen, use Services/Layers, handle errors)
- [ ] SQLite or Postgres available for persistence

### Phase 1: Setup (2 hours)
- [ ] Create `examples/effect-workflow-poc/`
- [ ] Install: `pnpm add @effect/workflow @effect/sql-sqlite3` (SQLite for dev)
- [ ] Configure workflow engine with SQLite persistence
- [ ] Verify engine starts and creates tables

### Phase 2: Simple Workflow (3 hours)
- [ ] Define a 3-step sequential workflow with Schema-typed payload
- [ ] Implement 2 Activities with retry logic
- [ ] Test: start workflow → complete activities → get result
- [ ] Test: start workflow → kill process → restart → verify resume from last checkpoint

### Phase 3: Advanced Features (3 hours)
- [ ] Test `DurableClock.sleep("10 seconds")` — verify process can restart during sleep
- [ ] Test `DurableDeferred.await` — signal from external process
- [ ] Test compensation/saga — activity fails, verify rollback of previous activities
- [ ] Test parallel activities with `Effect.all({ concurrency: N })`

### Phase 4: Decision (1 hour)
- [ ] Compare with alternatives: Temporal, Inngest, Bull queues, plain cron
- [ ] Score: API ergonomics, ops burden, debugging experience, community support
- [ ] **GO**: Promising for production use → plan migration of 1-2 real workflows
- [ ] **DEFER**: Good but we need Effect core proficiency first (task-143 prerequisite)
- [ ] **NO-GO**: Too unstable or complex → stick with stateless patterns

## Comparison with Alternatives

| Feature | @effect/workflow | Temporal | Inngest | Bull + Redis |
|---------|-----------------|----------|---------|-------------|
| Self-hosted | Library (no server) | Separate server | SaaS or self-hosted | Redis required |
| Language | TypeScript | Multi-language | TypeScript | TypeScript |
| Persistence | SQL (many backends) | Cassandra/MySQL | Managed | Redis |
| Learning curve | Very steep (Effect + workflows) | Steep (concepts) | Moderate | Low |
| Maturity | Pre-1.0 | Production (v1.24) | Production | Production |
| Web UI | None | Yes (excellent) | Yes | Bull Board |
| Cost | Free | Free (self-hosted) | Free tier + paid | Free |

## Research Context (2026-03-10)

Community assessment: @effect/workflow is "too early" relative to @effect/ai and @effect/cli. Deprioritize this relative to tasks 143-144. The library-based model (no separate server) is genuinely compelling vs Temporal's operational overhead, but the pre-1.0 status and Effect proficiency prerequisite make this a later-stage evaluation.

**Pragmatic alternative**: For immediate needs, consider Bull + Redis or even n8n workflows (which we already have) for durable orchestration. Revisit @effect/workflow when:
1. We have Effect proficiency from tasks 143-144
2. @effect/workflow reaches 1.0
3. We have a concrete workflow that can't be served by existing tools

## Artifacts
- `examples/effect-workflow-poc/` — Prototype evaluation harness
- `docs/effect-workflow-evaluation.md` — Findings and decision

## Completion Notes (2026-03-10)

Outcome: **DEFER for production use**.

Completed artifacts:
- `examples/effect-workflow-poc/`
- `docs/effect-workflow-evaluation.md`

What was proven:
- workflow API ergonomics
- suspension / resume behavior
- retry
- compensation

What was not proven:
- cross-process durability with a persistent engine
