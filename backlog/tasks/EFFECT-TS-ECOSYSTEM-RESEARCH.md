# Effect-TS Ecosystem Research Report

**Date**: 2026-03-10
**Researcher**: ResearchAgent (Claude Opus 4.6)
**Confidence**: High (sourced from actual source code, npm registry, GitHub API)
**Method**: Direct source code inspection, npm registry API, GitHub API, web research

---

## 1. @effect/ai and @effect/ai-anthropic

### Versions and Status

| Package | Version | Weekly Downloads | Monthly Downloads | Status |
|---------|---------|-----------------|-------------------|--------|
| `@effect/ai` | **0.33.2** | 59,358 | 218,521 | Pre-1.0 (0.x) |
| `@effect/ai-anthropic` | **0.23.0** | 7,495 | ~28k | Pre-1.0 (0.x) |

**Verdict**: PRE-1.0, actively developed, API still evolving. The `@since 1.0.0` JSDoc tags indicate intent for 1.0 stability but the package version is 0.x -- meaning breaking changes are expected.

### Real Dependencies

```
@effect/ai requires:
  - effect (peer)
  - @effect/platform (peer)
  - @effect/experimental (peer)  <-- NOTE: "experimental" in the dep chain
  - @effect/rpc (peer)
  - find-my-way-ts (direct dep, for URI routing in MCP)

@effect/ai-anthropic requires:
  - @effect/ai (peer)
  - @effect/platform (peer)
  - @effect/experimental (peer)
  - effect (peer)
  - @anthropic-ai/tokenizer (direct dep)
```

### Real Public API (from source code inspection)

**@effect/ai exports these modules:**
- `AiError` - Typed error hierarchy (HttpRequestError, HttpResponseError, MalformedInput, MalformedOutput, UnknownError)
- `Chat` - Stateful conversation interface with persistence support
- `EmbeddingModel` - Embedding model abstraction
- `IdGenerator` - ID generation for messages
- `LanguageModel` - Core LLM abstraction (generateText, streamText)
- `McpSchema` - MCP protocol schema definitions
- `McpServer` - **Full native MCP server implementation** (see section 2)
- `Model` - Model configuration
- `Prompt` - Prompt construction (system, user, assistant messages)
- `Response` - Response types and stream parts
- `Telemetry` - OpenTelemetry integration
- `Tokenizer` - Token counting abstraction
- `Tool` - Type-safe tool definitions with Effect.Schema
- `Toolkit` - Tool collection management

**@effect/ai-anthropic exports:**
- `AnthropicClient` - HTTP client for Anthropic API
- `AnthropicConfig` - Configuration (API key, base URL)
- `AnthropicLanguageModel` - Implements LanguageModel for Claude models
- `AnthropicTokenizer` - Claude tokenizer
- `AnthropicTool` - Anthropic-specific tool handling
- `Generated` - Auto-generated types from Anthropic API spec (CreateMessageParams, Model types, etc.)

### Real Code Examples (from test files)

**Basic chat:**
```typescript
import { Chat, LanguageModel } from "@effect/ai"
import { Effect, Layer } from "effect"

const program = Effect.gen(function* () {
  const chat = yield* Chat.empty
  const response = yield* chat.generateText({
    prompt: "Hello! What can you help me with?"
  })
  console.log(response.content)
})
```

**Tool definition and usage:**
```typescript
import * as Tool from "@effect/ai/Tool"
import * as Toolkit from "@effect/ai/Toolkit"
import * as Schema from "effect/Schema"

const MyTool = Tool.make("MyTool", {
  parameters: { testParam: Schema.String },
  success: Schema.Struct({ testSuccess: Schema.String })
})

const MyToolkit = Toolkit.make(MyTool)

const MyToolkitLayer = MyToolkit.toLayer({
  MyTool: () => Effect.succeed({ testSuccess: "result" })
})

// Use with streaming
LanguageModel.streamText({
  prompt: [],
  toolkit: MyToolkit
}).pipe(
  Stream.runForEach((part) => Effect.sync(() => console.log(part))),
  Effect.provide(MyToolkitLayer)
)
```

**Chat persistence:**
```typescript
import * as Persistence from "@effect/experimental/Persistence"

const PersistenceLayer = Layer.provideMerge(
  Chat.layerPersisted({ storeId: "chat" }),
  Persistence.layerMemory  // or other backends
)
```

