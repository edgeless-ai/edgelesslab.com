"""Schwab live-chain client — a DATA-ONLY drop-in for the ingest pipeline.

Emits the SAME {params, chain} shape as CboeSnapshotClient, so Schwab real-time
chains (real Greeks, live NBBO, real underlying mark) flow through the existing
ingest → analytics → strategy path with data_source="schwab". Coexists with the
CBOE snapshots (per-row data_source stamp) rather than replacing them.

SAFETY — this account holds REAL money. This client touches ONLY market-data
endpoints (option chain). It never reads balances/positions and NEVER places or
cancels an order. There is no order method here by design; live execution stays
paper-only elsewhere.

Auth is delegated to the proven stockpile helper (schwab-py OAuth + token
refresh); we do not reinvent it. The one-time browser OAuth is David's to run
(`options-scanner/schwab_auth.py`); after that the refresh token lasts 7 days.
"""
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Field order MUST match ingest/pipeline.py GREEK_FIELDS / CboeSnapshotClient.
FIELD_ORDER = [
    "delta", "gamma", "vega", "theta", "implied_volatility",
    "open_interest", "day_volume", "bid", "ask", "midpoint", "underlying_price",
]

# schwab-py's sentinel for "no value" on greeks/vol.
_MISSING = -999.0

# stockpile's shared package (schwab-py auth + raw chain fetch).
_STOCKPILE_SHARED = Path(
    "/Users/djm/claude-projects/github-repos/stockpile/shared"
)


def _clean(x: Any) -> Optional[float]:
    """Schwab uses -999.0 for missing greeks/vol; map to None."""
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return None if v == _MISSING else v


