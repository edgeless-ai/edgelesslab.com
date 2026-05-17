---
id: task-91
title: Design & Implement Persistent State for Toast Crypto Bot
epic: 6-creative
status: pending
priority: P2
depends_on: [task-90]
blocks: []
created: 2026-01-27
owner: david
estimated_effort: 3-4 hours
---

# Task 91: Toast Bot Persistent State System

## Goal
Implement RLM-style persistent state management for Toast crypto trading bot to track positions, history, risk limits, and API state across ElizaOS sessions.

## Context
Toast bot needs to trade on Base/other chains (not Polymarket). Currently no persistence means:
- Lost position tracking on restart
- No trading history
- Risk management resets
- API nonce conflicts

RLM's `rlm_repl.py` pattern provides exactly this: persistent Python state with pickle serialization.

## Why This Matters
**HIGH PRIORITY** - Without persistence, Toast bot cannot:
- Resume trades after crash/restart
- Track P&L accurately
- Enforce risk limits
- Maintain API state consistency

---

## Prerequisites
- Completed task-90 (RLM exploration)
- Toast bot codebase location identified
- ElizaOS integration requirements documented

---

## Step-by-Step Instructions

### Step 1: Design State Schema
Create state structure:
```python
{
  "open_positions": [
    {
      "symbol": "ETH/USDC",
      "side": "long",
      "entry_price": 2500.00,
      "size": 1.5,
      "opened_at": "2026-01-27T10:30:00",
      "chain": "base"
    }
  ],
  "trade_history": [
    {
      "symbol": "ETH/USDC",
      "side": "long",
      "entry": 2500, "exit": 2550,
      "pnl": 75.00,
      "closed_at": "2026-01-27T11:00:00"
    }
  ],
  "risk_state": {
    "daily_loss": -50.00,
    "daily_limit": -500.00,
    "position_count": 2,
    "max_positions": 5,
    "position_size_limit": 1000.00
  },
  "api_state": {
    "last_nonce": 1234567890,
    "rate_limit_remaining": 100,
    "rate_limit_reset": "2026-01-27T11:15:00"
  },
  "strategy_params": {
    "strategy_name": "momentum_v2",
    "risk_per_trade": 0.02,
    "win_rate": 0.65,
    "trades_today": 12
  }
}
```

### Step 2: Create Persistent REPL
Copy and adapt `rlm_repl.py`:
```bash
# Create bot state directory
mkdir -p /Users/djm/claude-projects/toast-bot/.state

# Copy RLM repl as template
cp /Users/djm/claude-projects/tools/rlm/.claude/skills/rlm/scripts/rlm_repl.py \
   /Users/djm/claude-projects/toast-bot/trading_repl.py

# Modify for trading:
# - Replace content/context with trading_state
# - Add helpers: add_position(), close_position(), update_risk()
# - Keep pickle persistence mechanism
```

### Step 3: Add Helper Functions
```python
def add_position(symbol, side, size, price, chain):
    """Add new open position"""
    trading_state['open_positions'].append({
        'symbol': symbol,
        'side': side,
        'entry_price': price,
        'size': size,
        'opened_at': datetime.now().isoformat(),
        'chain': chain
    })

def close_position(symbol, exit_price):
    """Close position and record to history"""
    # Find and remove from open_positions
    # Calculate P&L
    # Add to trade_history
    # Update risk_state

def check_risk_limits():
    """Verify we can take new position"""
    risk = trading_state['risk_state']
    return (
        risk['daily_loss'] > risk['daily_limit'] and
        risk['position_count'] < risk['max_positions']
    )
```

### Step 4: Test State Persistence
```bash
# Initialize bot state
python trading_repl.py init

# Add test position
python trading_repl.py exec -c "add_position('ETH/USDC', 'long', 1.0, 2500, 'base')"

# Check state persists
python trading_repl.py exec -c "print(trading_state['open_positions'])"
```

### Step 5: Integrate with ElizaOS
- Hook bot startup to load state
- Save state after each trade
- Verify state survives restart

---

## Acceptance Criteria
- [ ] State schema designed and documented
- [ ] Persistent REPL implemented with trading helpers
- [ ] State survives process restart
- [ ] Risk limits enforced from persisted state
- [ ] Integration with ElizaOS tested

---

## Verification Checklist
- [ ] trading_repl.py exists and runs
- [ ] Can add/close positions
- [ ] State file persists at `.state/trading_state.pkl`
- [ ] Risk checks work from persisted limits
- [ ] Bot resumes correctly after restart

---

## Artifacts
- Trading REPL: `/toast-bot/trading_repl.py`
- State schema doc: `/claude-vault/03-Knowledge/toast-bot-state-design.md`
- Integration tests: `/toast-bot/tests/test_persistence.py`

## Blockers
If ElizaOS integration unclear, pause and research ElizaOS state management patterns first.

## Next Steps After Completion
- Deploy to VPS (like Pamela)
- Add monitoring for state health
- Implement state backup/recovery

## Notes
- Prioritize position tracking over history (can backfill history)
- Risk limits are CRITICAL - test thoroughly
- Consider daily state backups to avoid corruption
