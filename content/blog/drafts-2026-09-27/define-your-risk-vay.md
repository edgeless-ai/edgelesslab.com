# Define Your Risk: VAY, the Volatility-Adjusted Yield Metric

**Date:** 2026-09-27
**Status:** Draft — humanizer pass complete
**Source:** `claude-vault/03-Knowledge/2026-09-27-define-your-risk-vay-volatility-adjusted-yield.md`

---

## The problem with plain yield

If you're running a wheel strategy — sell premium, collect theta — the number that matters isn't your raw return. It's your return *per unit of risk taken*.

A strategy that makes 20% in a low-vol month and 2% in a high-vol month has the same average as one that makes 11% every month. But you'd rather have the 11% every month. You'd *pay* for that smoothness.

## Enter VAY

**Volatility-Adjusted Yield** is a single number that answers: "How much am I making, relative to how wild this month was?"

```
VAY = (Realized Return) / (Realized Volatility)
```

It's the Sharpe ratio without the risk-free rate noise. You divide what you actually made by how much the underlying bounced around. High VAY means you're being rewarded for your risk. Low or negative VAY means you're compensating the market for the privilege of being in the trade.

## Why it beats "up or down" thinking

Most traders track two things: P&L and max drawdown. Both are lagging indicators. VAY is a *rate* — it tells you whether your edge is working *right now*, not whether it worked last month.

If VAY is trending up, your strategy is adapting. If it's flat or declining, the market regime has shifted and your edge is decaying. You catch that before the P&L does.

## How to use it

1. **Track it weekly.** Don't wait for month-end.
2. **Benchmark it.** Compare your VAY to the underlying's realized vol over the same period. If you're not beating it, you're not adding value.
3. **Cut when it breaks.** A single negative VAY month is noise. Two in a row is a signal. Three is a strategy that stopped working.

## The one-line version

VAY = how much you made ÷ how much it hurt to watch. If that number's going up, you're winning.// define-your-risk-vay.md
