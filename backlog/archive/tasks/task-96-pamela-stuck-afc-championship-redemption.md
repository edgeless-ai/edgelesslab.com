---
id: task-96
title: Fix Pamela stuck AFC Championship redemption - $11.57 unredeemable
epic: 2-ingestion
status: completed
priority: P1
depends_on: []
blocks: []
created: 2026-01-27
owner: david
estimated_effort: 2-3 hours
---

# Task 96: Fix Pamela AFC Championship Position Redemption

## Goal
Debug and fix Pamela's inability to redeem the winning AFC Championship position (Patriots win). Position shows +131% P&L but REDEEM_WINNINGS returns "No redeemable positions found" despite game being resolved 2 days ago.

## Context
**Stuck Position:**
- Market: "Will the Patriots win the AFC Championship?"
- 17.09 shares at $0.6770 = $11.57 current value
- Cost basis: $0.2930/share = $5.01 total invested
- Unrealized P&L: +$6.56 (+131.1%)
- Token ID: `101719154660517380687612365015835668227884146293605413205809626106808355686977`
- Game resolved 2 days ago (Patriots won)

**Problem:**
REDEEM_WINNINGS function returns "No redeemable positions found" despite:
- Real-world outcome known (Patriots won AFC Championship)
- 2 days elapsed since game
- Position should be redeemable at $1.00 per share

## Why This Matters
- **Real money stuck**: $11.57 unredeemable (13.1% profit locked)
- **System broken**: Redemption function not working
- **Future risk**: Other winning positions may have same issue
- **Trust issue**: Bot can't automatically collect winnings

## Step-by-Step Instructions

### Step 1: Verify Real-World Outcome
```bash
# FIRST: Confirm the Patriots actually won AFC Championship
# Search news sources, NFL official results
# Document: Date, final score, official resolution

# NOTE: If Patriots DIDN'T win, this is a misunderstanding, not a bug
```

### Step 2: Check Polymarket Market Resolution Status
```bash
# Get market details by condition ID or token ID
curl -s "https://clob.polymarket.com/markets/<conditionId>" | jq '{
  question,
  end_date_iso,
  closed,
  resolved,
  winning_outcome
}'

# Alternative: Check via data API
curl -s "https://data-api.polymarket.com/markets?condition_id=<id>" | jq
```

### Step 3: Investigate Token ID Mapping
```bash
# Check if token ID matches between:
# 1. Portfolio API (where position shows)
# 2. CLOB API (where redemption happens)

# Token ID: 101719154660517380687612365015835668227884146293605413205809626106808355686977

# Verify this token is for the "YES" outcome of the market
# Polymarket uses CTF (Conditional Token Framework) - token IDs are deterministic
```

### Step 4: Test Manual Redemption
```bash
# SSH to VPS (required for Polymarket API)
ssh hostinger-VPS

# Navigate to Pamela bot directory
cd ~/pamela-agent  # or actual location

# Check redemption script
cat src/scripts/redeemResolvedPositions.ts

# Manually trigger redemption with debug logging
NODE_ENV=production npx ts-node src/scripts/redeemResolvedPositions.ts --debug --verbose

# Look for errors or filtering logic that excludes this position
```

### Step 5: Check Polymarket CTF Contract
```bash
# Query the CTF contract directly on Polygon
# Contract: 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045 (CTF on Polygon)

# Check if position is redeemable on-chain
cast call 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045 \
  "balanceOf(address,uint256)(uint256)" \
  0x48e94E6f52562a95ee70939B3bA3A411734ef0F9 \
  101719154660517380687612365015835668227884146293605413205809626106808355686977 \
  --rpc-url https://polygon-rpc.com

# Check payout denominator (should be non-zero for resolved markets)
cast call 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045 \
  "payoutDenominator(bytes32)(uint256)" \
  <conditionId> \
  --rpc-url https://polygon-rpc.com
```

### Step 6: Review REDEEM_WINNINGS Function Logic
```bash
# Location: Likely in src/services/ or src/actions/
cd ~/pamela-agent
grep -r "REDEEM_WINNINGS" src/
grep -r "redeemable" src/

# Check filtering logic:
# - Does it only look at closed markets?
# - Does it check resolution status?
# - Does it filter by minimum value?
# - Does it have a time threshold?

# Common bugs:
# - Checking wrong API endpoint
# - Filtering out positions below threshold ($11.57 might be filtered?)
# - Not waiting for finalization period
# - Token ID mismatch between portfolio and redemption
```

### Step 7: Check Market Finalization Period
Polymarket markets may have a finalization period after resolution:
- Market resolves: Outcome determined
- Finalization period: 24-72 hours for disputes
- Redeemable: After finalization