### Anthropic-specific features
- Cache control support (prompt caching breakpoints)
- Extended thinking / reasoning blocks (signature verification, redacted thinking)
- Provider-specific message options
- Full model enum from Generated.ts (auto-generated from API spec)

---

## 2. @effect/ai McpServer

### YES -- Effect has a native MCP server implementation

This is NOT a wrapper around `@modelcontextprotocol/sdk`. It is a **from-scratch implementation** built on `@effect/rpc` and the MCP protocol specification.

**Protocol versions supported**: `2025-06-18`, `2025-03-26`, `2024-11-05`, `2024-10-07`

### Transport Layers

| Transport | Constructor | Description |
|-----------|-------------|-------------|
| stdio | `McpServer.layerStdio()` | Standard MCP stdio transport |
| HTTP | `McpServer.layerHttp()` | HTTP/SSE transport |
| HTTP Router | `McpServer.layerHttpRouter()` | Integrates with @effect/platform HttpRouter |

### Full MCP Feature Support

- **Tools**: Register, list, call with typed parameters via Effect.Schema
- **Resources**: Static resources and URI template resources with parameter completion
- **Prompts**: Named prompts with typed parameters and auto-completion
- **Elicitation**: Client elicitation support
- **Notifications**: list_changed notifications for tools/resources/prompts

### Real MCP Server Example (from source doc comments)

```typescript
import { McpSchema, McpServer } from "@effect/ai"
import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node"
import { Effect, Layer, Logger, Schema } from "effect"

const idParam = McpSchema.param("id", Schema.NumberFromString)

const ReadmeTemplate = McpServer.resource`file://readme/${idParam}`({
  name: "README Template",
  completion: {
    id: (_) => Effect.succeed([1, 2, 3, 4, 5])
  },
  content: Effect.fn(function*(_uri, id) {
    return `# MCP Server Demo - ID: ${id}`
  })
})

const TestPrompt = McpServer.prompt({
  name: "Test Prompt",
  description: "A test prompt",
  parameters: Schema.Struct({
    flightNumber: Schema.String
  }),
  completion: {
    flightNumber: () => Effect.succeed(["FL123", "FL456", "FL789"])
  },
  content: ({ flightNumber }) =>
    Effect.succeed(`Get booking for flight: ${flightNumber}`)
})

const ServerLayer = Layer.mergeAll(
  ReadmeTemplate,
  TestPrompt
).pipe(
  Layer.provide(McpServer.layerStdio({
    name: "Demo Server",
    version: "1.0.0",
    stdin: NodeStream.stdin,
    stdout: NodeSink.stdout
  })),
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
)

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
```

### Comparison with @modelcontextprotocol/sdk

| Feature | @effect/ai McpServer | @modelcontextprotocol/sdk |
|---------|---------------------|--------------------------|
| Type safety | Full Effect.Schema integration | Zod-based |
| Error handling | Effect error channel (typed) | try/catch |
| Streaming | Effect Stream | Manual SSE |
| Dependency injection | Effect Layer system | Manual wiring |
| Tool registration | `registerToolkit()` (composable) | `server.setRequestHandler()` |
| Resource templates | Tagged template literals with typed params | String-based URI templates |
| Auto-completion | Built-in completion handlers | Manual implementation |
| Transport | stdio, HTTP, HTTP Router layers | stdio, SSE transports |
| Ecosystem lock-in | Requires full Effect ecosystem | Standalone |

### Key API: `McpServer.registerToolkit()`

This bridges `@effect/ai` Tool/Toolkit definitions directly to MCP tools. Define tools once, use them both for direct AI calls AND as MCP server tools.

---

## 3. @effect/workflow

### Version and Status

| Package | Version | Weekly Downloads | Monthly Downloads |
|---------|---------|-----------------|-------------------|
| `@effect/workflow` | **0.16.0** | 209,634 | 835,534 |

**Verdict**: Pre-1.0 but with meaningful adoption (835K monthly downloads). Actively developed.

### Dependencies
```
Peer dependencies:
  - effect
  - @effect/experimental
  - @effect/platform
  - @effect/rpc
