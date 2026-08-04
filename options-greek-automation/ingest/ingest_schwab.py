"""Populate options_greek.db from LIVE Schwab option chains (data_source="schwab").

Real-time chains with real Greeks + live NBBO + real underlying mark — strictly
better than the CBOE parity snapshots, and stamped data_source="schwab" so both
coexist in the db. DATA ONLY: no account reads, no orders (the Schwab account
holds real money — see clients/schwab_snapshot_client.py).

Prereq (one-time, David-gated): fill app_key/app_secret in
github-repos/stockpile/options-scanner/config.toml, then run
`uv run options-scanner/schwab_auth.py` once (browser OAuth). Refresh token
lasts 7 days; re-run when it expires.

    python3.11 ingest/ingest_schwab.py [SYM ...]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from clients.schwab_snapshot_client import SchwabSnapshotClient
from ingest.pipeline import ingest_underlying

DEFAULT_SYMBOLS = ["SPY", "QQQ"]


def main(symbols):
    client = SchwabSnapshotClient()
    total = 0
    for sym in symbols:
        stats = ingest_underlying(client, sym, data_source="schwab")
        total += stats.get("rows", 0)
        print(f"  {sym}: rows={stats.get('rows')} spot={stats.get('spot')} "
              f"quality={stats.get('quality_passed')} err={stats.get('error')}")
    print(f"TOTAL Schwab rows ingested: {total}")


if __name__ == "__main__":
    main(sys.argv[1:] or DEFAULT_SYMBOLS)
