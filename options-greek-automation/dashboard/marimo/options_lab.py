import marimo

__generated_with = "0.6.13"
app = marimo.App(width="medium")


@app.cell
def __():
    import marimo as mo
    import numpy as np
    import pandas as pd
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.subplots import make_subplots
    import sqlite3
    from pathlib import Path
    from datetime import datetime, timedelta
    return go, make_subplots, mo, np, pd, px, sqlite3, timedelta, Path, datetime


@app.cell
def __(mo):
    # Control panel
    underlying = mo.ui.dropdown(
        options=["SPY", "QQQ", "IWM"],
        value="SPY",
        label="Underlying",
    )
    refresh = mo.ui.button(label="Refresh Data", kind="warn")
    mo.hstack([underlying, refresh])
    return refresh, underlying


@app.cell
def __(Path, sqlite3):
    DB_PATH = Path("~/Codex-projects/options-greek-automation/db/data/options_greek.db").expanduser()
    def get_conn():
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn
    return DB_PATH, get_conn


@app.cell
def __(get_conn, pd):
    # Load latest exposure data
    def load_exposure():
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM greek_exposure
                ORDER BY snapshot_ts DESC
                LIMIT 10
            """).fetchall()
        return pd.DataFrame([dict(r) for r in rows])
    return load_exposure,


@app.cell
def __(get_conn, pd):
    # Load latest signals
    def load_signals():
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM signals
                WHERE status = 'active'
                ORDER BY created_at DESC
                LIMIT 10
            """).fetchall()
        return pd.DataFrame([dict(r) for r in rows])
    return load_signals,


@app.cell
def __(load_exposure, underlying):
    # Exposure overview
    df = load_exposure()
    if not df.empty:
        latest = df[df['underlying'] == underlying.value].iloc[0]
        metrics = {
            'Delta PCR': latest['delta_pcr'],
            'Gamma Net ($M)': latest['gamma_dollar_net'] / 1e6,
            'Vanna Net ($K)': latest['vanna_dollar_net'] / 1e3,
            'Vega Net ($K)': latest['vega_dollar_net'] / 1e3,
            'IV Rank': latest['iv_rank'] * 100,
        }
    else:
        metrics = {}
    return latest, metrics


@app.cell
def __(metrics, mo):
    # Metrics display
    cards = []
    for name, value in metrics.items():
        cards.append(mo.md(f"**{name}**: {value:.2f}"))
    mo.hstack(cards)
    return cards,


