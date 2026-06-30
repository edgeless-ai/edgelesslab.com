#!/usr/bin/env python3
"""
Vault → unified_knowledge embedding pipeline
Builds ChromaDB's unified_knowledge collection from claude-vault markdown files.

Usage:
    python scripts/vault_to_chroma_pipeline.py [--dry-run] [--batch-size 100]

EDGA-882 / CHROMA-1
"""

import json
import os
import sys
import re
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Generator
import yaml
from dataclasses import dataclass

SYNC_STATUS_DIR = Path("/Users/djm/claude-projects/.runtime/sync-status")
PIPELINE_NAME = "vault_to_chroma"
CHECKPOINT_PATH = SYNC_STATUS_DIR / f"{PIPELINE_NAME}_checkpoint.json"

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import chromadb
    from chromadb.config import Settings
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"Error: Required package not installed: {e}")
    print("Run: pip install chromadb sentence-transformers")
    sys.exit(1)


@dataclass
class VaultDocument:
    """Represents a vault markdown document."""
    file_path: str
    content: str
    source: str  # e.g., "vault/03-Knowledge/RSS"
    last_modified: float
    frontmatter: Dict
    title: str


def write_status_file(
    status: str,
    docs_processed: int,
    docs_skipped: int,
    errors: List[str],
    duration_seconds: float,
) -> None:
    """Write a structured JSON status file to .runtime/sync-status/."""
    SYNC_STATUS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "pipeline": PIPELINE_NAME,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "docs_processed": docs_processed,
        "docs_skipped": docs_skipped,
        "errors": errors,
        "duration_seconds": round(duration_seconds, 2),
    }
    dest = SYNC_STATUS_DIR / f"{PIPELINE_NAME}.json"
    dest.write_text(json.dumps(payload, indent=2))
    print(f"Status written → {dest}")


def load_checkpoint() -> Dict:
    """Load the resume checkpoint (set of already-embedded file paths)."""
    if CHECKPOINT_PATH.exists():
        try:
            data = json.loads(CHECKPOINT_PATH.read_text())
            data.setdefault("processed_files", [])
            return data
        except (json.JSONDecodeError, OSError):
            pass
    return {"processed_files": [], "updated": None}


def save_checkpoint(processed_files: set) -> None:
    """Persist the set of embedded file paths so a crashed run can resume."""
    SYNC_STATUS_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CHECKPOINT_PATH.with_suffix(".json.tmp")
    payload = {
        "pipeline": PIPELINE_NAME,
        "updated": datetime.now().isoformat(),
        "count": len(processed_files),
        "processed_files": sorted(processed_files),
    }
    # Atomic write so a kill mid-write never corrupts the checkpoint.
    tmp.write_text(json.dumps(payload))
    tmp.replace(CHECKPOINT_PATH)


def check_chroma_path(chroma_path: str) -> bool:
    """Verify that the PersistentClient path exists and is a directory."""
    p = Path(chroma_path)
    if not p.exists():
        print(
            f"Error: ChromaDB path does not exist: {chroma_path}\n"
            f"       Create it first or pass a valid --chroma-path.",
            file=sys.stderr,
        )
        return False
    if not p.is_dir():
        print(
            f"Error: ChromaDB path exists but is not a directory: {chroma_path}",
            file=sys.stderr,
        )
        return False
    return True


def extract_frontmatter(content: str) -> tuple[Dict, str]:
    """Extract YAML frontmatter from markdown content."""
    frontmatter = {}
    body = content
    
    # Check for frontmatter between --- markers
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()
            except yaml.YAMLError:
                pass
    
    return frontmatter, body


def get_source_from_path(file_path: Path, vault_root: Path) -> str:
    """Determine source category from vault path."""
    try:
        rel_path = file_path.relative_to(vault_root)
        parts = rel_path.parts
        
        if len(parts) >= 1:
            # Map 03-Knowledge → Knowledge, etc.
            first_dir = parts[0]
            if first_dir.startswith('0'):
                category = first_dir[3:].replace('-', ' ')
                return f"vault/{category}"
        
        return "vault/misc"
    except ValueError:
        return "vault/misc"


# Directories that pollute the vault walk with non-knowledge markdown
# (dependency trees, VCS internals, build output). Skipping these takes the
# walk from ~31k files down to the ~6.3k real vault notes.
EXCLUDED_DIR_NAMES = {
    'node_modules', '.git', '.obsidian', '.trash', '.smart-env',
    'venv', '.venv', '__pycache__', 'dist', 'build', '.next', '.cache',
}