**If market is resolved but not finalized:**
- This is expected behavior
- Wait for finalization
- Add logging to track finalization status

### Step 8: Manual Redemption Fallback
If automatic redemption is broken, redeem manually:

```bash
# Option A: Use Polymarket UI
# 1. Go to polymarket.com
# 2. Connect wallet 0x48e94E6f52562a95ee70939B3bA3A411734ef0F9
# 3. Navigate to Portfolio → Resolved Positions
# 4. Click "Redeem" on AFC Championship position

# Option B: Direct contract call (advanced)
# Redeem via CTF contract using cast/web3
# (Need to construct proper redemption transaction)
```

### Step 9: Fix Root Cause
Based on findings, implement fix:

**If market not resolved yet:**
- Add market resolution status check
- Log resolution timeline
- Update bot status message

**If filtering bug:**
- Fix REDEEM_WINNINGS logic
- Lower threshold or fix condition
- Add test cases

**If token ID mapping issue:**
- Fix token ID resolution
- Add mapping validation
- Document CTF token structure

**If API endpoint issue:**
- Update to correct endpoint
- Add fallback endpoints
- Improve error messages

### Step 10: Add Monitoring & Alerts
Prevent future stuck positions:

```javascript
// Add to monitoring system
{
  "check": "unredeemed_winning_positions",
  "condition": "resolved_market AND holding_winning_outcome AND not_redeemed",
  "threshold": "24 hours after resolution",
  "alert": "Telegram + Email",
  "severity": "high"
}
```

---

## Acceptance Criteria
- [ ] Real-world outcome verified (Patriots won/lost AFC Championship)
- [ ] Market resolution status confirmed on Polymarket
- [ ] Root cause identified and documented
- [ ] AFC Championship position successfully redeemed (if winnable)
- [ ] Fix implemented to prevent future stuck positions
- [ ] Monitoring added for unredeemed resolved positions
- [ ] Test case added for redemption logic

---

## Verification Checklist
- [ ] $11.57 position redeemed or explained why not redeemable
- [ ] REDEEM_WINNINGS function works on test case
- [ ] Redemption script logs show proper detection
- [ ] Bot can automatically redeem future resolved positions
- [ ] Alert triggers for stuck positions >24h after resolution

---

## Investigation Priority

**FIRST:** Verify Patriots actually won AFC Championship
- If NO → This is user error, not a bug
- If YES → Continue investigation

**SECOND:** Check market resolution status
- If not resolved → Wait for Polymarket to resolve
- If resolved but not finalized → Wait for finalization period
- If finalized → Bug in redemption system

**THIRD:** Test manual redemption
- Can the position be redeemed manually via Polymarket UI?
- If yes → Bot logic bug
- If no → Blockchain/contract issue

---

## Artifacts
- Debug findings: `pamela-agent/docs/debugging/afc-championship-redemption-2026-01-27.md`
- Fixed redemption logic: (location TBD)
- Monitoring config: (location TBD)
- Market resolution timeline documentation

## Related Information

**VPS Access:**
```bash
ssh hostinger-VPS
# IP: 62.72.32.53
# Pamela bot runs here (non-US IP required for Polymarket)
```

**Wallet:**
- Address: `0x48e94E6f52562a95ee70939B3bA3A411734ef0F9`
- Network: Polygon Mainnet
- Check balance: [PolygonScan](https://polygonscan.com/address/0x48e94E6f52562a95ee70939B3bA3A411734ef0F9)

**Polymarket Resources:**
- [CLOB API Docs](https://docs.polymarket.com)
- [CTF Contract](https://polygonscan.com/address/0x4D97DCd97eC945f40cF65F87097ACe5EA0476045)
- [Data API](https://data-api.polymarket.com)

## Expected Payout
If Patriots won and position is redeemable:
- 17.09 shares × $1.00 = $17.09 total
- Profit: $17.09 - $5.01 = $12.08 (+241% gain)

Currently showing $11.57 suggests market price is $0.677, not $1.00
→ Either not resolved yet OR not detected as winning outcome

## Next Steps After Fix
1. Implement automatic resolution status checker
2. Add weekly "stuck positions" audit
3. Create manual redemption guide
4. Improve REDEEM_WINNINGS error messages
5. Add market finalization period to bot knowledge

## Priority Justification
**P1** because:
- Real money stuck ($11.57)
- System appears broken (2 days unresolved)
- Core functionality impaired (can't collect winnings)
- Affects trust in autonomous trading
- May impact other resolved positions
