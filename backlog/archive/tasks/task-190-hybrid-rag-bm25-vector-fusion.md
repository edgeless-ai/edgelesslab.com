---
created: 2026-03-10
status: completed
priority: P2
epic: 4-knowledge
effort: M
depends_on: []
blocks: []
tags: [rag, bm25, chromadb, retrieval, rcli, knowledge]
---

# Task 190: Hybrid RAG — Add BM25 to ChromaDB Retrieval

## Context

Our ChromaDB-based retrieval is vector-only, which fails on exact-match queries (task IDs, function names, config paths, abbreviations). RCLI implements Reciprocal Rank Fusion (RRF) combining vector similarity with BM25 keyword matching, achieving superior recall.

## Design

```python
from rank_bm25 import BM25Okapi

# Build BM25 index alongside ChromaDB
bm25_index = BM25Okapi(tokenized_documents)

# At query time:
vector_results = chromadb_collection.query(query, n=20)
bm25_results = bm25_index.get_top_n(tokenized_query, documents, n=20)

# Reciprocal Rank Fusion
def rrf_fuse(vector_ranked, bm25_ranked, k=60):
    scores = {}
    for rank, doc_id in enumerate(vector_ranked):
        scores[doc_id] = scores.get(doc_id, 0) + 1/(k + rank + 1)
    for rank, doc_id in enumerate(bm25_ranked):
        scores[doc_id] = scores.get(doc_id, 0) + 1/(k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)
```

## Use Cases Fixed

| Query | Vector-Only | With BM25+RRF |
|-------|------------|---------------|
| "task-137" | Poor (semantic mismatch) | Exact match |
| "consolidated_email_api" | Fair | Exact match |
| "Karpathy autoresearch" | Good | Better (keyword + semantic) |
| "fix the n8n workflow" | Good | Good (both work) |

## Acceptance Criteria

- [x] BM25-style index built alongside ChromaDB-backed collection data in the Effect MCP server
- [x] RRF fusion produces merged rankings
- [x] Exact-match queries show improved recall for cases like `consolidated_email_api`
- [x] Warm retrieval latency stays under 100ms
- [x] Works with existing memory system collections through `chroma.sqlite3`
- [x] True Chroma vector-query integration restored
- [x] Decide whether an external BM25 dependency is still warranted

## Progress Notes (2026-03-11)

Implemented in `mcp-servers/effect-knowledge-base/`:

- live corpus loading from local `chroma-data/chroma.sqlite3`
- persistent Python bridge into the existing repo `.venv` Chroma runtime
- direct `collection.query(...)` vector search for `semantic_search`
- BM25 keyword ranking over the SQLite-hydrated corpus
- RRF fusion for `hybrid_search`
- document fetch by knowledge-base id

Measured locally:

- cold first vector query against `unified_knowledge`: ~1.6-2.1s
- steady-state repeated semantic query: ~76-77ms
- steady-state repeated hybrid query: ~88-95ms

Decision:

Do not add an external BM25 dependency yet. The local BM25 implementation is sufficient for the current MCP server, keeps the package surface minimal, and can be replaced later if ranking quality or corpus scale makes that worthwhile.

## Source
Pattern from RCLI's hybrid retriever (https://github.com/RunanywhereAI/RCLI)
