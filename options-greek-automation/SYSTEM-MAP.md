# Trading System Map

Two directories, one system, bridged by a real-chain data layer (reconciled 2026-07-15).

```
projects/trading-os/            DATA PLANT (market data recorders)
  data/gex-snapshots/*.json.gz    CBOE keyless options-chain snapshots (SPY/QQQ/SPX), daily via launchd
  scripts/gex_snapshot.py         the recorder (self-locating path; fixed this session)
        │
        │  clients/cboe_snapshot_client.py  ← BRIDGE: reads the gz snapshots, parses OCC symbols,
        │                                      computes spot via ATM put-call parity, emits the
        ▼                                      {params, chain} shape the pipeline expects
options-greek-automation/       STRATEGY / ANALYTICS ENGINE
  ingest/ingest_cboe.py           loads snapshots → options_greek.db (25,260 real rows)
  ingest/pipeline.py              parse_chain (synthesizes OCC ticker)
  db/ options_greek.db            options_chain_snapshots, underlying_snapshots, signals,
                                    backtest_results, vrp_backtest_results
  analytics/exposure.py           GEX / max-pain / delta-PCR (validated on real data)
  strategy/
    reel_strategy.py              Instagram Δ/Γ/vanna directional signal — NO EDGE (25% hit backtest)
    vrp_strategy.py               put-credit-spread income (grounded; real bid/ask credits; IV-rank gate)
    pmcc_strategy.py              RUNE-validated PMCC selector on real chains (debit-gate finding)
  backtest/
    backtest_reel.py              directional forward-return backtest
    backtest_vrp.py               credit-spread MTM backtest (correct income P&L, real later prices)
  reporting/tearsheet.py          hedge-fund metrics on the REAL track record → reports/trading-tearsheet.md
  clients/schwab_snapshot_client.py  Schwab LIVE chains → pipeline shape (DATA-ONLY, no orders;
                                    real Greeks + live NBBO + real mark). data_source="schwab"
  ingest/ingest_schwab.py         ingest live Schwab chains (gated on David's one-time OAuth)
  execution/alpaca_client.py      paper execution — BLOCKED (401, needs David's keys)
  clients/schwab_client.py        older exec client — place_order HARD-GUARDED (real-money acct)
  orb/                            Opening Range Breakout (intraday equity — separate lane)
    orb_strategy.py               parameterized ORB state machine (verified on self-test)
    data.py                       dual-source bar store: Alpaca market-data + TradingView CSV
    backtest_orb.py               backtest over real bars (refuses to fabricate when empty)
    README.md                     spec = canonical Crabel pending David's reel; bar store empty
```

Pipeline: **ingest → analytics → strategy → signal → backtest → tearsheet**, end-to-end on real chains.

## Run it
```bash
V=/opt/homebrew/opt/python@3.11/bin/python3.11
$V ingest/ingest_cboe.py            # refresh db from latest snapshots
$V backtest/backtest_vrp.py         # VRP income backtest
$V strategy/pmcc_strategy.py        # PMCC real-chain selection
$V reporting/tearsheet.py           # regenerate the tearsheet
```

## Honest state (see reports/trading-strategy-reconciliation.md)
No fundable edge demonstrated. Reel = negative. VRP = regime-flattered, tail unmeasured. PMCC = validated only on synthetic IV, and its shipped debit-gate fails on real prices. Gate to "fundable": real-chain PMCC + accumulated IV-rank history + a sample containing a drawdown + explicit tail modeling. **Paper only.**
