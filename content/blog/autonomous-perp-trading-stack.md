---
slug: autonomous-perp-trading-stack
title: 'Building the Autonomous Perp Trading Stack: From Instagram Reels to Production
  Code'
description: 'How the Edgeless swarm turned quant theory into executable trading infrastructure
  in one afternoon: six new production modules, a Neural CDE upgrade, Kalman filters,
  and OU mean-reversion scanners.'
date: '2026-06-02'
tags:
- Quantitative Trading
- AI Agents
- Crypto
- Machine Learning
- Python
- Hyperliquid
readTime: 18 min
editorial: true
---

# Building the Autonomous Perp Trading Stack: From Instagram Reels to Production Code

*How the Edgeless swarm turned quant theory into executable trading infrastructure in one afternoon.*

---

## The Premise

Most trading systems fail not because the idea is wrong, but because the gap between "interesting idea" and "running code" is too wide. The Edgeless swarm (Paperclip) is designed to close that gap — [the goal loops that drive the swarm](/blog/multi-agent-goal-loops-theory-and-practice/) exist for exactly this kind of theory-to-code work. This post documents what we built in a single session, starting from two Instagram reels and ending with six new production modules wired into our Hyperliquid paper trading pipeline.

The goal: build an autonomous, multi-strategy trading system that generates consistent risk-adjusted returns by combining multiple edge sources with a strict paper-to-live graduation path. No live capital until the paper track record proves Sharpe > 0.3, drawdown < 25%, and win rate > 40%.

---

## Part 1: Upgrading the Brain — Neural CDE v2

Our regime detector previously used a Hidden Markov Model (HMM) to classify market states into chop, trend, or reversal. HMMs are fine, but they have a critical flaw: they assume discrete time steps and Gaussian emissions. Funding rates arrive at irregular intervals. Price action is continuous. The HMM approximates this poorly.

We replaced it with a **Neural Controlled Differential Equation (CDE)**.

### Why CDEs?

Unlike RNNs or HMMs, CDEs handle continuous-time dynamics natively. They process an irregular sequence of observations by evolving a hidden state along a continuous path. The math is elegant: the hidden state is the solution to a differential equation driven by the input path.

### v2 Training

The v2 model was trained on 8 coins (BTC, ETH, HYPE, SOL, DOGE, AVAX, LINK, UNI) with:

- **30-day lookback** (720 hours)
- **Real funding history** via Hyperliquid's fundingHistory API (no more zero-filled funding)
- **6 features**: returns, volatility, funding rate, volume trend, range percentage, and open interest
- **Hidden dimension 64** (up from 32 in v1)
- **Inverse-frequency class weighting** and **label smoothing** to handle the class imbalance (chop 41%, trend 26%, reversal 33%)
- **300 epochs** with early stopping at patience 30

Training completed at epoch 56. Best validation loss: 1.0566 at epoch 26.

### Evaluation Results

On a held-out test set (168 hours, 992 labeled sequences):

| Metric | CDE v2 | HMM | Winner |
|--------|--------|-----|--------|
| **Overall accuracy** | **40.9%** | 31.1% | **CDE** |
| Chop F1 | **0.501** | 0.304 | **CDE** |
| Trend F1 | 0.187 | **0.412** | **HMM** |
| Reversal F1 | **0.407** | 0.035 | **CDE** |
| Macro F1 | **0.365** | 0.250 | **CDE** |

CDE wins 6/8 per-coin comparisons. The only losses are DOGE and HYPE — both memecoins with erratic funding patterns that break the smoothness assumptions CDEs depend on.

The HMM is retained as a fallback if the CDE checkpoint is missing. They never run simultaneously to prevent double-counting in the fusion engine.

---

## Part 2: Instagram Reels → Production Code

This is [our paper-to-code pipeline](/blog/arxiv-to-interactive-demo-marimo/) pointed at a different source: extract the concept, build the module, wire it in.

### Reel 1: macro_quant_rick — Momentum Theory, 200 MA, RAAM, Trend Efficiency

This reel covered four concepts used by institutional quants. We mapped three of them to concrete scanner modules.

#### 1. 200 MA Circuit Breaker

We implemented this as a **hard gate in the signal validator**. Before any signal enters the paper engine:

- Long signals are **rejected** if price is >2% below the 200 MA
- Short signals are **rejected** if price is >2% above the 200 MA

This is not a timing signal — it’s a **filter**. It prevents the funding wheel from shorting BTC at $60k when the 200 MA is at $75k and the trend is clearly up.

#### 2. Trend Efficiency Metric

The reel defined trend efficiency as: net_move / total_path over N bars.

- Near 1.0 = clean, directional trend (easy to trade)
- Near 0.0 = pure noise / chop (whipsaw city)

We implemented this as a **signal quality filter** alongside the 200 MA gate:

- **Efficiency < 0.30** → **reject** (too noisy)
- **Efficiency > 0.70** → **boost confidence** (clean trend)

The CDE regime detector can label a coin as "trending" while the actual price action is 60% noise. The efficiency filter catches this mismatch.

#### 3. Cross-Sectional Ranker (RAAM-inspired)