def _is_excluded(file_path: Path, vault_root: Path) -> bool:
    """True if any parent directory (relative to vault) is in the exclude set."""
    try:
        rel = file_path.relative_to(vault_root)
    except ValueError:
        return False
    return any(part in EXCLUDED_DIR_NAMES for part in rel.parts[:-1])


def walk_vault(vault_path: Path) -> Generator[VaultDocument, None, None]:
    """Walk the vault and yield markdown documents."""
    md_extensions = {'.md', '.markdown'}

    for file_path in vault_path.rglob('*'):
        if file_path.suffix.lower() in md_extensions and not _is_excluded(file_path, vault_path):
            try:
                stat = file_path.stat()
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                frontmatter, body = extract_frontmatter(content)
                
                # Get title from frontmatter or first heading
                title = frontmatter.get('title', '')
                if not title:
                    # Try to extract from first # heading
                    match = re.search(r'^#\s+(.+)$', body, re.MULTILINE)
                    if match:
                        title = match.group(1).strip()
                    else:
                        title = file_path.stem.replace('-', ' ').title()
                
                source = get_source_from_path(file_path, vault_path)
                
                yield VaultDocument(
                    file_path=str(file_path.relative_to(vault_path)),
                    content=body[:5000],  # Limit content length for embedding
                    source=source,
                    last_modified=stat.st_mtime,
                    frontmatter=frontmatter,
                    title=title
                )
            except (IOError, OSError) as e:
                print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
                continue


