"""
pipeline.py — the full CMCO spine run, as one function.

  ingest (adapters -> signals.jsonl ledger)          Marketing: signals
    -> merge (signals -> PropertyRecords)
    -> criteria + scoring + routing                  Criteria / Conversion
    -> candidates.jsonl snapshot + digest markdown   Ops: ledger + review queue

cli.py `run` is a thin wrapper over run_pipeline(); tests call it directly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .criteria import BuyBox
from .ingest import IngestResult, load_ledger_signals, run_ingest
from .merge import merge_signals
from .route import (
    RoutingConfig,
    build_candidates,
    write_candidates,
    write_digest,
)
from .schema import DealCandidate
from .scoring import ScoringConfig

PACKAGE_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class Paths:
    """All pipeline file locations, derived from one data_dir."""
    root: Path = PACKAGE_ROOT
    adapters_dir: Path = PACKAGE_ROOT / "adapters"
    data_dir: Path = PACKAGE_ROOT / "data"

    @property
    def ledger(self) -> Path:
        return self.data_dir / "signals.jsonl"

    @property
    def candidates(self) -> Path:
        return self.data_dir / "candidates.jsonl"


@dataclass
class PipelineResult:
    ingest: IngestResult
    candidates: list[DealCandidate] = field(default_factory=list)
    candidates_path: Path | None = None
    digest_path: Path | None = None

    @property
    def route_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for c in self.candidates:
            counts[c.route or "?"] = counts.get(c.route or "?", 0) + 1
        return counts


def run_pipeline(
    paths: Paths | None = None,
    buybox: BuyBox | None = None,
    scoring_config: ScoringConfig | None = None,
    routing_config: RoutingConfig | None = None,
    only_adapters: list[str] | None = None,
    now: datetime | None = None,
) -> PipelineResult:
    """Full run: ingest -> merge -> score/criteria/route -> emit outputs."""
    paths = paths or Paths()
    buybox = buybox or BuyBox()

    ingest_result = run_ingest(
        adapters_dir=paths.adapters_dir,
        ledger_path=paths.ledger,
        only=only_adapters,
    )
    signals = load_ledger_signals(paths.ledger)
    records = merge_signals(signals)
    candidates = build_candidates(
        records, buybox,
        scoring_config=scoring_config,
        routing_config=routing_config,
        now=now,
    )
    candidates_path = write_candidates(candidates, paths.candidates)
    digest_path = write_digest(
        candidates, digest_dir=paths.data_dir, buybox_name=buybox.name, now=now
    )
    return PipelineResult(
        ingest=ingest_result,
        candidates=candidates,
        candidates_path=candidates_path,
        digest_path=digest_path,
    )
