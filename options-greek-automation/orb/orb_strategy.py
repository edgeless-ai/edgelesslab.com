"""Opening Range Breakout (ORB) engine — parameterized, spec-agnostic.

Canonical Crabel/textbook ORB: mark the high/low of the first N minutes after the open;
go long on a break above the range high, short on a break below the low; stop on the far
side of the range; target an R-multiple; flatten at the close. Every knob a saved
reel/screenshot might specify is a parameter here, so matching a specific spec is a config
change, not a rewrite.

⚠️ NO SPEC IS BAKED IN AS "VALIDATED". Defaults are the textbook version. If you have a
source (a reel, a book, Crabel's NR7/ORB), set the params to match it and SAY where they
came from. This module does not fabricate an edge — it runs whatever rules you give it on
whatever bars you feed it (see orb/data.py for the Alpaca + TradingView bar sources).
"""
from dataclasses import dataclass
from datetime import time
from typing import List, Optional


@dataclass
class OrbParams:
    range_minutes: int = 15           # opening-range window (reels often 5/15/30)
    bar_minutes: int = 5              # bar resolution the range is built from
    session_open: time = time(9, 30)  # US equities RTH open (exchange local time)
    session_close: time = time(16, 0)
    entry_buffer_pct: float = 0.0     # break must exceed range edge by this % (noise filter)
    stop: str = "opposite"           # "opposite" (other edge of range) | "range" (full width)
    target_r: float = 1.0             # take-profit as multiple of risk (range width by default)
    direction: str = "both"          # "both" | "long" | "short"
    one_trade_per_day: bool = True    # only the first breakout
    max_range_pct: Optional[float] = None  # skip days whose OR width > this % of price (Crabel: trade tight ranges)
    min_range_pct: Optional[float] = None  # skip days whose OR is too small to matter


@dataclass
class Bar:
    ts: str      # ISO timestamp (exchange local)
    o: float
    h: float
    l: float
    c: float
    v: float = 0.0


@dataclass
class Trade:
    date: str
    side: str          # long | short
    entry_ts: str
    entry: float
    stop_px: float
    target_px: float
    exit_ts: str
    exit: float
    reason: str        # target | stop | eod
    r_multiple: float
    ret_pct: float


def _in_session(b: Bar, p: OrbParams) -> bool:
    t = _bar_time(b)
    return p.session_open <= t < p.session_close


def _bar_time(b: Bar) -> time:
    hh, mm = b.ts[11:13], b.ts[14:16]
    return time(int(hh), int(mm))


def simulate_day(bars: List[Bar], p: OrbParams) -> Optional[Trade]:
    """Run ORB for a single day's intraday bars. Returns the trade taken, or None."""
    day = [b for b in bars if _in_session(b, p)]
    if not day:
        return None
    date = day[0].ts[:10]

    # opening range = bars within the first `range_minutes` of the open
    n_or_bars = max(1, p.range_minutes // p.bar_minutes)
    or_bars = day[:n_or_bars]
    if len(or_bars) < n_or_bars:
        return None
    or_high = max(b.h for b in or_bars)
    or_low = min(b.l for b in or_bars)
    or_width = or_high - or_low
    if or_width <= 0:
        return None
    mid = (or_high + or_low) / 2

    # range-width filters (Crabel: only trade contracted ranges)
    if p.max_range_pct is not None and or_width / mid * 100 > p.max_range_pct:
        return None
    if p.min_range_pct is not None and or_width / mid * 100 < p.min_range_pct:
        return None

    buf = mid * p.entry_buffer_pct / 100
    long_trigger = or_high + buf
    short_trigger = or_low - buf

    # scan post-range bars for the first breakout
    for b in day[n_or_bars:]:
        side = None
        if p.direction in ("both", "long") and b.h >= long_trigger:
            side = "long"
        elif p.direction in ("both", "short") and b.l <= short_trigger:
            side = "short"
        if not side:
            continue

        entry = long_trigger if side == "long" else short_trigger
        if side == "long":
            stop_px = or_low if p.stop == "opposite" else entry - or_width
            target_px = entry + p.target_r * (entry - stop_px)
        else:
            stop_px = or_high if p.stop == "opposite" else entry + or_width
            target_px = entry - p.target_r * (stop_px - entry)

        # walk forward from the breakout bar to resolve target/stop/eod
        idx = day.index(b)
        for fb in day[idx:]:
            hit_stop = fb.l <= stop_px if side == "long" else fb.h >= stop_px
            hit_tgt = fb.h >= target_px if side == "long" else fb.l <= target_px
            # conservative: if a bar spans both, assume stop first (worst case)
            if hit_stop:
                return _mk_trade(date, side, b.ts, entry, stop_px, target_px, fb.ts, stop_px, "stop")
            if hit_tgt:
                return _mk_trade(date, side, b.ts, entry, stop_px, target_px, fb.ts, target_px, "target")
        # never resolved → flatten at last bar's close (EOD)
        last = day[-1]
        return _mk_trade(date, side, b.ts, entry, stop_px, target_px, last.ts, last.c, "eod")

    return None  # no breakout all day


def _mk_trade(date, side, ets, entry, stop_px, target_px, xts, exit_px, reason) -> Trade:
    risk = abs(entry - stop_px)
    pnl = (exit_px - entry) if side == "long" else (entry - exit_px)
    return Trade(
        date=date, side=side, entry_ts=ets, entry=round(entry, 4), stop_px=round(stop_px, 4),
        target_px=round(target_px, 4), exit_ts=xts, exit=round(exit_px, 4), reason=reason,
        r_multiple=round(pnl / risk, 3) if risk else 0.0,
        ret_pct=round(pnl / entry * 100, 4),
    )


if __name__ == "__main__":
    # SYNTHETIC plumbing self-test (NOT a backtest, NOT results) — proves the state machine.
    p = OrbParams(range_minutes=15, bar_minutes=5, target_r=1.0)
    day = [
        Bar("2026-07-16T09:30", 100, 101, 99.5, 100.5),   # OR bar 1
        Bar("2026-07-16T09:35", 100.5, 101, 100, 100.8),  # OR bar 2
        Bar("2026-07-16T09:40", 100.8, 101, 100.4, 100.9),# OR bar 3 → OR high=101, low=99.5, width=1.5
        Bar("2026-07-16T09:45", 100.9, 101.6, 100.8, 101.5),  # breaks 101 → long, entry 101, stop 99.5, tgt 102.5
        Bar("2026-07-16T09:50", 101.5, 102.6, 101.4, 102.5),  # hits target 102.5
        Bar("2026-07-16T09:55", 102.5, 102.7, 102, 102.2),
    ]
    t = simulate_day(day, p)
    print("self-test trade:", t)
    assert t and t.side == "long" and t.reason == "target" and t.r_multiple == 1.0, "state machine broken"
    print("OK — ORB state machine works (synthetic; feed real bars via orb/data.py to backtest).")
