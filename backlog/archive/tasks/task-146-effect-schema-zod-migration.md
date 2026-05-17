---
id: 146
title: "Effect Schema vs Zod — Decision Record (NOT Migration)"
epic: 1-kernel
priority: P3
effort: S
status: completed
depends_on: []
blocks: []
created: 2026-03-07
updated: 2026-03-10
source: "Effect-TS ecosystem deep analysis + production research"
tags: [effect, schema, zod, typescript, decision-record]
---

# Task 146: Effect Schema vs Zod — Decision Record

## Context

### Critical Insight (Validated 2026-03-10)

**Zod has 411M monthly npm downloads. Effect has 33M.** This is a 12x difference. Migrating from Zod to Effect Schema in isolation is economically irrational — the ecosystem gravity, tooling, and community support overwhelmingly favor Zod.

**The ONLY reason to use Effect Schema** is if you're already committed to the Effect ecosystem for other reasons (workflows, AI, services). In that case, Schema provides seamless integration with Effect's error channel, services, and layers.

### Recommendation: Decision Record, Not Migration

This task should produce an ADR (Architecture Decision Record), not a migration. The decision is:

1. **If task-143 returns GO** → Use Effect Schema for Effect-native code (MCP servers, workflows)
2. **If task-143 returns NO-GO** → Continue using Zod everywhere. Close this task.
3. **Never migrate existing Zod code** to Effect Schema without a compelling reason

## Honest Comparison

| Feature | Zod | Effect Schema | Winner |
|---------|-----|---------------|--------|
| Community size | 411M/mo downloads | 33M/mo (core) | Zod by 12x |
| Learning curve | 30 minutes | 2-4 hours (standalone), weeks (with Effect) | Zod |
| Error messages | Excellent | Good but verbose | Zod |
| TypeScript inference | Excellent | Excellent (arguably better for transforms) | Tie |
| JSON Schema generation | Via plugin (zod-to-json-schema) | Native | Effect |
| Encoding/Decoding | Manual | Built-in bidirectional | Effect |
| Effect integration | None (separate universe) | Seamless | Effect |
| Branded types | `.brand()` | `Schema.brand()` | Tie |
| Bundle size | ~57KB | ~180KB (full effect) | Zod |
| IDE support | Excellent | Good but less common | Zod |
| AI tool definitions | Works but manual | Native @effect/ai integration | Effect |

## Acceptance Criteria

- [ ] Write ADR at `docs/adr/003-schema-validation-strategy.md`
- [ ] Include concrete code comparison (3 real schemas from our codebase)
- [ ] Test: port 1 Zod schema to Effect Schema, measure effort
- [ ] Document when to use which:
  - **Zod**: Standalone scripts, API validation, quick prototypes
  - **Effect Schema**: Effect-native services, MCP tools, workflow payloads
- [ ] Decision: adopt dual-schema strategy OR stick with Zod-only

## ADR Template

```markdown
# ADR 003: Schema Validation Strategy

## Status: [Accepted/Rejected]

## Context
We use Zod for TypeScript validation. Effect Schema is an alternative that integrates
with the Effect ecosystem. We need to decide whether to adopt Effect Schema.

## Decision
[Use Zod everywhere / Use Effect Schema only within Effect-native code / Full migration]

## Consequences
- Positive: [...]
- Negative: [...]
- Neutral: [...]
```

## v4 Schema Changes to Note

Major API renames in v4 beta (breaking from v3):
- `Schema.filter()` → `Schema.check(Schema.makeFilter())`
- `Schema.UUID` → `Schema.String.check(isUUID())`
- `Schema.Literal("a", "b")` → `Schema.Literals(["a", "b"])`
- `Schema.Union(A, B)` → `Schema.Union([A, B])`
- All `*FromSelf` schemas drop suffix
- `validate*` APIs removed entirely
- Bundle size nearly identical to Zod in v4: ~15KB vs ~14KB (minified+gzipped)

Key insight: Schema in v4 is **bidirectional** (encode + decode), generates test data via `toArbitrary` (fast-check), and produces JSON Schema natively. These are genuinely valuable features Zod doesn't have.

## Time Budget: 2 hours max

This is a decision task, not a build task. Don't over-invest.

## Artifacts
- `docs/adr/003-schema-validation-strategy.md` — Architecture Decision Record

## Completion Notes (2026-03-10)

Outcome: **Accepted dual-schema strategy**.

Decision:
- keep Zod as the default
- allow Effect Schema inside Effect-native modules only
- do not migrate existing Zod code without a concrete payoff
