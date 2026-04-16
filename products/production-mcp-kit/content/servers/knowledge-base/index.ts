/**
 * Knowledge Base MCP Server — Effect-TS Implementation
 *
 * A production MCP server using Effect-TS for type-safe tool definitions,
 * dependency injection, and error handling. Provides hybrid search (vector + BM25)
 * over a document corpus stored in ChromaDB.
 *
 * This server demonstrates:
 * - Effect-TS McpServer + Toolkit pattern
 * - Schema-validated tool parameters and responses
 * - Service layer with dependency injection
 * - Graceful error handling with typed failures
 * - Read-only tool annotations
 *
 * Prerequisites:
 *   - ChromaDB running (local or remote)
 *   - Python bridge script for ChromaDB communication
 *   - Effect packages: effect, @effect/platform-node
 *
 * Usage:
 *   npx tsx index.ts
 */

import { NodeRuntime, NodeStdio } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { McpServer, Tool, Toolkit } from "effect/unstable/ai";

import {
  DocumentResponse,
  KnowledgeBase,
  KnowledgeBaseLive,
  SearchResponse,
  ToolFailure,
} from "./service.js";

// ─── Tool Definitions ───
// Each tool is type-safe: parameters validated via Schema,
// success/failure types declared, dependencies injected.

const SemanticSearch = Tool.make("semantic_search", {
  description:
    "Search the knowledge base using vector similarity. Best for conceptual queries.",
  parameters: Schema.Struct({
    query: Schema.String,
    collection: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number),
  }),
  success: SearchResponse,
  failure: ToolFailure,
  failureMode: "return",
  dependencies: [KnowledgeBase],
}).annotate(Tool.Readonly, true);

const HybridSearch = Tool.make("hybrid_search", {
  description:
    "Fuse vector ranking with BM25 keyword ranking using Reciprocal Rank Fusion. Best for precision.",
  parameters: Schema.Struct({
    query: Schema.String,
    collection: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number),
  }),
  success: SearchResponse,
  failure: ToolFailure,
  failureMode: "return",
  dependencies: [KnowledgeBase],
}).annotate(Tool.Readonly, true);

const GetDocument = Tool.make("get_document", {
  description:
    "Fetch the full contents and metadata for a document by ID.",
  parameters: Schema.Struct({
    id: Schema.String,
  }),
  success: DocumentResponse,
  failure: ToolFailure,
  failureMode: "return",
  dependencies: [KnowledgeBase],
}).annotate(Tool.Readonly, true);

// ─── Toolkit (groups related tools) ───

const KnowledgeBaseToolkit = Toolkit.make(
  SemanticSearch,
  HybridSearch,
  GetDocument,
);

// ─── Handler Layer (implements the tool logic) ───

const KnowledgeBaseHandlers = KnowledgeBaseToolkit.toLayer({
  semantic_search: ({ query, collection, limit }) =>
    Effect.gen(function* () {
      const kb = yield* KnowledgeBase;
      return yield* kb.semanticSearch({ query, collection, limit });
    }),
  hybrid_search: ({ query, collection, limit }) =>
    Effect.gen(function* () {
      const kb = yield* KnowledgeBase;
      return yield* kb.hybridSearch({ query, collection, limit });
    }),
  get_document: ({ id }) =>
    Effect.gen(function* () {
      const kb = yield* KnowledgeBase;
      return yield* kb.getDocument(id);
    }),
});

// ─── Server Composition ───
// Layer.provide chains: Toolkit -> Handlers -> Service -> Transport

const ServerLayer = McpServer.toolkit(KnowledgeBaseToolkit).pipe(
  Layer.provide(KnowledgeBaseHandlers),
  Layer.provide(KnowledgeBaseLive),
  Layer.provide(
    McpServer.layerStdio({
      name: "knowledge-base",
      version: "1.0.0",
    }),
  ),
  Layer.provide(NodeStdio.layer),
);

Layer.launch(ServerLayer).pipe(NodeRuntime.runMain);
