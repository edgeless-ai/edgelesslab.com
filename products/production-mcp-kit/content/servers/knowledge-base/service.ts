/**
 * Knowledge Base Service — Effect-TS Service Layer
 *
 * Implements hybrid search over a document corpus:
 * - Semantic search via ChromaDB (or any vector store)
 * - BM25 keyword search with TF-IDF scoring
 * - Reciprocal Rank Fusion to combine both rankings
 *
 * The service is injected into MCP tool handlers via Effect's
 * dependency injection system. This means:
 * - Tools declare their dependencies in the type system
 * - The service implementation is provided at composition time
 * - You can swap implementations for testing
 *
 * Environment variables:
 *   CHROMA_DATA_PATH    — path to ChromaDB data directory
 *   CHROMA_PYTHON_PATH  — path to Python interpreter with chromadb installed
 *   DEFAULT_COLLECTION  — default collection name (default: "documents")
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { Effect, Context, Layer, Schema } from "effect";

// ─── Configuration ───

const DEFAULT_COLLECTION = process.env.DEFAULT_COLLECTION ?? "documents";
const CHROMA_DATA_PATH = process.env.CHROMA_DATA_PATH ?? "./chroma-data";
const CHROMA_PYTHON_PATH = process.env.CHROMA_PYTHON_PATH ?? "python3";

// ─── Response Schemas ───

export class SearchResult extends Schema.Class<SearchResult>("SearchResult")({
  id: Schema.String,
  document: Schema.String,
  score: Schema.Number,
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export class SearchResponse extends Schema.Class<SearchResponse>("SearchResponse")({
  results: Schema.Array(SearchResult),
  query: Schema.String,
  collection: Schema.String,
  count: Schema.Number,
}) {}

export class DocumentResponse extends Schema.Class<DocumentResponse>("DocumentResponse")({
  id: Schema.String,
  document: Schema.String,
  collection: Schema.String,
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
}) {}

export class ToolFailure extends Schema.TaggedClass<ToolFailure>()(
  "ToolFailure",
  { message: Schema.String },
) {}

// ─── Service Interface ───

type SearchOptions = {
  readonly query: string;
  readonly collection?: string;
  readonly limit?: number;
};

export class KnowledgeBase extends Context.Tag("KnowledgeBase")<
  KnowledgeBase,
  {
    readonly semanticSearch: (opts: SearchOptions) => Effect.Effect<SearchResponse, ToolFailure>;
    readonly hybridSearch: (opts: SearchOptions) => Effect.Effect<SearchResponse, ToolFailure>;
    readonly getDocument: (id: string) => Effect.Effect<DocumentResponse, ToolFailure>;
  }
>() {}

// ─── BM25 Implementation ───

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "how", "in", "is", "it", "of", "on", "or", "that", "the", "this",
  "to", "with",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  docFrequencies: Map<string, number>,
  totalDocs: number,
  avgDocLength: number,
  k1 = 1.5,
  b = 0.75,
): number {
  const termFreqs = new Map<string, number>();
  for (const token of docTokens) {
    termFreqs.set(token, (termFreqs.get(token) ?? 0) + 1);
  }

  let score = 0;
  for (const token of queryTokens) {
    const tf = termFreqs.get(token) ?? 0;
    const df = docFrequencies.get(token) ?? 0;
    if (tf === 0 || df === 0) continue;

    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docTokens.length / avgDocLength));
    score += idf * (numerator / denominator);
  }
  return score;
}

// ─── Service Implementation ───

export const KnowledgeBaseLive = Layer.succeed(KnowledgeBase, {
  semanticSearch: (opts) =>
    Effect.tryPromise({
      try: async () => {
        // Replace this with your vector store client.
        // Example using ChromaDB Python bridge:
        const collection = opts.collection ?? DEFAULT_COLLECTION;
        const limit = opts.limit ?? 10;

        // This is where you'd call your vector store.
        // The production version uses a Python subprocess bridge to ChromaDB.
        // For other vector stores (Pinecone, Weaviate, Qdrant), replace this
        // with their respective client SDK calls.
        const results: SearchResult[] = [];

        return new SearchResponse({
          results,
          query: opts.query,
          collection,
          count: results.length,
        });
      },
      catch: (error) =>
        new ToolFailure({
          message: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),

  hybridSearch: (opts) =>
    Effect.tryPromise({
      try: async () => {
        const collection = opts.collection ?? DEFAULT_COLLECTION;
        const limit = opts.limit ?? 10;

        // Hybrid search: combine vector results with BM25 keyword results
        // using Reciprocal Rank Fusion (RRF).
        //
        // RRF formula: score = sum(1 / (k + rank_i)) for each ranking system
        // where k is a constant (typically 60).
        //
        // This outperforms either ranking alone because vector search catches
        // semantic similarity while BM25 catches exact keyword matches.
        const results: SearchResult[] = [];

        return new SearchResponse({
          results,
          query: opts.query,
          collection,
          count: results.length,
        });
      },
      catch: (error) =>
        new ToolFailure({
          message: `Hybrid search failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),

  getDocument: (id) =>
    Effect.tryPromise({
      try: async () => {
        // Fetch a single document by ID from your store.
        return new DocumentResponse({
          id,
          document: "",
          collection: DEFAULT_COLLECTION,
        });
      },
      catch: (error) =>
        new ToolFailure({
          message: `Get document failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),
});
