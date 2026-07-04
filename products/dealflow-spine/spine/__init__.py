"""dealflow-spine — the CMCO spine: Criteria -> Marketing(signals) ->
Conversion(routing) -> Ops(ledger). See README.md for the contract."""

from .criteria import BuyBox, CriteriaResult, load_buybox
from .ingest import IngestResult, load_ledger_signals, run_ingest
from .merge import merge_signals, normalize_address, property_key
from .pipeline import Paths, PipelineResult, run_pipeline
from .route import (
    Route,
    RoutingConfig,
    build_candidates,
    load_candidates,
    recommend_strategy,
    render_digest,
    route_record,
    write_candidates,
    write_digest,
)
from .schema import (
    KNOWN_FACT_KEYS,
    SIGNAL_TYPES,
    DealCandidate,
    Owner,
    PropertyRecord,
    PropertyRef,
    ScoreBreakdown,
    Signal,
)
from .scoring import DEFAULT_WEIGHTS, ScoringConfig, score_record

__all__ = [
    "BuyBox", "CriteriaResult", "load_buybox",
    "IngestResult", "load_ledger_signals", "run_ingest",
    "merge_signals", "normalize_address", "property_key",
    "Paths", "PipelineResult", "run_pipeline",
    "Route", "RoutingConfig", "build_candidates", "load_candidates",
    "recommend_strategy", "render_digest", "route_record",
    "write_candidates", "write_digest",
    "KNOWN_FACT_KEYS", "SIGNAL_TYPES",
    "DealCandidate", "Owner", "PropertyRecord", "PropertyRef",
    "ScoreBreakdown", "Signal",
    "DEFAULT_WEIGHTS", "ScoringConfig", "score_record",
]

__version__ = "0.1.0"