```

### Architecture

The workflow system has two tiers:

1. **In-memory engine** (`WorkflowEngine.layerMemory`) -- for testing and simple use cases
2. **Cluster engine** (`@effect/cluster` / `ClusterWorkflowEngine`) -- for production distributed workflows

The cluster engine uses:
- `MessageStorage` (abstract) -> `SqlMessageStorage` (concrete, uses `@effect/sql`)
- `RunnerStorage` (abstract) -> `SqlRunnerStorage` (concrete)
- `Sharding` for work distribution across workers

### SQL Backends Supported (via @effect/sql)

| Package | Database |
|---------|----------|
| `@effect/sql-pg` | PostgreSQL |
| `@effect/sql-mysql2` | MySQL |
| `@effect/sql-sqlite-node` | SQLite (Node.js) |
| `@effect/sql-sqlite-bun` | SQLite (Bun) |
| `@effect/sql-sqlite-wasm` | SQLite (WASM) |
| `@effect/sql-sqlite-react-native` | SQLite (React Native) |
| `@effect/sql-mssql` | Microsoft SQL Server |
| `@effect/sql-clickhouse` | ClickHouse |
| `@effect/sql-d1` | Cloudflare D1 |
| `@effect/sql-libsql` | LibSQL / Turso |
| `@effect/sql-drizzle` | Drizzle ORM adapter |
| `@effect/sql-kysely` | Kysely adapter |

### Real API

**Defining a workflow:**
```typescript
import { Workflow, Activity } from "@effect/workflow"
import * as Schema from "effect/Schema"

// Workflow with typed payload, success, and error schemas
const MyWorkflow = Workflow.make({
  name: "MyWorkflow",
  payload: Schema.Struct({ userId: Schema.String }),
  success: Schema.Struct({ result: Schema.String }),
  error: Schema.String
})