def chunk_text(text: str, max_chars: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for embedding.

    Guaranteed to terminate: each iteration advances ``start`` by at least one
    character, and the loop breaks as soon as a chunk reaches the end of the
    text. The previous implementation looped forever once ``end`` clamped to
    ``len(text)`` because ``start = end - overlap`` then stayed fixed below
    ``end`` (the ``start >= end`` guard never fired), appending the same final
    slice until the process exhausted memory and was killed (EDGA-16904).
    """
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []

    # Forward step per chunk; clamp to >=1 so progress is always made even if
    # someone passes overlap >= max_chars.
    step = max(max_chars - overlap, 1)

    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        # Try to break at a sentence/paragraph boundary, but only when there is
        # more text after this chunk (don't shorten the final chunk).
        if end < n:
            floor = max(start + max_chars - 100, start + 1)
            for i in range(end, floor, -1):
                if text[i - 1:i + 1] in {'. ', '! ', '? ', '\n\n'}:
                    end = i
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Reached the end of the text -> done. This is the fix for the
        # infinite loop: stop instead of re-emitting the tail forever.
        if end >= n:
            break

        # Advance with overlap, but never move backward or stall.
        next_start = end - overlap
        if next_start <= start:
            next_start = start + step
        start = next_start

    return chunks


def create_chroma_collection(
    chroma_path: str,
    collection_name: str = "unified_knowledge"
) -> chromadb.Collection:
    """Get or create the ChromaDB collection."""
    client = chromadb.PersistentClient(
        path=chroma_path,
        settings=Settings(anonymized_telemetry=False)
    )
    
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={
            "description": "Unified knowledge base from claude-vault markdown files",
            "created": datetime.now().isoformat(),
            "source": "vault_to_chroma_pipeline.py"
        }
    )
    
    return collection


def _doc_metadata(doc: "VaultDocument", chunk_index: int, total_chunks: int) -> Dict:
    """Build the Chroma metadata dict for a chunk."""
    metadata = {
        'file_path': doc.file_path,
        'source': doc.source,
        'last_modified': doc.last_modified,
        'title': doc.title,
        'chunk_index': chunk_index,
        'total_chunks': total_chunks,
    }
    for key in ['topics', 'tags', 'category', 'author']:
        if key in doc.frontmatter:
            value = doc.frontmatter[key]
            if isinstance(value, list):
                metadata[key] = ','.join(str(v) for v in value)
            else:
                metadata[key] = value

    # Coerce every value to a Chroma-accepted scalar type. YAML parses bare
    # dates (e.g. `title: 2026-03-07`) into datetime.date objects, which Chroma
    # rejects — that lost 2 batches (~200 chunks) on the first full backfill.
    for k, v in list(metadata.items()):
        if not isinstance(v, (str, int, float, bool)) and v is not None:
            metadata[k] = str(v)
    return metadata


def process_vault(
    vault_path: Path,
    chroma_path: str,
    model_name: str = 'all-MiniLM-L6-v2',
    batch_size: int = 100,
    dry_run: bool = False,
    max_files: Optional[int] = None,
    device: str = 'cpu',
    resume: bool = True,
) -> Dict:
    """Process vault documents and insert into ChromaDB.

    Streaming design (EDGA-16904): documents are chunked and embedded in
    bounded batches; each full batch is encoded in a single ``model.encode``
    call, upserted to Chroma, and recorded in an on-disk checkpoint. Nothing
    accumulates across the whole run, so memory stays flat and a crash can
    resume from the last committed file via ``--resume``.
    """

    # --- Resume checkpoint ---
    processed_files: set = set()
    if resume and not dry_run:
        ck = load_checkpoint()
        processed_files = set(ck.get("processed_files", []))
        if processed_files:
            print(f"Resume: {len(processed_files)} files already embedded "
                  f"(from {CHECKPOINT_PATH.name}); they will be skipped.",
                  flush=True)

    # Load embedding model. Force CPU by default: on Apple Silicon the auto-
    # selected MPS backend is unnecessary here and adds flakiness for a
    # headless cron; CPU embeds all-MiniLM-L6-v2 at ~0.03s/chunk batched.
    print(f"Loading embedding model: {model_name} (device={device})", flush=True)
    model = SentenceTransformer(model_name, device=device)

    # Initialize ChromaDB
    if not dry_run:
        collection = create_chroma_collection(chroma_path)
        count_before = collection.count()
        print(f"Collection '{collection.name}' count before sync: {count_before}",
              flush=True)
    else:
        print("DRY RUN: No changes will be made to ChromaDB", flush=True)
        collection = None
        count_before = 0

    stats = {
        'total_files': 0,
        'total_chunks': 0,
        'embedded_chunks': 0,
        'errors': 0,
        'sources': {},
        'skipped_files': 0,
    }

    # Bounded batch buffers — never grow beyond ~batch_size entries.
    b_ids: List[str] = []
    b_texts: List[str] = []
    b_metas: List[Dict] = []
    b_files: List[str] = []  # source file for each chunk (for checkpointing)

    def flush() -> None:
        """Encode + upsert the current batch, then checkpoint committed files."""
        if not b_ids:
            return
        try:
            embeddings = model.encode(
                b_texts, batch_size=64, show_progress_bar=False
            )
            if not dry_run:
                # upsert (not add) => idempotent re-runs and safe resume overlap
                collection.upsert(
                    ids=list(b_ids),
                    embeddings=[e.tolist() for e in embeddings],
                    metadatas=list(b_metas),
                    documents=list(b_texts),
                )
            stats['embedded_chunks'] += len(b_ids)
            if not dry_run:
                processed_files.update(b_files)
                save_checkpoint(processed_files)
        except Exception as e:  # noqa: BLE001 - keep the run alive
            stats['errors'] += 1
            print(f"Error committing batch ({len(b_ids)} chunks): {e}",
                  file=sys.stderr, flush=True)
        finally:
            b_ids.clear()
            b_texts.clear()
            b_metas.clear()
            b_files.clear()

    print(f"Walking vault: {vault_path}", flush=True)

    for doc in walk_vault(vault_path):
        stats['total_files'] += 1

        if max_files and stats['total_files'] > max_files:
            print(f"  Reached max_files limit ({max_files}), stopping.", flush=True)
            break

        if resume and not dry_run and doc.file_path in processed_files:
            stats['skipped_files'] += 1
            continue

        if stats['total_files'] % 200 == 0:
            print(f"  Processed {stats['total_files']} files "
                  f"({stats['embedded_chunks']} chunks embedded, "
                  f"{stats['skipped_files']} skipped)...", flush=True)

        chunks = chunk_text(doc.content)
        for i, chunk in enumerate(chunks):
            stats['total_chunks'] += 1
            b_ids.append(f"{doc.file_path}::chunk_{i}")
            b_texts.append(chunk)
            b_metas.append(_doc_metadata(doc, i, len(chunks)))
            b_files.append(doc.file_path)
            stats['sources'][doc.source] = stats['sources'].get(doc.source, 0) + 1

            if len(b_ids) >= batch_size:
                flush()

    # Flush whatever is left.
    flush()

    # --- Idempotency log: count delta ---
    if not dry_run and collection is not None:
        count_after = collection.count()
        delta = count_after - count_before
        print(
            f"Collection '{collection.name}' count after sync: {count_after} "
            f"(delta: +{delta})", flush=True
        )

    return stats


def main():
    # Line-buffer stdout so progress is never lost if the process is killed
    # mid-run (the original failure looked "silent" because block-buffered
    # output was discarded when the OOM kill landed).
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:  # noqa: BLE001
        pass

    parser = argparse.ArgumentParser(
        description="Build vault → ChromaDB unified_knowledge pipeline"
    )
    parser.add_argument(
        '--vault-path',
        default='/Users/djm/claude-projects/claude-vault',
        help='Path to claude-vault directory'
    )
    parser.add_argument(
        '--chroma-path',
        default='/Users/djm/claude-projects/chroma-data',
        help='Path to ChromaDB data directory'
    )
    parser.add_argument(
        '--model',
        default='all-MiniLM-L6-v2',
        help='Sentence transformer model to use'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Batch size for ChromaDB inserts'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Process without writing to ChromaDB'
    )
    parser.add_argument(
        '--max-files',
        type=int,
        default=None,
        help='Limit processing to N files (for testing)'
    )
    parser.add_argument(
        '--device',
        default='cpu',
        help="Torch device for the embedding model (default: cpu; "
             "avoids flaky MPS hangs in headless cron). Use 'mps' or 'cuda' "
             "to opt into accelerators."
    )
    parser.add_argument(
        '--no-resume',
        action='store_true',
        help='Ignore the resume checkpoint and re-embed every file'
    )
    parser.add_argument(
        '--reset-checkpoint',
        action='store_true',
        help='Delete the resume checkpoint before running'
    )

    args = parser.parse_args()

    if args.reset_checkpoint and CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()
        print(f"Checkpoint reset: removed {CHECKPOINT_PATH}")

    vault_path = Path(args.vault_path)
    if not vault_path.exists():
        print(f"Error: Vault path does not exist: {vault_path}")
        sys.exit(1)

    # --- ChromaDB connectivity check ---
    if not args.dry_run and not check_chroma_path(args.chroma_path):
        write_status_file(
            status="failure",
            docs_processed=0,
            docs_skipped=0,
            errors=[f"ChromaDB path not accessible: {args.chroma_path}"],
            duration_seconds=0.0,
        )
        sys.exit(1)

    print("=" * 60)
    print("Vault → ChromaDB Embedding Pipeline")
    print("=" * 60)
    print(f"Vault path: {vault_path}")
    print(f"ChromaDB path: {args.chroma_path}")
    print(f"Model: {args.model}")
    print(f"Batch size: {args.batch_size}")
    print(f"Dry run: {args.dry_run}")
    print("=" * 60)

    start_time = datetime.now()
    error_list: List[str] = []

    try:
        stats = process_vault(
            vault_path=vault_path,
            chroma_path=args.chroma_path,
            model_name=args.model,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
            max_files=args.max_files,
            device=args.device,
            resume=not args.no_resume,
        )
    except Exception as exc:
        duration = (datetime.now() - start_time).total_seconds()
        error_list.append(str(exc))
        write_status_file(
            status="failure",
            docs_processed=0,
            docs_skipped=0,
            errors=error_list,
            duration_seconds=duration,
        )
        print(f"Fatal error: {exc}", file=sys.stderr)
        sys.exit(1)

    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print("\n" + "=" * 60)
    print("Pipeline Complete")
    print("=" * 60)
    print(f"Duration: {duration:.1f}s")
    print(f"Files walked: {stats['total_files']}")
    print(f"Files skipped (resume): {stats.get('skipped_files', 0)}")
    print(f"Chunks created: {stats['total_chunks']}")
    print(f"Chunks embedded: {stats['embedded_chunks']}")
    print(f"Errors: {stats['errors']}")
    print("\nSources breakdown:")
    for source, count in sorted(stats['sources'].items(), key=lambda x: -x[1])[:10]:
        print(f"  {source}: {count}")

    if not args.dry_run:
        # Verify collection count (already logged inside process_vault)
        client = chromadb.PersistentClient(
            path=args.chroma_path,
            settings=Settings(anonymized_telemetry=False)
        )
        collection = client.get_collection("unified_knowledge")
        print(f"\nFinal collection count: {collection.count()}")

    print("=" * 60)

    # --- Write status file ---
    pipeline_status = "failure" if stats['errors'] > 0 else "success"
    write_status_file(
        status=pipeline_status,
        docs_processed=stats['embedded_chunks'],
        docs_skipped=stats['total_chunks'] - stats['embedded_chunks'],
        errors=error_list,
        duration_seconds=duration,
    )


if __name__ == "__main__":
    main()
