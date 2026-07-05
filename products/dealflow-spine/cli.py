#!/usr/bin/env python3.11
"""
dealflow-spine CLI.

  python cli.py run        # full pipeline: ingest -> merge -> score -> route -> underwrite -> digest
  python cli.py run --live # same, with network adapters enabled (default is offline/fixtures)
  python cli.py ingest     # ingest only (adapters -> data/signals.jsonl)
  python cli.py enrich     # resolve quarantined signals (signals_pending.jsonl -> resolvers -> ledger)
  python cli.py score      # merge + score the ledger, print the ranked table (no writes)
  python cli.py underwrite # re-run the strategy picker on data/candidates.jsonl + refresh digest
  python cli.py digest     # re-render the digest from data/candidates.jsonl

Common flags: --config config/buybox.json --data-dir data --adapters-dir adapters
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from spine.criteria import BuyBox
from spine.enrich import run_enrich
from spine.ingest import load_ledger_signals, run_ingest
from spine.merge import merge_signals
from spine.pipeline import Paths, run_pipeline
from spine.route import load_candidates, write_candidates, write_digest
from spine.scoring import score_record
from spine.underwrite import top_reason, underwrite_candidates

LIVE_ENV_VAR = "DEALFLOW_LIVE"  # read by adapters/_common.resolve_offline()


def _apply_live(args) -> None:
    """`--live` opts network adapters in for THIS process; the default run
    stays offline (bundled fixtures). Adapters read the env var via
    adapters/_common.live_enabled(), keeping the politeness layer
    (UA, rate-limit, bounded retries) as the only network path."""
    if getattr(args, "live", False):
        os.environ[LIVE_ENV_VAR] = "1"
        print("[live] network adapters ENABLED (polite: shared UA, >=1s "
              "between requests, bounded retries)", file=sys.stderr)


def _paths(args) -> Paths:
    return Paths(
        root=ROOT,
        adapters_dir=Path(args.adapters_dir).resolve(),
        resolvers_dir=Path(args.resolvers_dir).resolve(),
        data_dir=Path(args.data_dir).resolve(),
    )


def _buybox(args) -> BuyBox:
    cfg = Path(args.config)
    if cfg.exists():
        return BuyBox.load(cfg)
    print(f"[warn] buy-box config {cfg} not found — running with an empty box "
          "(everything geo-fits)", file=sys.stderr)
    return BuyBox()


def _print_ingest_summary(result) -> None:
    print("── ingest ──")
    for a in result.adapters:
        status = f"ERROR: {a.error}" if a.error else (
            f"fetched {a.fetched:>4}  wrote {a.written:>4}  "
            f"dupes {a.duplicates:>4}  pending {a.quarantined:>3}  invalid {a.invalid:>3}"
        )
        print(f"  {a.name:<24} {status}")
    if not result.adapters:
        print("  (no adapters found)")
    print(f"  {'TOTAL':<24} fetched {result.total_fetched:>4}  "
          f"wrote {result.total_written:>4}  dupes {result.total_duplicates:>4}  "
          f"pending {result.total_quarantined:>3}  invalid {result.total_invalid:>3}")
    if result.total_quarantined:
        print("  (pending = unanchored signals -> data/signals_pending.jsonl, "
              "await address/APN enrichment)")


def _print_enrich_summary(result) -> None:
    print("── enrich ──")
    if not result.resolvers:
        print("  (no resolvers found)")
    else:
        print(f"  resolvers: {', '.join(result.resolvers)}")
    print(f"  pending {result.pending_total:>3}  examined {result.examined:>3}  "
          f"resolved {result.resolved:>3}  ambiguous {result.ambiguous:>3}  "
          f"unmatched {result.unmatched:>3}  unresolvable +{result.newly_unresolvable}  "
          f"skipped {result.skipped:>3}")
    if result.duplicates:
        print(f"  ({result.duplicates} resolved signal(s) already in the ledger — "
              "idempotent re-run)")
    for name, err in result.resolver_errors.items():
        print(f"  [warn] resolver {name}: {err}", file=sys.stderr)


def cmd_run(args) -> int:
    paths = _paths(args)
    _apply_live(args)
    result = run_pipeline(
        paths=paths,
        buybox=_buybox(args),
        only_adapters=args.only or None,
    )
    _print_ingest_summary(result.ingest)
    if result.enrich is not None:
        _print_enrich_summary(result.enrich)
    print("── pipeline ──")
    counts = result.route_counts
    print(f"  candidates: {len(result.candidates)}  "
          + "  ".join(f"{k}: {v}" for k, v in sorted(counts.items())))
    print(f"  underwritten: {result.underwritten} (hot/warm got a strategy verdict)")
    print(f"  candidates -> {result.candidates_path}")
    print(f"  digest     -> {result.digest_path}")
    if result.ingest.failed_adapters:
        print(f"  [warn] failed adapters: {', '.join(result.ingest.failed_adapters)}",
              file=sys.stderr)
    return 0


def cmd_ingest(args) -> int:
    paths = _paths(args)
    _apply_live(args)
    result = run_ingest(paths.adapters_dir, paths.ledger, only=args.only or None)
    _print_ingest_summary(result)
    return 1 if result.failed_adapters and not result.adapters else 0


def cmd_enrich(args) -> int:
    paths = _paths(args)
    _apply_live(args)
    result = run_enrich(
        resolvers_dir=paths.resolvers_dir,
        pending_path=paths.pending,
        ledger_path=paths.ledger,
        only=args.only or None,
    )
    _print_enrich_summary(result)
    if result.resolved:
        print(f"  {result.resolved} enriched signal(s) -> {paths.ledger}")
        print("  (run `python cli.py run` to score + route them)")
    return 0


def cmd_underwrite(args) -> int:
    paths = _paths(args)
    candidates = load_candidates(paths.candidates)
    if not candidates:
        print(f"no candidates at {paths.candidates} — run `python cli.py run` first")
        return 1
    n = underwrite_candidates(candidates)
    write_candidates(candidates, paths.candidates)
    buybox = _buybox(args)
    write_digest(candidates, digest_dir=paths.data_dir, buybox_name=buybox.name)
    print(f"underwrote {n} hot/warm candidate(s) of {len(candidates)}")
    for c in candidates:
        if not c.underwriting:
            continue
        p = c.property
        addr = f"{p.address}, {p.city} {p.state}".strip().strip(",")
        print(f"  [{c.route:<4}] {addr}")
        print(f"         -> {c.underwriting['recommendation']}: "
              f"{top_reason(c.underwriting)}")
    print(f"  candidates -> {paths.candidates}")
    print(f"  digest     -> {paths.data_dir / 'digest-latest.md'}")
    return 0


def cmd_score(args) -> int:
    paths = _paths(args)
    signals = load_ledger_signals(paths.ledger)
    if not signals:
        print(f"ledger empty ({paths.ledger}) — run `python cli.py ingest` first")
        return 1
    buybox = _buybox(args)
    records = merge_signals(signals)
    rows = []
    for rec in records:
        total, breakdown = score_record(rec)
        criteria = buybox.evaluate(rec)
        rows.append((total, rec, breakdown, criteria))
    rows.sort(key=lambda r: -r[0])

    print(f"{len(signals)} signals -> {len(records)} properties\n")
    print(f"{'score':>6}  {'sig':>3}  {'box':<5} address")
    for total, rec, breakdown, criteria in rows[: args.top]:
        p = rec.property
        box = "MATCH" if criteria.matched else ("geo✗" if criteria.geo_missed else "miss")
        addr = f"{p.address}, {p.city} {p.state} {p.zip}".strip().strip(",")
        print(f"{total:>6.2f}  {rec.signal_count:>3}  {box:<5} {addr}")
        if args.explain:
            for key, why in breakdown.reasons.items():
                print(f"        · {why}")
            for m in criteria.misses:
                print(f"        ✗ {m}")
            for u in criteria.unknowns:
                print(f"        ? {u}")
    return 0


def cmd_digest(args) -> int:
    paths = _paths(args)
    candidates = load_candidates(paths.candidates)
    if not candidates:
        print(f"no candidates at {paths.candidates} — run `python cli.py run` first")
        return 1
    buybox = _buybox(args)
    out = write_digest(candidates, digest_dir=paths.data_dir, buybox_name=buybox.name)
    print(f"digest -> {out}")
    print(f"latest -> {paths.data_dir / 'digest-latest.md'}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dealflow-spine", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=str(ROOT / "config" / "buybox.json"),
                        help="buy-box config (.json, or .yaml if PyYAML installed)")
    parser.add_argument("--data-dir", default=str(ROOT / "data"))
    parser.add_argument("--adapters-dir", default=str(ROOT / "adapters"))
    parser.add_argument("--resolvers-dir", default=str(ROOT / "resolvers"))

    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="full pipeline on all adapters")
    p_run.add_argument("--only", nargs="*", help="restrict to these adapter module names")
    p_run.add_argument("--live", action="store_true",
                       help="enable network adapters (default: offline, bundled fixtures)")
    p_run.set_defaults(func=cmd_run)

    p_ing = sub.add_parser("ingest", help="ingest only (adapters -> signals ledger)")
    p_ing.add_argument("--only", nargs="*")
    p_ing.add_argument("--live", action="store_true",
                       help="enable network adapters (default: offline, bundled fixtures)")
    p_ing.set_defaults(func=cmd_ingest)

    p_enr = sub.add_parser("enrich",
                           help="resolve quarantined signals against parcel "
                                "resolvers (signals_pending.jsonl -> ledger)")
    p_enr.add_argument("--only", nargs="*",
                       help="restrict to these resolver names")
    p_enr.add_argument("--live", action="store_true",
                       help="enable live resolvers (default: offline, fixture "
                            "resolver only)")
    p_enr.set_defaults(func=cmd_enrich)

    p_uw = sub.add_parser("underwrite",
                          help="strategy-pick hot/warm candidates, rewrite snapshot + digest")
    p_uw.set_defaults(func=cmd_underwrite)

    p_score = sub.add_parser("score", help="merge + score the ledger, print ranking")
    p_score.add_argument("--top", type=int, default=25)
    p_score.add_argument("--explain", action="store_true",
                         help="print per-signal score reasons + criteria misses")
    p_score.set_defaults(func=cmd_score)

    p_dig = sub.add_parser("digest", help="re-render digest from candidates.jsonl")
    p_dig.set_defaults(func=cmd_digest)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