// Activities are durable steps within a workflow
const FetchUser = Activity.make("FetchUser", {
  success: Schema.Struct({ name: Schema.String }),
  error: Schema.String
})
```

**Workflow features:**
- `workflow.execute(payload)` - Start a workflow execution
- `workflow.poll(executionId)` - Check execution status
- `workflow.interrupt(executionId)` - Cancel execution
- `workflow.resume(executionId)` - Resume suspended workflow
- `workflow.toLayer(executeFn)` - Register workflow handler

**Durable primitives:**
- `Activity` - Durable step with retry/compensation
- `DurableClock` - Durable timer (survives restarts)
- `DurableDeferred` - Durable promise/signal
- `DurableQueue` - Durable message queue
- `DurableRateLimiter` - Durable rate limiter

### Comparison with Temporal

| Feature | @effect/workflow | Temporal |
|---------|-----------------|----------|
| Language | TypeScript-native | Multi-language (Go server, TS/Java/Python/Go workers) |
| Infrastructure | SQL database (Postgres, MySQL, etc.) | Temporal Server (Go) + Cassandra/MySQL/Postgres |
| Deployment | Library (no separate server) | Requires Temporal Server cluster |
| Type safety | Full Effect.Schema typing | TypeScript SDK has decent types |
| Activities | Schema-typed with durable execution | Activities with retry policies |
| Signals | DurableDeferred | Signals and Queries |
| Timers | DurableClock | Workflow.sleep() |
| Versioning | Schema-based evolution | Patching / versioning API |
| Clustering | @effect/cluster (sharding) | Built into Temporal Server |
| Maturity | Pre-1.0 (0.16.0) | Production-grade (used by Netflix, Snap, etc.) |
| Observability | OpenTelemetry integration | Built-in UI + OpenTelemetry |
| Complexity | Moderate (need Effect knowledge) | High (need Temporal Server ops) |

**Key difference**: Temporal requires running a separate server process. @effect/workflow is a library that uses your existing database -- lower ops burden but less battle-tested.

---

## 4. Effect Schema vs Zod

### Current State (March 2026)

| Metric | Effect Schema (@effect/schema) | Zod |
|--------|-------------------------------|-----|
| Monthly downloads | 3,696,505 | **410,879,453** |
| Weekly downloads | 943,867 | ~100M+ |
| Download ratio | 1x | **111x more** |
| Latest version | Part of effect 3.19.x | 3.24.x (v4 in development) |
| Bundle size (min+gz) | ~15-20KB (tree-shakeable) | ~13KB (v3), ~10KB (v4 mini) |

**Zod dominates by over 100x in adoption.**

### Feature Comparison

| Feature | Effect Schema | Zod |
|---------|--------------|-----|
| Encoding/Decoding | Bidirectional transforms | One-way (parse) |
| JSON Schema | Built-in generation | Via zod-to-json-schema |
| Effect integration | Native (same ecosystem) | Separate library |
| API style | Functional/compositional | Chained builder |
| Error messages | Structured ParseError tree | ZodError with issues array |
| OpenAPI | Via @effect/platform | Via third-party libs |
| Branded types | Built-in | `.brand()` |
| Recursive types | `Schema.suspend()` | `z.lazy()` |
| Default values | `Schema.withConstructorDefault()` | `.default()` |
| Transforms | First-class (encode + decode) | `.transform()` |
| Class integration | `Schema.Class` | Not built-in |

### Real Community Sentiment

**Pro-Effect Schema arguments:**
- Bidirectional transforms are genuinely useful (API serialization, DB encoding)
- Deep integration with Effect ecosystem (errors, services, config)
- Better for complex domain modeling (tagged unions, class hierarchies)
- AI models write Effect Schema code well (explicit types help LLMs)

**Pro-Zod arguments:**
- 111x larger community = more examples, Stack Overflow answers, tutorials
- Ecosystem integration everywhere (tRPC, React Hook Form, Next.js, Vercel AI SDK)
- Simpler API for common cases
- Much smaller learning curve
- Zod v4 mini bringing significant performance improvements (14.7x faster string parsing)

**Migration stories:**
- Vercel AI SDK has native support for Effect Schema (GitHub issue #9209)
- Most migration stories go Yup -> Zod, not Zod -> Effect Schema
- Effect Schema adoption mostly comes from teams already using Effect

### Performance

- Zod v3: ~6.7M ops/sec for typical validations
- Zod v4: Doubled performance via avoiding deep copies
- Effect Schema: No published benchmarks found; expected comparable to Zod v3
- ArkType claims 20x faster than Zod, Typia claims 76M ops/sec (AOT compilation)
- Valibot: 513 bytes with tree-shaking (smallest option)

### Verdict

If you are already using Effect: use Effect Schema. It is the natural choice and provides bidirectional encoding that Zod cannot match.

If you are NOT already using Effect: Zod remains the pragmatic choice due to ecosystem dominance. The learning curve of Effect Schema without Effect is not justified.

---

## 5. effect-smol

### What It Actually Is

**effect-smol is the development repository for Effect v4.** It is NOT a lightweight/minimal version of Effect.

| Fact | Value |
|------|-------|
| Repository | `Effect-TS/effect-smol` |
| Description | "Core libraries and experimental work for Effect v4" |
| GitHub stars | 468 |
| Created | 2024-12-10 |
| Last updated | 2026-03-10 (actively maintained) |
| npm package | Does NOT exist as `effect-smol` on npm |

### Packages in effect-smol (Effect v4 development)

| Package | Purpose |
|---------|---------|
| `ai` | AI/LLM integration (split into `anthropic`, `openai`, `openai-compat`, `openrouter` sub-packages) |
| `atom` | Reactive state management |
| `effect` | Core effect library (v4) |
| `opentelemetry` | Observability |
| `platform-browser` | Browser platform |
| `platform-bun` | Bun platform |
| `platform-node-shared` | Shared Node.js utilities |
| `platform-node` | Node.js platform |
| `sql` | SQL database integration |
| `tools` | Development tooling (ai-codegen, ai-docgen, bundle, openapi-generator, oxc linting) |
| `vitest` | Test integration |

### Key Differences from v3

The effect-smol (v4) repo shows:
- **Provider restructuring**: `@effect/ai-anthropic` becomes `@effect/ai/anthropic` (sub-path exports)
- **OpenRouter added**: First-class `@effect/ai/openrouter` provider
- **No tokenizer in v4 anthropic**: Removed `AnthropicTokenizer`, replaced with `AnthropicTelemetry`
- **Simplified structure**: Fewer files per provider

### When to Use

- **Do NOT use effect-smol directly in production** -- it is a development repo
- Published packages from this repo will eventually become `effect@4.x` on npm
- No timeline announced for v4 stable release
- Track this repo for upcoming API changes if you plan to build on Effect

---

## 6. @effect/cli

### Version and Status

| Metric | Value |
|--------|-------|
| Version | **0.73.2** (high 0.x -- been iterating a long time) |
| Weekly downloads | 124,085 |
| Monthly downloads | 493,883 |
| Dependencies | `ini`, `toml`, `yaml` |

### Real Capabilities

**Modules exported:**
- `Args` - Positional argument parsing (typed)
- `Options` - Flag/option parsing (typed)
- `Command` - Command definition with handler
- `CliApp` - Application wrapper
- `CliConfig` - CLI configuration
- `ConfigFile` - Config file loading (INI, TOML, YAML built-in)
- `Prompt` - Interactive prompts
- `HelpDoc` - Auto-generated help documentation
- `AutoCorrect` - Did-you-mean suggestions for typos
- `ValidationError` - Typed validation errors
- `Usage` - Usage string generation

### Real API Example

```typescript
import { Command, Options, Args } from "@effect/cli"
import { Effect } from "effect"

