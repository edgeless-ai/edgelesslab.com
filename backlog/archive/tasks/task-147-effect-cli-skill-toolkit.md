---
id: 147
title: "Build Effect-Based Skill Development Toolkit"
epic: 1-kernel
priority: P3
effort: M
status: completed
depends_on: [143, 144]
blocks: []
created: 2026-03-07
updated: 2026-03-10
source: "Effect-TS ecosystem deep analysis + production research"
tags: [effect, skills, cli, toolkit, typescript]
---

# Task 147: Build Effect-Based Skill Development Toolkit

## Context

### What Changed (2026-03-10 Research)

This task was originally speculative. After deep research, here's the honest assessment:

**Strengths of this approach:**
- `@effect/cli` is genuinely excellent — typed arguments, auto-generated help, Shell completions
- Effect Schema can validate SKILL.md frontmatter at compile time
- MCP tool definitions (from task-144) could serve as the "source of truth" for skills

**Weaknesses / Risks:**
- Our skills are **markdown files consumed by LLMs**, not TypeScript code. A TypeScript toolkit adds a build step to what's currently a zero-build workflow
- The value proposition depends heavily on task-143 (GO) and task-144 (working MCP server)
- If we have < 5 TypeScript-native skills, the toolkit is over-engineering

### Revised Scope: Skill Validator + Generator

Instead of a full toolkit, focus on two high-value CLI commands:

1. **`skill validate ./path/to/skill/`** — Check SKILL.md structure against our standards (from task-178, mcollina patterns)
2. **`skill generate --from-mcp ./mcp-server/`** — Generate SKILL.md from Effect MCP tool definitions

This is a 2-day build, not a 2-week framework.

## Design

### Command 1: Validate

```typescript
import { Command, Options } from "@effect/cli"
import { Schema, Effect } from "effect"

// Skill frontmatter schema (matches task-178 standards)
const SkillFrontmatter = Schema.Struct({
  name: Schema.String,
  description: Schema.String.pipe(Schema.maxLength(120)),  // routing-optimized
  version: Schema.String,
  tier: Schema.Literal("general", "task-specific", "specialized"),
  domain: Schema.Array(Schema.String),
  when_to_apply: Schema.String,
  tags: Schema.Array(Schema.String)
})

// Validate command
const validate = Command.make("validate", {
  path: Options.directory("path").pipe(Options.withDefault(".")),
}, ({ path }) => Effect.gen(function* () {
  const skillMd = yield* readSkillMd(path)
  const frontmatter = yield* parseFrontmatter(skillMd)
  const result = yield* Schema.decodeUnknown(SkillFrontmatter)(frontmatter)

  // Check required sections
  yield* checkSection(skillMd, "## When to Use")
  yield* checkSection(skillMd, "## Instructions")
  yield* checkSection(skillMd, "## Examples")

  yield* Console.log(`✓ Skill at ${path} is valid`)
}))
```

### Command 2: Generate from MCP

```typescript
const generate = Command.make("generate", {
  from: Options.text("from-mcp").pipe(Options.withDescription("Path to Effect MCP server")),
  output: Options.text("output").pipe(Options.withDefault("./SKILL.md"))
}, ({ from, output }) => Effect.gen(function* () {
  // Read MCP tool definitions from TypeScript source
  const tools = yield* extractToolDefinitions(from)

  // Generate SKILL.md with proper frontmatter
  const skillMd = yield* generateSkillMarkdown({
    tools,
    template: "claude-vault/_system/templates/skill-template.md"
  })

  yield* writeFile(output, skillMd)
  yield* Console.log(`Generated ${output} with ${tools.length} tools`)
}))
```

### CLI Entry Point

```typescript
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"

const app = Command.make("skill")
  .pipe(Command.withSubcommands([validate, generate]))

const cli = Command.run(app, { name: "skill-toolkit", version: "0.1.0" })

cli(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
```

## Acceptance Criteria

### Gate: task-143 GO + task-144 working prototype

### Phase 1: Scaffold (1 hour)
- [ ] Create `tools/skill-toolkit/` with pnpm + TypeScript
- [ ] Install: `pnpm add effect @effect/cli @effect/platform-node`
- [ ] Set up esbuild for single-file compilation
- [ ] Create binary entry point

### Phase 2: Validate Command (3 hours)
- [ ] Define SkillFrontmatter schema matching task-178 standards
- [ ] Parse YAML frontmatter from SKILL.md files
- [ ] Check required sections: "When to Use", "Instructions"
- [ ] Check description length (≤ 120 chars for routing optimization)
- [ ] Run against 5 existing skills, verify pass/fail accuracy

### Phase 3: Generate Command (3 hours)
- [ ] Extract tool definitions from Effect MCP server source
- [ ] Generate SKILL.md with proper frontmatter and sections
- [ ] Use our existing skill template as the base
- [ ] Test: generate SKILL.md from task-144's MCP server, verify it passes validate

### Phase 4: Polish (1 hour)
- [ ] Auto-generated `--help` with examples
- [ ] Shell completion generation (bash/zsh)
- [ ] Compile to single binary with esbuild
- [ ] Add to `tools/` and document in CLAUDE.md

## Kill Criteria

Archive this task if:
- task-143 returns NO-GO
- task-144 fails (no working MCP server = no generate source)
- We have fewer than 5 TypeScript-native skills after 3 months
- The validate command doesn't catch real issues in existing skills

## Artifacts
- `tools/skill-toolkit/` — CLI tool (compiled single binary)
- `tools/skill-toolkit/README.md` — Usage examples

## Completion Notes (2026-03-10)

Outcome: **Focused toolkit complete**.

Completed commands:
- `validate`
- `generate --from-mcp`

Completed verification:
- strict typecheck
- build output
- validation against an existing local skill
- generation from task-144 MCP source followed by validation
