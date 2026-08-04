"""
Ingestion pipeline: fetches options chains + spot prices, stores in SQLite.
Handles data quality gates and resilience.
"""
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from clients.convexvalue_client import ConvexValueClient
from ingest.resilience import CircuitBreaker, DataQualityGate, exponential_backoff_retry
from db.engine import get_conn

logger = logging.getLogger("ingest.pipeline")

# MVP underlyings
UNDERLYINGS = ["SPY", "QQQ", "IWM"]
GREEK_FIELDS = [
    "delta", "gamma", "vega", "theta",
    "implied_volatility", "open_interest", "day_volume",
    "bid", "ask", "midpoint", "underlying_price"
]


def fetch_underlying_spot(client: ConvexValueClient, symbol: str) -> Optional[float]:
    """Fetch spot price via SQL query (ConvexValue doesn't expose it directly)."""
    try:
        sql = f"SELECT DISTINCT underlying_price FROM options_snapshots WHERE underlying_ticker = '{symbol}' LIMIT 1"
        result = client.query_sql(sql)
        if result.get("rows"):
            return result["rows"][0].get("underlying_price")
    except Exception as e:
        logger.warning(f"Spot fetch failed for {symbol}: {e}")
    return None


def fetch_chain(client: ConvexValueClient, symbol: str, fields: List[str]) -> Dict[str, Any]:
    """Fetch full chain with retry logic."""
    return exponential_backoff_retry(
        lambda: client.get_chain(symbol, fields=fields),
        max_retries=3, base_delay=1.0
    )


def parse_chain(chain: dict, underlying: str, snapshot_ts: str,
                data_source: str = "convexvalue") -> List[Dict[str, Any]]:
    """Flatten the nested chain structure into rows for SQLite."""
    rows = []
    params = chain.get("params", [])
    field_index = {name: i for i, name in enumerate(params)}

    for expiration in chain.get("chain", []):
        exp_date = expiration.get("expiration")
        for strike_data in expiration.get("strikes", []):
            strike = strike_data[0]
            for side_idx, side_name in [(1, "call"), (2, "put")]:
                values = strike_data[side_idx]
                if not values:
                    continue
                # Synthesize the OCC-style contract ticker (was None → NOT NULL fail).
                _cp = "C" if side_name == "call" else "P"
                _ymd = f"{exp_date[2:4]}{exp_date[5:7]}{exp_date[8:10]}" if exp_date else "000000"
                _occ = f"{underlying}{_ymd}{_cp}{int(round(float(strike) * 1000)):08d}"
                row = {
                    "underlying": underlying,
                    "ticker": _occ,
                    "contract_type": side_name,
                    "strike_price": strike,
                    "expiration_date": exp_date,
                    "snapshot_ts": snapshot_ts,
                    "data_source": data_source,
                }
                for field in GREEK_FIELDS:
                    idx = field_index.get(field)
                    if idx is not None and values and idx < len(values):
                        row[field] = values[idx]
                    else:
                        row[field] = None
                rows.append(row)
    return rows


def ingest_underlying(client: ConvexValueClient, symbol: str,
                      snapshot_ts: Optional[str] = None,
                      data_source: str = "convexvalue") -> Dict[str, Any]:
    """Fetch and store one underlying's chain. Returns stats.

    snapshot_ts: the OBSERVATION timestamp to stamp rows with. Defaults to now()
    for the live daily run; a backfill MUST pass the snapshot's real date so
    lookahead-free ordering is preserved (never ingest-time for historical data).
    data_source: provenance stamp on every row ("convexvalue" for CBOE snapshots,
    "schwab" for live Schwab chains) so sources coexist and stay distinguishable.
    """
    if snapshot_ts is None:
        snapshot_ts = datetime.now(timezone.utc).isoformat()
    breaker = CircuitBreaker()
    gate = DataQualityGate()

    stats = {"symbol": symbol, "rows": 0, "spot": None, "quality_passed": False, "error": None}

    try:
        # Fetch spot
        spot = fetch_underlying_spot(client, symbol)
        stats["spot"] = spot
        if spot:
            with get_conn() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO underlying_snapshots (symbol, spot_price, snapshot_ts, data_source) VALUES (?, ?, ?, ?)",
                    (symbol, spot, snapshot_ts, data_source)
                )
                conn.commit()

        # Fetch chain
        chain = breaker.call(fetch_chain, client, symbol, GREEK_FIELDS)
        passed, reason = gate.check_chain(chain, GREEK_FIELDS)
        stats["quality_passed"] = passed

        if not passed:
            stats["error"] = f"Data quality gate: {reason}"
            logger.warning(f"{symbol}: {reason}")
            return stats

        # Store chain
        rows = parse_chain(chain, symbol, snapshot_ts, data_source)
        with get_conn() as conn:
            for row in rows:
                conn.execute("""
                    INSERT OR REPLACE INTO options_chain_snapshots
                    (underlying, ticker, contract_type, strike_price, expiration_date,
                     delta, gamma, theta, vega, implied_volatility, open_interest, day_volume,
                     bid, ask, midpoint, snapshot_ts, data_source, data_quality_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    row["underlying"], row["ticker"], row["contract_type"], row["strike_price"], row["expiration_date"],
                    row.get("delta"), row.get("gamma"), row.get("theta"), row.get("vega"), row.get("implied_volatility"),
                    row.get("open_interest"), row.get("day_volume"), row.get("bid"), row.get("ask"), row.get("midpoint"),
                    row["snapshot_ts"], row["data_source"], 1.0 if passed else 0.5
                ))
            conn.commit()

        stats["rows"] = len(rows)
        logger.info(f"Ingested {symbol}: {len(rows)} rows, spot={spot}")

    except Exception as e:
        stats["error"] = str(e)
        logger.error(f"Ingestion failed for {symbol}: {e}")

    return stats


def ingest_all() -> List[Dict[str, Any]]:
    """Fetch all underlyings. Returns list of per-symbol stats."""
    results = []
    with ConvexValueClient() as client:
        for symbol in UNDERLYINGS:
            try:
                stats = ingest_underlying(client, symbol)
                results.append(stats)
            except Exception as e:
                results.append({"symbol": symbol, "error": str(e)})
    return results


if __name__ == "__main__":
    results = ingest_all()
    print(json.dumps(results, indent=2, default=str))
