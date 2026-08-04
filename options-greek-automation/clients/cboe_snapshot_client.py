"""CBOE-CDN snapshot client — a keyless, offline drop-in for ConvexValueClient.

Reads the daily CBOE option-chain snapshots that `trading-os` records
(projects/trading-os/data/gex-snapshots/<date>-<SYM>.json.gz) and returns them
in the SAME {params, chain} shape the ingest pipeline expects, so the empty
options-greek pipeline can be populated from REAL data with no API key and no
network. ConvexValue is dead (cvforge.app removed); this replaces it.

Snapshot format (per file): {"timestamp","symbol","data":{"options":[{option: OCC,
bid, ask, iv, open_interest, volume, delta, gamma, vega, theta, ...}]}}.
OCC symbol e.g. "SPY260715C00500000" = root + yymmdd expiry + C/P + strike*1000.
"""
import glob
import gzip
import json
import os
import re
from pathlib import Path
from statistics import median
from typing import Any, Dict, List, Optional

SNAPSHOT_DIR = Path(os.environ.get(
    "CBOE_SNAPSHOT_DIR",
    "/Users/djm/claude-projects/projects/trading-os/data/gex-snapshots",
))

# Field order MUST match ingest/pipeline.py GREEK_FIELDS.
FIELD_ORDER = [
    "delta", "gamma", "vega", "theta", "implied_volatility",
    "open_interest", "day_volume", "bid", "ask", "midpoint", "underlying_price",
]

_OCC = re.compile(r"^([A-Z]+)(\d{6})([CP])(\d{8})$")


def parse_occ(sym: str):
    """OCC symbol -> (root, 'YYYY-MM-DD' expiry, 'call'|'put', strike float) or None."""
    m = _OCC.match((sym or "").strip())
    if not m:
        return None
    root, ymd, cp, strike = m.groups()
    exp = f"20{ymd[0:2]}-{ymd[2:4]}-{ymd[4:6]}"
    return root, exp, ("call" if cp == "C" else "put"), int(strike) / 1000.0


class CboeSnapshotClient:
    def __init__(self, snapshot_dir: Optional[str] = None, date: Optional[str] = None):
        self.dir = Path(snapshot_dir or SNAPSHOT_DIR)
        self.date = date  # 'YYYY-MM-DD' or None = latest available
        self._spot_cache: Dict[str, Optional[float]] = {}

    def _symbol_file(self, symbol: str) -> Optional[Path]:
        s = "_SPX" if symbol.upper() in ("SPX", "_SPX") else symbol.upper()
        files = sorted(self.dir.glob(f"*-{s}.json.gz"))
        if self.date:
            files = [f for f in files if f.name.startswith(self.date)]
        return files[-1] if files else None

    def _load(self, symbol: str) -> dict:
        f = self._symbol_file(symbol)
        if not f:
            raise FileNotFoundError(f"no CBOE snapshot for {symbol} in {self.dir}")
        with gzip.open(f, "rt") as fh:
            return json.load(fh)

    @staticmethod
    def _mid(o: dict) -> float:
        b, a = o.get("bid") or 0, o.get("ask") or 0
        return (b + a) / 2 if (b and a) else 0.0

    def _compute_spot(self, grouped: Dict) -> Optional[float]:
        """Robust ATM put-call parity spot.

        parity: spot ~= strike + call_mid - put_mid. A single strike is noisy —
        one wide-spread or stale contract throws the estimate off (e.g. QQQ 745
        instead of 686). So: restrict to the FRONT expiration (parity holds best
        short-dated; longer expiries drift on dividends/early-exercise), take the
        strikes nearest the money (smallest |call_mid - put_mid|), and return the
        MEDIAN of their implied spots. Falls back to all expirations if the front
        one is too thin.
        """
        def candidates(exps):
            out = []
            for (exp, strike), sides in grouped.items():
                if exps is not None and exp not in exps:
                    continue
                c, p = sides.get("call"), sides.get("put")
                if not c or not p:
                    continue
                cm, pm = self._mid(c), self._mid(p)
                if cm <= 0 or pm <= 0:
                    continue
                out.append((abs(cm - pm), strike + cm - pm))
            out.sort(key=lambda x: x[0])  # nearest-the-money first
            return out

        all_exps = sorted({exp for exp, _ in grouped})
        front = {all_exps[0]} if all_exps else None
        cand = candidates(front)
        if len(cand) < 3:                       # front expiry too thin — widen
            cand = candidates(None)
        if not cand:
            return None
        near = [spot for _, spot in cand[:7]]   # up to 7 nearest-ATM strikes
        return round(median(near), 2)

    def get_chain(self, symbol: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        raw = self._load(symbol)
        opts = (raw.get("data") or {}).get("options", [])
        grouped: Dict = {}
        for o in opts:
            pc = parse_occ(o.get("option", ""))
            if not pc:
                continue
            _, exp, side, strike = pc
            grouped.setdefault((exp, strike), {})[side] = o
        spot = self._compute_spot(grouped)
        self._spot_cache[symbol.upper()] = spot

        by_exp: Dict[str, Dict[float, Dict]] = {}
        for (exp, strike), sides in grouped.items():
            by_exp.setdefault(exp, {})[strike] = sides

        def vals(o):
            if not o:
                return []
            return [
                o.get("delta"), o.get("gamma"), o.get("vega"), o.get("theta"),
                o.get("iv"), o.get("open_interest"), o.get("volume"),
                o.get("bid"), o.get("ask"), round(self._mid(o), 4), spot,
            ]

        chain = []
        for exp in sorted(by_exp):
            strikes = []
            for strike in sorted(by_exp[exp]):
                sides = by_exp[exp][strike]
                strikes.append([strike, vals(sides.get("call")), vals(sides.get("put"))])
            chain.append({"expiration": exp, "strikes": strikes})
        return {"params": FIELD_ORDER, "chain": chain}

    def query_sql(self, sql: str, max_rows: Optional[int] = None) -> Dict[str, Any]:
        """Only used by pipeline.fetch_underlying_spot — answer the spot query."""
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

    def __enter__(self) -> "CboeSnapshotClient":
        return self

    def __exit__(self, *args: Any) -> None:
        pass


if __name__ == "__main__":
    c = CboeSnapshotClient()
    for sym in ("SPY", "QQQ"):
        ch = c.get_chain(sym)
        n = sum(len(e["strikes"]) for e in ch["chain"])
        print(f"{sym}: spot={c._spot_cache[sym]} expirations={len(ch['chain'])} strikes={n}")
