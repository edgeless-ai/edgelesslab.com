"""
Knowledge spine query helper (task-299).

CLI wrapper for querying the unified knowledge_spine ChromaDB collection.
Supports filtering by source and returns ranked results.

Usage:
    python -m scripts.lib.knowledge_spine_query "ralph loop claude code"
    python -m scripts.lib.knowledge_spine_query "mcp protocol" --sources yt,rss
    python -m scripts.lib.knowledge_spine_query "trading strategy" --sources backlog --limit 5
    python -m scripts.lib.knowledge_spine_query --stats  # Show collection stats
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

import chromadb
from scripts.lib.chroma_config import get_chroma_client

COLLECTION_NAME = "knowledge_spine"

# Valid source filters
VALID_SOURCES = {"youtube", "rss", "memory-file", "backlog"}


def _get_collection() -> chromadb.Collection:
    """Get the knowledge_spine collection via the HTTP server."""
    client = get_chroma_client()
    return client.get_collection(COLLECTION_NAME)


def query_spine(
    query_text: str,
    sources: list[str] | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    Query the knowledge spine with optional source filtering.

    Args:
        query_text: The query text
        sources: List of sources to filter by (e.g., ["youtube", "rss"])
                 Valid: youtube, rss, memory-file, backlog
        limit: Maximum results to return

    Returns:
        List of result dicts with id, document preview, metadata, distance
    """
    col = _get_collection()

    # Build where filter if sources specified
    where_filter = None
    if sources:
        # Normalize and validate
        normalized = []
        for s in sources:
            # Map shortcuts
            mapping = {
                "yt": "youtube",
                "ytlikes": "youtube",
                "memory": "memory-file",
                "mem": "memory-file",
                "ticket": "backlog",
                "tasks": "backlog",
            }
            norm = mapping.get(s.lower(), s.lower())
            if norm in VALID_SOURCES:
                normalized.append(norm)

        if len(normalized) == 1:
            where_filter = {"source": normalized[0]}
        elif len(normalized) > 1:
            where_filter = {"source": {"$in": normalized}}

    # Execute query
    results = col.query(
        query_texts=[query_text],
        n_results=limit,
        where=where_filter,
    )

    # Format results
    formatted = []
    if results and results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            doc = results["documents"][0][i] if results["documents"] else ""
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            dist = results["distances"][0][i] if results["distances"] else None

            # Truncate document preview
            preview = doc[:200].replace("\n", " ") + "..." if len(doc) > 200 else doc

            formatted.append({
                "id": doc_id,
                "source": meta.get("source", "unknown"),
                "source_type": meta.get("source_type", "unknown"),
                "title": meta.get("title", "Untitled"),
                "score": meta.get("score"),
                "route": meta.get("route"),
                "vault_path": meta.get("vault_path") or meta.get("source_path") or meta.get("memory_path") or meta.get("ticket_path"),
                "processed": meta.get("processed"),
                "preview": preview,
                "distance": dist,
                "metadata": meta,
            })

    return formatted


def get_stats() -> dict[str, Any]:
    """Get collection statistics by source."""
    col = _get_collection()
    total = col.count()

    stats = {"total": total, "by_source": {}, "by_source_type": {}}

    if total == 0:
        return stats

    all_data = col.get()

    if all_data and "metadatas" in all_data:
        for meta in all_data["metadatas"]:
            if not meta:
                continue
            source = meta.get("source", "unknown")
            source_type = meta.get("source_type", "unknown")

            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1
            stats["by_source_type"][source_type] = stats["by_source_type"].get(source_type, 0) + 1

    return stats