// Commands are Effects themselves
const myCommand = Command.make("greet", {
  name: Args.text({ name: "name" }),
  verbose: Options.boolean("verbose")
}).pipe(
  Command.withHandler(({ name, verbose }) =>
    Effect.gen(function* () {
      if (verbose) {
        yield* Effect.log(`Greeting ${name} verbosely`)
      }
      yield* Effect.log(`Hello, ${name}!`)
    })
  )
)
```

### Comparison with Commander/Yargs

| Feature | @effect/cli | Commander | Yargs |
|---------|------------|-----------|-------|
| Type safety | Full (Schema-typed args/options) | Manual TypeScript types | `.option()` returns `any` |
| Config files | Built-in (INI, TOML, YAML) | Manual | yargs-parser config |
| Auto-complete | Built-in suggestions | Third-party | Built-in |
| Help generation | Typed HelpDoc AST | `.help()` string | `.help()` string |
| Error handling | Effect error channel | throw/exit | throw/exit |
| Prompts | Built-in interactive | Third-party (inquirer) | Third-party |
| Subcommands | Composable Command trees | `.command()` | `.command()` |
| Dependency injection | Effect Layer | Manual | Manual |
| Bundle size | Requires full Effect | ~8KB | ~30KB |
| Community | Niche | **Dominant** (120M+ weekly) | **Large** (80M+ weekly) |

**Strength**: @effect/cli is genuinely the most type-safe CLI framework available. Config file loading is a standout feature.

**Weakness**: Requires the full Effect runtime. Commander/Yargs are trivially adoptable.

---

## 7. Community Adoption

### GitHub Statistics (Effect-TS/effect monorepo)

| Metric | Value |
|--------|-------|
| Stars | 13,467 |
| Forks | 530 |
| Open issues | 504 |
| Created | 2019-11-13 |
| Language | TypeScript |
| Topics | cli, clustering, concurrency, dependency-injection, effect, error-handling, observability, opentelemetry, schema, workflows |

### npm Download Comparison (Monthly, March 2026)

| Package | Monthly Downloads | Context |
|---------|-------------------|---------|
| `effect` | **33,088,298** | Core library |
| `@effect/platform` | 3,757,927 | Most-used sub-package |
| `@effect/schema` | 3,696,505 | Validation/encoding |
| `@effect/workflow` | 835,534 | Durable workflows |
| `@effect/cli` | 493,883 | CLI framework |
| `@effect/ai` | 218,521 | AI integration |
| `@effect/ai-anthropic` | 28,000 (est.) | Anthropic provider |
| **For comparison:** | | |
| `zod` | 410,879,453 | 12x more than `effect` |
| `commander` | ~120,000,000 | CLI standard |
| `@modelcontextprotocol/sdk` | ~2,000,000 (est.) | MCP SDK |

**Effect at 33M monthly is respectable** -- it is in the "serious library" tier, comparable to libraries like `fp-ts` at its peak. But Zod at 411M is in a completely different league.

### Known Production Users

- **MasterClass**: Confirmed incremental adoption with error handling and retries (referenced in YouTube talk)
- **Vercel AI SDK**: Has native Effect Schema support (not exclusive -- also supports Zod)
- **Effectful Technologies**: The company behind Effect, uses it internally
- No Fortune 500 companies publicly confirmed as full Effect adopters

### Common Criticisms

1. **Steep learning curve**: Effect requires understanding generators, services, layers, fibers, scopes, schemas, and the `Effect<A, E, R>` type signature. This is a fundamentally different programming model from typical TypeScript.

2. **Hiring difficulty**: Harbor Engineering's detailed writeup noted that Effect-proficient developers "either (a) vigorously prioritize theoretical elegance over immediate practicality, or (b) are taking home obscene amounts of cash from [Jane Street]."

3. **Ecosystem friction**: Node.js ecosystem is built on Promises and throw. Every library interaction requires bridging. Drizzle ORM transactions need uncaught errors for rollbacks. Sentry expects unhandled exceptions. Passport.js needs specific error patterns.

4. **All-or-nothing pressure**: Once you start using Effect, the gravity well pulls more code into it. Partial adoption creates friction at boundaries.

5. **Version churn**: Many sub-packages still at 0.x. API breakage between versions has been a historical complaint.

### Positive Sentiment

1. **AI-assisted development**: Effect's explicit types actually make LLMs better at writing Effect code. The verbosity that hurts humans helps AI models.

2. **ThoughtWorks Technology Radar**: Listed Effect as a language/framework to assess, calling it "powerful."

3. **Genuinely solves real problems**: Error handling, dependency injection, concurrency, and observability are production pain points that Effect addresses comprehensively.

4. **Active development**: The team ships regularly (0.33.2 on @effect/ai, 3.19.19 on core). v4 development is underway in effect-smol.

### Learning Curve Assessment

| Level | What You Need to Know | Time Investment |
|-------|----------------------|-----------------|
| Basic | Effect.gen, pipe, Effect.runPromise | 1-2 days |
| Intermediate | Services, Layers, Schema, error channel | 1-2 weeks |
| Advanced | Fibers, Scopes, Streams, @effect/platform | 1-2 months |
| Expert | Cluster, Workflow, RPC, custom services | 3-6 months |

The learning curve is real and steep. However, for teams that commit to it, the payoff in code quality and reliability is also real.

---

## Summary Table: Production Readiness

| Package | Version | Maturity | Safe for Production? |
|---------|---------|----------|---------------------|
| `effect` (core) | 3.19.19 | **Stable** | YES |
| `@effect/schema` | Part of effect | **Stable** | YES |
| `@effect/platform` | ~stable | **Stable** | YES |
| `@effect/cli` | 0.73.2 | **Mature** | YES (with caveats on API changes) |
| `@effect/ai` | 0.33.2 | **Active development** | USE WITH CAUTION -- API will change |
| `@effect/ai-anthropic` | 0.23.0 | **Active development** | USE WITH CAUTION |
| `@effect/workflow` | 0.16.0 | **Early** | EVALUATE CAREFULLY for production |
| `effect-smol` (v4) | N/A | **Pre-release development** | DO NOT USE |

---

## Implications for Backlog Tasks

For tasks 143-147 (Effect-related):

1. **task-143 (evaluate-effect-ai-anthropic)**: The `@effect/ai` + `@effect/ai-anthropic` stack is real and functional but pre-1.0. The MCP server implementation is particularly impressive. Evaluation is worthwhile but should account for version instability.

2. **task-144 (effect-mcp-server-prototype)**: Strong candidate. The native MCP server in `@effect/ai` is well-designed with stdio/HTTP transports, typed tools via Schema, and resource templates. A prototype is feasible.

3. **task-145 (effect-workflow-agent-orchestration)**: More risky. `@effect/workflow` at 0.16.0 is early. The cluster engine requires significant infrastructure (@effect/cluster, SQL backend, sharding). Consider whether the in-memory engine is sufficient for your use case.

4. **task-146 (effect-schema-zod-migration)**: Not recommended unless you are going all-in on Effect. Zod has 111x the adoption, and the migration provides limited value without the full Effect ecosystem.

5. **task-147 (effect-cli-skill-toolkit)**: Reasonable. `@effect/cli` at 0.73.2 is the most mature sub-package, with genuine advantages (typed args, config file loading, prompts). Good for internal tooling where community size does not matter.
