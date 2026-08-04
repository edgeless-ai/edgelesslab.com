"""Populate options_greek.db from the keyless CBOE snapshot store.

Uses CboeSnapshotClient (drop-in for the dead ConvexValue client) + the existing
ingest_underlying pipeline. This unblocks the previously-empty pipeline with REAL
options-chain data — no API key, offline, from the trading-os recorder store.

    python3.11 ingest/ingest_cboe.py [SYM ...]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from clients.cboe_snapshot_client import CboeSnapshotClient
from ingest.pipeline import ingest_underlying

# CBOE recorder captures SPY / QQQ / _SPX (not IWM). Default to the ETF pair.
DEFAULT_SYMBOLS = ["SPY", "QQQ"]


def main(symbols):
    client = CboeSnapshotClient()
    total = 0
    for sym in symbols:
        stats = ingest_underlying(client, sym)
        total += stats.get("rows", 0)
        print(f"  {sym}: rows={stats.get('rows')} spot={stats.get('spot')} "
              f"quality={stats.get('quality_passed')} err={stats.get('error')}")
    print(f"TOTAL rows ingested: {total}")


if __name__ == "__main__":
    main(sys.argv[1:] or DEFAULT_SYMBOLS)