def schwab_chain_to_pipeline(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Transform a raw schwab-py get_option_chain() response into {params, chain}.

    Schwab shape: {"underlyingPrice": float, "callExpDateMap"/"putExpDateMap":
    {"YYYY-MM-DD:DTE": {"<strike>": [ {delta,gamma,theta,vega,volatility(%),
    bid,ask,mark,openInterest,totalVolume,...} ]}}}. Pure function — no network,
    unit-testable offline.
    """
    spot = _clean(raw.get("underlyingPrice"))

    def vals(o: Optional[Dict[str, Any]]) -> List:
        if not o:
            return []
        vol = _clean(o.get("volatility"))
        return [
            _clean(o.get("delta")), _clean(o.get("gamma")),
            _clean(o.get("vega")), _clean(o.get("theta")),
            vol / 100.0 if vol is not None else None,   # % -> decimal (match CBOE)
            o.get("openInterest"), o.get("totalVolume"),
            o.get("bid"), o.get("ask"), _clean(o.get("mark")), spot,
        ]

    # expiration -> strike -> {"call"/"put": option}
    by_exp: Dict[str, Dict[float, Dict[str, Dict]]] = {}
    for side, key in (("call", "callExpDateMap"), ("put", "putExpDateMap")):
        for exp_dte, strikes in (raw.get(key) or {}).items():
            exp = exp_dte.split(":", 1)[0]              # "2026-08-01:1" -> date
            for strike_str, contracts in strikes.items():
                if not contracts:
                    continue
                strike = float(strike_str)
                by_exp.setdefault(exp, {}).setdefault(strike, {})[side] = contracts[0]

    chain = []
    for exp in sorted(by_exp):
        strikes = []
        for strike in sorted(by_exp[exp]):
            sides = by_exp[exp][strike]
            strikes.append([strike, vals(sides.get("call")), vals(sides.get("put"))])
        chain.append({"expiration": exp, "strikes": strikes})
    return {"params": FIELD_ORDER, "chain": chain, "spot": spot}


class SchwabSnapshotClient:
    """DATA-ONLY Schwab chain client; drop-in for ingest_underlying().

    Reuses stockpile's stocks_shared.schwab_live for auth + raw chain fetch, then
    runs schwab_chain_to_pipeline(). No orders, no account reads — market data only.
    """

    def __init__(self, config_path: Optional[str] = None,
                 min_dte: int = 0, max_dte: Optional[int] = 400):
        self.config_path = config_path or str(
            _STOCKPILE_SHARED.parent / "options-scanner" / "config.toml"
        )
        self.min_dte = min_dte
        self.max_dte = max_dte
        self._spot_cache: Dict[str, Optional[float]] = {}
        self._client = None

    def _ensure_paths(self) -> None:
        """Put stockpile's shared package + config module on sys.path (idempotent)."""
        for p in (str(_STOCKPILE_SHARED), str(Path(self.config_path).parent / "src")):
            if p not in sys.path:
                sys.path.insert(0, p)

    def _schwab(self):
        """Lazily build the authenticated schwab-py client via stockpile helper."""
        if self._client is not None:
            return self._client
        if not Path(self.config_path).exists():
            raise RuntimeError(
                f"Schwab not configured: {self.config_path} is missing. Copy "
                "options-scanner/config.toml.example to it, fill app_key/app_secret, "
                "then run `uv run options-scanner/schwab_auth.py` once (browser OAuth)."
            )
        self._ensure_paths()
        from config import load_config, get_schwab_config  # stockpile src/config.py
        from stocks_shared.schwab_live import get_client

        cfg = get_schwab_config(load_config(self.config_path))
        if not cfg.get("app_key") or cfg["app_key"].startswith("your-"):
            raise RuntimeError(
                "Schwab not configured. Fill app_key/app_secret in "
                f"{self.config_path} and run options-scanner/schwab_auth.py once."
            )
        self._client = get_client(
            cfg["app_key"], cfg["app_secret"], cfg["callback_url"], cfg["token_file"]
        )
        return self._client

    def get_chain(self, symbol: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        client = self._schwab()            # builds client + sets sys.path first
        from stocks_shared.schwab_live import fetch_option_chain_raw
        raw = fetch_option_chain_raw(client, symbol, self.min_dte, self.max_dte)
        if not raw:
            raise RuntimeError(f"no Schwab chain for {symbol} (auth expired? re-run schwab_auth.py)")
        out = schwab_chain_to_pipeline(raw)
        self._spot_cache[symbol.upper()] = out.get("spot")
        return {"params": out["params"], "chain": out["chain"]}

    def query_sql(self, sql: str, max_rows: Optional[int] = None) -> Dict[str, Any]:
        """Answer pipeline.fetch_underlying_spot's spot query (same as CBOE client)."""
        m = re.search(r"underlying_ticker\s*=\s*'([^']+)'", sql or "")
        sym = (m.group(1) if m else "").upper()
        spot = self._spot_cache.get(sym)
        if spot is None:
            try:
                self.get_chain(sym)
            except Exception:
                pass
            spot = self._spot_cache.get(sym)
        return {"rows": ([{"underlying_price": spot}] if spot else [])}

    def close(self) -> None:
        pass

    def __enter__(self) -> "SchwabSnapshotClient":
        return self

    def __exit__(self, *args: Any) -> None:
        pass


if __name__ == "__main__":
    # Offline self-test of the transform (no creds, no network).
    sample = {
        "underlyingPrice": 743.20,
        "callExpDateMap": {
            "2026-08-01:1": {
                "743.0": [{"putCall": "CALL", "strikePrice": 743.0, "bid": 3.1,
                           "ask": 3.3, "mark": 3.2, "delta": 0.53, "gamma": 0.06,
                           "vega": 0.15, "theta": -2.1, "volatility": 15.9,
                           "openInterest": 1200, "totalVolume": 340}],
            }
        },
        "putExpDateMap": {
            "2026-08-01:1": {
                "743.0": [{"putCall": "PUT", "strikePrice": 743.0, "bid": 3.0,
                           "ask": 3.2, "mark": 3.1, "delta": -0.47, "gamma": 0.06,
                           "vega": 0.15, "theta": -2.1, "volatility": 16.0,
                           "openInterest": 900, "totalVolume": 210,
                           "vol_missing_demo": _MISSING}],
            }
        },
    }
    out = schwab_chain_to_pipeline(sample)
    assert out["spot"] == 743.20, out["spot"]
    assert out["params"] == FIELD_ORDER
    exp = out["chain"][0]
    assert exp["expiration"] == "2026-08-01", exp["expiration"]
    strike, call_vals, put_vals = exp["strikes"][0]
    assert strike == 743.0
    # implied_volatility index 4: 15.9% -> 0.159 decimal (matches CBOE convention)
    assert abs(call_vals[4] - 0.159) < 1e-9, call_vals[4]
    assert call_vals[10] == 743.20                       # underlying_price
    assert call_vals[9] == 3.2                           # midpoint (mark)
    print("schwab_chain_to_pipeline self-test PASSED")
    print(f"  spot={out['spot']} call_vals={call_vals}")
    print(f"  put_vals={put_vals}")