def dedup_check(
    title: str,
    body_preview: str = "",
    threshold: float = 0.92,
    sources: list[str] | None = None,
) -> dict[str, Any]:
    """
    Check if content similar to `title` already exists in the knowledge spine.

    Args:
        title: Title of the new content to check
        body_preview: Optional body text to also query
        threshold: Similarity threshold above which we consider it a duplicate
                   (1.0 = exact match, 0.9 = very close, 0.85 = related)
        sources: Limit search to specific sources (e.g., ["youtube", "rss"])

    Returns:
        {
            "is_duplicate": bool,
            "best_match": dict | None,
            "all_matches": list[dict],
            "recommendation": str,
        }
    """
    query_text = title if not body_preview else f"{title}\n\n{body_preview[:500]}"
    results = query_spine(query_text, sources=sources, limit=5)

    matches = []
    for r in results:
        dist = r.get("distance")
        if dist is None:
            continue
        # Chroma distance: lower = more similar. Cosine distance range [0, 2].
        # Map to [0, 1] similarity score.
        similarity = max(0.0, 1.0 - (dist / 2.0))
        if similarity >= threshold:
            matches.append({
                "id": r["id"],
                "title": r["title"],
                "source": r["source"],
                "source_path": r.get("vault_path") or r.get("source_path", ""),
                "similarity": round(similarity, 3),
                "preview": r["preview"][:100],
            })

    if not matches:
        return {
            "is_duplicate": False,
            "best_match": None,
            "all_matches": [],
            "recommendation": "No similar content found. Safe to create new entry.",
        }

    best = max(matches, key=lambda x: x["similarity"])
    is_dup = best["similarity"] >= 0.97

    rec = (
        f"LIKELY DUPLICATE (sim={best['similarity']}): '{best['title']}' from {best['source']}. "
        f"Consider updating existing entry at {best['source_path'][:60]} instead of creating new."
        if is_dup else
        f"Related content found (sim={best['similarity']}): '{best['title']}'. "
        f"Review before creating; may want to link or append instead."
    )

    return {
        "is_duplicate": is_dup,
        "best_match": best,
        "all_matches": matches,
        "recommendation": rec,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Query the knowledge spine ChromaDB collection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "claude code patterns"              # Search all sources
  %(prog)s "mcp protocol" --sources yt,rss    # Filter by YouTube + RSS
  %(prog)s "trading" --sources backlog       # Search backlog tickets
  %(prog)s "memory" --sources memory          # Search memory files
  %(prog)s --stats                           # Show collection statistics

Source aliases:
  yt, ytlikes -> youtube
  mem, memory -> memory-file
  ticket, tasks -> backlog
""",
    )
    parser.add_argument("query", nargs="?", help="Query text")
    parser.add_argument(
        "--sources",
        type=str,
        help="Comma-separated source filter (yt,rss,memory,backlog)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum results to return (default: 10)",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show collection statistics instead of querying",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON",
    )
    parser.add_argument(
        "--dedup",
        type=str,
        metavar="TITLE",
        help="Check for duplicate content by title before writing",
    )
    parser.add_argument(
        "--dedup-threshold",
        type=float,
        default=0.92,
        help="Similarity threshold for dedup (default: 0.92)",
    )

    args = parser.parse_args()

    if args.stats:
        stats = get_stats()
        if args.json:
            import json
            print(json.dumps(stats, indent=2))
        else:
            print("=== Knowledge Spine Statistics ===")
            print(f"Total documents: {stats['total']}")
            print("\nBy source:")
            for source, count in sorted(stats["by_source"].items()):
                print(f"  {source:15s}: {count}")
            print("\nBy source type:")
            for st, count in sorted(stats["by_source_type"].items()):
                print(f"  {st:15s}: {count}")
        return 0

    if args.dedup:
        sources = None
        if args.sources:
            sources = [s.strip() for s in args.sources.split(",")]
        result = dedup_check(args.dedup, threshold=args.dedup_threshold, sources=sources)
        if args.json:
            import json
            print(json.dumps(result, indent=2, default=str))
        else:
            print(f"=== Dedup Check: '{args.dedup[:60]}' ===")
            print(f"Duplicate: {'YES' if result['is_duplicate'] else 'NO'}")
            print(f"Recommendation: {result['recommendation']}")
            if result["best_match"]:
                bm = result["best_match"]
                print(f"Best match: {bm['title'][:60]} (sim={bm['similarity']})")
                print(f"Path: {bm['source_path'][:60]}")
        return 0

    if not args.query:
        print("Error: Query text required (or use --stats / --dedup)", file=sys.stderr)
        parser.print_help()
        return 1

    # Parse sources
    sources = None
    if args.sources:
        sources = [s.strip() for s in args.sources.split(",")]

    try:
        results = query_spine(args.query, sources=sources, limit=args.limit)
    except Exception as e:
        print(f"Query failed: {e}", file=sys.stderr)
        return 1

    if args.json:
        import json
        # Remove full metadata from JSON to keep it clean
        cleaned = [{k: v for k, v in r.items() if k != "metadata"} for r in results]
        print(json.dumps(cleaned, indent=2))
        return 0

    # Human-readable output
    source_filter = f" [sources: {args.sources}]" if args.sources else ""
    print(f"=== Knowledge Spine Query{source_filter} ===")
    print(f'Query: "{args.query}"')
    print(f"Results: {len(results)}\n")

    for i, r in enumerate(results, 1):
        source_icon = {
            "youtube": "📺",
            "rss": "📰",
            "memory-file": "📝",
            "backlog": "🎫",
        }.get(r["source"], "📄")

        print(f"{i}. {source_icon} [{r['source']}] {r['title'][:60]}")
        if r.get("score") is not None:
            print(f"   Score: {r['score']} | Route: {r.get('route', 'N/A')}")
        if r.get("vault_path"):
            path = r["vault_path"]
            if len(path) > 50:
                path = "..." + path[-47:]
            print(f"   Path: {path}")
        if r.get("distance") is not None:
            print(f"   Relevance: {1 - r['distance']:.2%}")
        print(f"   Preview: {r['preview'][:100]}...")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