We built a cross-sectional ranker that ranks the entire universe by composite score:

    score = momentum_rank * 0.40 + (1/volatility)_rank * 0.30 + |funding_z|_rank * 0.30

Only the **top 10** coins by composite score generate signals. Three additional gates enforce discipline:
- Efficiency < 0.30 → skip
- MA distance wrong sign for direction → skip
- Minimum $10M open interest → skip

---

### Reel 2: vince.quant — Ornstein-Uhlenbeck Mean Reversion

This reel covered the OU process: dX(t) = θ(μ - X(t))dt + σdW(t).

Funding rates are mean-reverting. The OU process models exactly how fast they snap back. We mapped this to three production modules.

#### 1. OU Regression Scanner

Fits the OU process to each coin’s funding rate history and generates signals when:

- |z-score| > 2.0 (far from OU equilibrium)
- Half-life between 2h and 24h (fast enough to trade, not so fast it’s noise)

The signal includes full metadata: θ, μ, σ, half-life, z-score. The time horizon is set to 2 * half_life — roughly the time to expect 75% mean reversion.

#### 2. Kalman Filter for Adaptive Z-Scores

The rolling window in the funding wheel had a weakness: it treats a 10-day-old funding rate as equally relevant as yesterday’s. In reality, funding regimes shift.

We replaced the rolling window with a **Kalman filter**:

- State: the "true" funding rate
- Observation: the noisy funding rate measurement
- Process variance Q = 1e-8 (slow drift)
- Measurement variance R = 5e-6 (noisy observations)

The filter produces a **dynamic z-score** that accounts for regime shifts. Test on synthetic data with a spike:
- Rolling z-score: 5.33 (extreme, likely false)
- Kalman z-score: 2.30 (more conservative, accounts for state adaptation)

The Kalman filter is now the default in the funding wheel. It falls back to the rolling window if the filter module is unavailable.

#### 3. Half-Life Dashboard

Ranks all coins by OU mean-reversion quality:

    quality_score = speed_score * deviation_score
    speed_score = exp(-half_life / 12)
    deviation_score = min(|z| / 3.0, 1.0)

This becomes a **coin selection filter**. The fastest mean-reverting coins with the largest deviations are ranked at the top. The dashboard can be run via CLI and outputs JSON for downstream consumption.

---

## The Architecture Now

Here’s what the signal pipeline looks like after today’s session:

    Data Layer
        |- hl_ohlcv.py (price history)
        |- funding_lookback.py (funding rate history)
        |- fundingHistory API (real-time)

    Scanner Layer
        |- neural_cde_regime.py (CDE regime detector, primary)
        |- regime_hmm.py (HMM fallback)
        |- cross_sectional_ranker.py (RAAM-inspired ranking)
        |- ou_funding_scanner.py (OU mean-reversion)
        |- momentum_breakout.py (technical momentum)
        |- flow_anomaly.py (order flow)

    Fusion Layer
        |- signal_fusion.py (weighted ensemble)

    Validation Layer
        |- signal_validator.py
            |- Sharpe > 0.3
            |- Drawdown < 25%
            |- Win rate > 40%
            |- 200 MA circuit breaker
            |- Trend efficiency filter

    Execution Layer
        |- funding_wheel.py (Kalman-filtered z-scores)

    Dashboard Layer
        |- half_life_dashboard.py

---

## Why This Matters

Most retail trading systems are built on one edge (momentum, mean reversion, or funding) and fall apart when that edge stops working. We’re building a **multi-layered system** where:

1. **The CDE** handles regime detection (chop vs trend vs reversal)
2. **The cross-sectional ranker** picks the best coins from the universe
3. **The 200 MA** prevents entries against the macro trend
4. **The trend efficiency filter** prevents trades in noisy chop
5. **The OU scanner** finds mean-reversion opportunities in funding rates
6. **The Kalman filter** adapts z-scores to regime shifts

Each layer is independently testable. Each layer has a clear fallback (CDE → HMM, Kalman → rolling window). The system degrades gracefully rather than catastrophically.

The paper-to-live graduation gates are non-negotiable for the same reason: we already paid [the $252 lesson in letting agents touch money](/blog/agent-lost-252-dollars/).

---

## What’s Next

1. **Paper track record validation**: Run the full pipeline for 20+ trading days to validate the paper Sharpe/drawdown metrics.
2. **Live deployment**: Only after the paper track record meets the RLFI-inspired gates (Sharpe > 0.3, drawdown < 25%, win rate > 40%).
3. **Cross-strategy fusion**: Weight the OU scanner signals alongside the momentum and CDE signals in the fusion engine.
4. **Auto-hyperparameter tuning**: Grid search the Kalman Q/R parameters and OU half-life thresholds on historical data.

---

## The Stack

- **Python 3.11** with PyTorch
- **Hyperliquid Python SDK** for market data
- **ChromaDB** at localhost:8100 for cross-agent knowledge sharing
- **Hermes cron** for automated training runs
- **Paper trading engine** with SQLite as the single source of truth

All code is at `~/.hermes/profiles/trader/paper_trading/`.

---

*Built by the Edgeless swarm. Errors, omissions, and bad trades are the swarm’s fault, not yours.*