@app.cell
def __(get_conn, go, make_subplots, px, underlying):
    # Greeks surface: strike x expiration x IV
    def plot_greeks_surface():
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT strike_price, expiration_date, delta, gamma, implied_volatility
                FROM options_chain_snapshots
                WHERE underlying = ? AND snapshot_ts = (
                    SELECT MAX(snapshot_ts) FROM options_chain_snapshots WHERE underlying = ?
                )
                AND contract_type = 'call'
                ORDER BY expiration_date, strike_price
            """, (underlying.value, underlying.value)).fetchall()

        df = pd.DataFrame([dict(r) for r in rows])
        if df.empty:
            return go.Figure()

        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('IV Surface', 'Delta Surface', 'Gamma Surface', 'Vanna Surface'),
            specs=[[{'type': 'surface'}, {'type': 'surface'}],
                   [{'type': 'surface'}, {'type': 'surface'}]]
        )

        # IV Surface
        pivot_iv = df.pivot(index='strike_price', columns='expiration_date', values='implied_volatility')
        fig.add_trace(
            go.Surface(z=pivot_iv.values, x=pivot_iv.columns, y=pivot_iv.index, colorscale='Viridis', name='IV'),
            row=1, col=1
        )

        # Delta Surface
        pivot_d = df.pivot(index='strike_price', columns='expiration_date', values='delta')
        fig.add_trace(
            go.Surface(z=pivot_d.values, x=pivot_d.columns, y=pivot_d.index, colorscale='RdYlBu', name='Delta'),
            row=1, col=2
        )

        # Gamma Surface
        pivot_g = df.pivot(index='strike_price', columns='expiration_date', values='gamma')
        fig.add_trace(
            go.Surface(z=pivot_g.values, x=pivot_g.columns, y=pivot_g.index, colorscale='Plasma', name='Gamma'),
            row=2, col=1
        )

        fig.update_layout(height=800, title_text=f"Greeks Surface — {underlying.value}")
        return fig

    return plot_greeks_surface,


@app.cell
def __(plot_greeks_surface, refresh):
    # Render surface
    refresh.value
    fig = plot_greeks_surface()
    fig
    return fig,


@app.cell
def __(get_conn, go, underlying):
    # GEX by strike (dealer convention)
    def plot_gex():
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT strike_price,
                    SUM(CASE WHEN contract_type='call' THEN gamma * open_interest * 100 ELSE 0 END) as call_gex,
                    SUM(CASE WHEN contract_type='put' THEN -gamma * open_interest * 100 ELSE 0 END) as put_gex
                FROM options_chain_snapshots
                WHERE underlying = ? AND snapshot_ts = (
                    SELECT MAX(snapshot_ts) FROM options_chain_snapshots WHERE underlying = ?
                )
                GROUP BY strike_price
                ORDER BY strike_price
            """, (underlying.value, underlying.value)).fetchall()

        df = pd.DataFrame([dict(r) for r in rows])
        if df.empty:
            return go.Figure()

        fig = go.Figure()
        fig.add_trace(go.Bar(x=df['strike_price'], y=df['call_gex'], name='Call GEX', marker_color='green'))
        fig.add_trace(go.Bar(x=df['strike_price'], y=df['put_gex'], name='Put GEX', marker_color='red'))
        fig.add_trace(go.Scatter(x=df['strike_price'], y=df['call_gex'] + df['put_gex'], 
                                   name='Net GEX', line=dict(color='yellow', width=2)))
        fig.update_layout(
            title=f"Gamma Exposure by Strike — {underlying.value}",
            xaxis_title="Strike Price",
            yaxis_title="GEX ($ per 1% move)",
            barmode='relative',
            height=500
        )
        return fig
    return plot_gex,


@app.cell
def __(plot_gex, refresh):
    refresh.value
    fig = plot_gex()
    fig
    return fig,


@app.cell
def __(load_signals, mo, px):
    # Signal feed
    signals = load_signals()
    if not signals.empty:
        for _, s in signals.iterrows():
            color = "green" if s['signal_type'] == 'LONG' else "red"
            mo.callout(
                mo.md(f"**{s['underlying']} {s['signal_type']}** — Confidence: {s['confidence']:.0%}<br>{s['narrative']}"),
                kind="success" if s['signal_type'] == 'LONG' else "danger"
            )
    else:
        mo.md("*No active signals*")
    return signals,


@app.cell
def __(get_conn, go, pd):
    # Live P&L chart
    def plot_pnl():
        with get_conn() as conn:
            rows = conn.execute("""
                SELECT date, equity, daily_realized_pnl
                FROM account_state
                ORDER BY date
            """).fetchall()
        df = pd.DataFrame([dict(r) for r in rows])
        if df.empty:
            return go.Figure()

        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df['date'], y=df['equity'], name='Equity', line=dict(color='white')))
        fig.add_trace(go.Bar(x=df['date'], y=df['daily_realized_pnl'], name='Daily P&L', 
                             marker_color=['green' if x > 0 else 'red' for x in df['daily_realized_pnl']]))
        fig.update_layout(title="Account Equity & Daily P&L", height=400)
        return fig
    return plot_pnl,


@app.cell
def __(plot_pnl):
    fig = plot_pnl()
    fig
    return fig,


@app.cell
def __(mo):
    mo.md("""
    # Edgeless Options Greek Lab

    This Marimo notebook provides real-time analysis of options Greeks and exposure.

    ## Features
    - **Greeks Surface**: 3D visualization of Delta, Gamma, IV across strikes and expirations
    - **GEX Chart**: Dealer gamma exposure by strike (support/resistance levels)
    - **Signal Feed**: Active trading signals with confidence scores
    - **P&L Tracker**: Account equity and daily realized P&L

    ## Data Source
    - ConvexValue API (real-time options chains + Greeks)
    - SQLite database with WAL mode

    ## Controls
    - Select underlying from dropdown
    - Click "Refresh Data" to reload from database
    """
    )
    return


if __name__ == "__main__":
    app.run()
