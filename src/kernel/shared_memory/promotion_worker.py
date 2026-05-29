"""Promotion worker for queued semantic memory indexing."""

from __future__ import annotations

import json
from typing import Any, Protocol

from .config import DEFAULT_CHROMA_DB_PATH
from .models import PromotionRunReceipt
from .sqlite_store import SQLiteMemoryStore


class PromotionHandler(Protocol):
    """Protocol for semantic promotion backends."""

    def promote(self, promotion: dict[str, Any]) -> dict[str, Any] | None:
        """Promote one queued memory item into a semantic store."""


class ChromaPromoter:
    """Direct ChromaDB promoter using deterministic ids for dedupe."""

    def __init__(self, chroma_path=DEFAULT_CHROMA_DB_PATH):
        self.chroma_path = str(chroma_path)

    def promote(self, promotion: dict[str, Any]) -> dict[str, Any]:
        try:
            import chromadb
        except ImportError as exc:
            raise RuntimeError("chromadb package is not installed") from exc

        payload = promotion["payload"]
        content = str(payload.get("content", "")).strip()
        if not content:
            raise ValueError("promotion payload is missing content")

        content_hash = promotion.get("content_hash")
        if not content_hash:
            raise ValueError("promotion is missing content_hash")

        client = chromadb.PersistentClient(path=self.chroma_path)
        collection = client.get_or_create_collection(name=promotion["target_collection"])
        document_id = f"shared-memory:{content_hash}"

        metadata = self._sanitize_metadata(
            promotion=promotion,
            payload=payload,
            content_hash=content_hash,
        )
        collection.upsert(
            ids=[document_id],
            documents=[content],
            metadatas=[metadata],
        )
        return {
            "document_id": document_id,
            "target_collection": promotion["target_collection"],
            "content_hash": content_hash,
            "backend": "chromadb",
        }

    @staticmethod
    def _sanitize_metadata(
        *,
        promotion: dict[str, Any],
        payload: dict[str, Any],
        content_hash: str,
    ) -> dict[str, Any]:
        metadata = dict(payload.get("metadata", {}))
        sanitized: dict[str, Any] = {}
        for key, value in metadata.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                sanitized[key] = value
            else:
                sanitized[key] = json.dumps(value, sort_keys=True)
        sanitized.update(
            {
                "agent": payload.get("agent"),
                "source_runtime": payload.get("source_runtime"),
                "session_id": payload.get("session_id"),
                "project": payload.get("project"),
                "memory_type": payload.get("memory_type"),
                "confidence": payload.get("confidence"),
                "requested_by": promotion.get("requested_by"),
                "promotion_reason": promotion.get("reason"),
                "content_hash": content_hash,
                "tags_json": json.dumps(payload.get("tags", []), sort_keys=True),
                "entity_refs_json": json.dumps(payload.get("entity_refs", []), sort_keys=True),
            }
        )
        return sanitized


class PromotionWorker:
    """Processes queued memory promotions into semantic storage."""

    def __init__(
        self,
        store: SQLiteMemoryStore,
        *,
        promoter: PromotionHandler | None = None,
    ):
        self.store = store
        self.promoter = promoter or ChromaPromoter()

    def run_once(self, limit: int = 10) -> PromotionRunReceipt:
        receipt = PromotionRunReceipt()
        promotions = self.store.claim_pending_promotions(limit=limit)
        receipt.processed = len(promotions)

        for promotion in promotions:
            content_hash = promotion.get("content_hash")
            if content_hash and self.store.has_completed_promotion_for_hash(content_hash):
                self.store.mark_promotion_completed(
                    promotion["id"],
                    metadata={"deduplicated": True, "content_hash": content_hash},
                )
                receipt.completed += 1
                receipt.skipped += 1
                continue

            try:
                result = self.promoter.promote(promotion) or {}
                result.setdefault("content_hash", content_hash)
                self.store.mark_promotion_completed(promotion["id"], metadata=result)
                receipt.completed += 1
            except Exception as exc:  # pragma: no cover - caller-facing error path
                error_message = str(exc)
                self.store.mark_promotion_failed(promotion["id"], error_message)
                receipt.failed += 1
                receipt.errors.append(error_message)

        return receipt
