"""
SQLite engine with WAL mode for concurrent reads.
All tables are normalized for the options Greek automation pipeline.
"""
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Optional

DB_PATH = Path(__file__).parent / "data" / "options_greek.db"


def ensure_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH, check_same_thread=False) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA synchronous=NORMAL")
        _create_tables(conn)


def _create_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS underlying_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            spot_price REAL NOT NULL,
            snapshot_ts TEXT NOT NULL DEFAULT (datetime('now')),
            data_source TEXT DEFAULT 'convexvalue',
            UNIQUE(symbol, snapshot_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_underlying_symbol_ts ON underlying_snapshots(symbol, snapshot_ts);

        CREATE TABLE IF NOT EXISTS options_chain_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            underlying TEXT NOT NULL,
            ticker TEXT NOT NULL,
            contract_type TEXT NOT NULL,
            strike_price REAL NOT NULL,
            expiration_date TEXT NOT NULL,
            delta REAL,
            gamma REAL,
            theta REAL,
            vega REAL,
            implied_volatility REAL,
            open_interest INTEGER,
            day_volume INTEGER,
            bid REAL,
            ask REAL,
            midpoint REAL,
            snapshot_ts TEXT NOT NULL DEFAULT (datetime('now')),
            data_source TEXT DEFAULT 'convexvalue',
            data_quality_score REAL DEFAULT 1.0,
            UNIQUE(underlying, ticker, snapshot_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_chain_underlying_ts ON options_chain_snapshots(underlying, snapshot_ts);
        CREATE INDEX IF NOT EXISTS idx_chain_expiration ON options_chain_snapshots(expiration_date);

        CREATE TABLE IF NOT EXISTS greek_exposure (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            underlying TEXT NOT NULL,
            snapshot_ts TEXT NOT NULL,
            delta_pcr REAL,
            delta_net REAL,
            delta_dollar_net REAL,
            gamma_net REAL,
            gamma_dollar_net REAL,
            gamma_concentration_strike REAL,
            max_pain_strike REAL,
            vega_net REAL,
            vega_dollar_net REAL,
            vanna_net REAL,
            vanna_dollar_net REAL,
            iv_rank REAL,
            term_structure_slope REAL,
            UNIQUE(underlying, snapshot_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_exposure_underlying_ts ON greek_exposure(underlying, snapshot_ts);

        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            underlying TEXT NOT NULL,
            snapshot_ts TEXT NOT NULL,
            signal_type TEXT NOT NULL, -- LONG, SHORT, NEUTRAL
            confidence REAL NOT NULL,
            entry_level REAL,
            target_level REAL,
            stop_level REAL,
            expires_at TEXT NOT NULL, -- TTL: 2 snapshots = ~10 minutes
            status TEXT DEFAULT 'pending', -- pending, active, expired, rejected
            rejection_reason TEXT,
            regime TEXT, -- bull, bear, chop, high_vol, low_vol
            factors TEXT, -- JSON of factor scores
            narrative TEXT, -- human-readable explanation
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
        CREATE INDEX IF NOT EXISTS idx_signals_underlying ON signals(underlying, snapshot_ts);

        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_id INTEGER REFERENCES signals(id),
            underlying TEXT NOT NULL,
            contract_type TEXT NOT NULL,
            strike_price REAL NOT NULL,
            expiration_date TEXT NOT NULL,
            side TEXT NOT NULL, -- BUY, SELL
            qty INTEGER NOT NULL,
            entry_price REAL,
            exit_price REAL,
            realized_pnl REAL,
            unrealized_pnl REAL,
            status TEXT DEFAULT 'open', -- open, closed, rolled
            entry_ts TEXT,
            exit_ts TEXT,
            dte_at_entry INTEGER,
            max_pnl REAL,
            max_drawdown REAL,
            alpaca_order_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
        CREATE INDEX IF NOT EXISTS idx_trades_signal ON trades(signal_id);

        CREATE TABLE IF NOT EXISTS account_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            equity REAL,
            cash REAL,
            buying_power REAL,
            daily_realized_pnl REAL DEFAULT 0,
            daily_open_premium REAL DEFAULT 0,
            daily_trades_count INTEGER DEFAULT 0,
            max_drawdown_today REAL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_ts TEXT NOT NULL DEFAULT (datetime('now')),
            duration_ms INTEGER,
            underlyings_processed INTEGER,
            rows_ingested INTEGER,
            signals_generated INTEGER,
            trades_executed INTEGER,
            guard_rejections INTEGER,
            error TEXT,
            run_type TEXT DEFAULT 'scheduled' -- scheduled, manual, health
        );

        CREATE TABLE IF NOT EXISTS guard_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_ts TEXT NOT NULL,
            guard_name TEXT NOT NULL,
            triggered INTEGER DEFAULT 1,
            detail TEXT,
            signal_id INTEGER REFERENCES signals(id)
        );
        CREATE INDEX IF NOT EXISTS idx_guard_events_ts ON guard_events(run_ts);

        CREATE TABLE IF NOT EXISTS iv_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            underlying TEXT NOT NULL,
            expiration_date TEXT NOT NULL,
            strike_price REAL NOT NULL,
            implied_volatility REAL,
            snapshot_ts TEXT NOT NULL,
            UNIQUE(underlying, expiration_date, strike_price, snapshot_ts)
        );
        CREATE INDEX IF NOT EXISTS idx_iv_history ON iv_history(underlying, snapshot_ts);

        CREATE TABLE IF NOT EXISTS threshold_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            regime TEXT NOT NULL,
            delta_pcr_min REAL,
            delta_pcr_max REAL,
            gamma_proximity_threshold REAL,
            vanna_threshold REAL,
            confidence_min REAL,
            optimized_at TEXT NOT NULL DEFAULT (datetime('now')),
            profit_factor REAL,
            win_rate REAL,
            sample_size INTEGER,
            validated INTEGER DEFAULT 0
        );
    """)
    conn.commit()


@contextmanager
def get_conn():
    ensure_db()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


if __name__ == "__main__":
    ensure_db()
    print(f"✅ SQLite with WAL initialized at {DB_PATH}")
