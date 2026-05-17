---
id: task-113
title: Investigate ERC-8004 for autonomous bot identity and deployment
epic: 7-trading
status: pending
priority: P2
depends_on: [110]
blocks: []
created: 2026-02-03
owner: david
estimated_effort: 3-4 hours
tags: [erc-8004, autonomous-agents, on-chain-identity, toast-bot, pamela-bot, decentralization]
---

# Task 113: ERC-8004 Autonomous Agent Identity Investigation

## Goal
Research and implement ERC-8004 on-chain identity for Toast and Pamela bots, enabling them to "roam free" on the internet as autonomous agents with portable reputation and discoverable infrastructure.

## Context
ERC-8004 is an open standard for establishing portable, on-chain identity for AI agents. Instead of bots being tied to a single platform or server, they get:

1. **Portable Identity** - Agent exists as an NFT on Ethereum/L2s (Base, Polygon, etc.)
2. **Discoverable Infrastructure** - Other agents/apps can find endpoints (MCP servers, payment wallets)
3. **Portable Reputation** - On-chain track record that persists across platforms
4. **Cross-Chain Consistency** - Same registry contracts across all chains

This could enable Toast and Pamela to operate more autonomously and build verifiable on-chain reputations for their trading performance.

### Related Work
- **task-110**: Migrating Pamela from Hostinger (infrastructure foundation)
- **Epic 106**: VPS Migration (where these bots will run)
- **Existing**: Toast bot (ElizaOS-based crypto trading)
- **Existing**: Pamela bot (Polymarket prediction markets)

## Why This Matters
Current state: Bots are tied to specific VPS instances and have no portable identity or reputation system.

With ERC-8004:
- Bots can move between infrastructure providers while maintaining identity
- Trading performance becomes verifiable on-chain
- Other agents/users can discover and interact with them
- Opens door to autonomous agent-to-agent (A2A) interactions
- Builds towards true autonomous operation ("roaming free")

## Step-by-Step Instructions

### Step 1: Deep Research on ERC-8004 Specification
Read and document:
```bash
# Primary documentation
open https://docs.pinata.cloud/tools/erc-8004/quickstart
open https://erc8004.org/  # If exists - check for full spec

# Research questions:
# - What chains are supported?
# - Gas cost estimates?
# - What metadata can be stored?
# - How does reputation system work?
# - A2A communication protocols?
# - Security considerations?
```

Create research session: `/claude-vault/03-Knowledge/Research-Sessions/2026-02-03-erc8004-autonomous-agents.md`

### Step 2: Assess Prerequisites and Setup Requirements
Document what's needed:

**Infrastructure:**
- [ ] Pinata account (for IPFS hosting)
- [ ] Pinata API credentials
- [ ] IPFS gateway access
- [ ] Wallet with native tokens for gas (Base/Polygon)
- [ ] Smart contract interaction capability

**Bot-Specific:**
- [ ] Toast bot's operational endpoints
- [ ] Pamela bot's operational endpoints
- [ ] Payment wallet addresses
- [ ] Performance metrics for reputation
- [ ] MCP server configurations (if exposing)

**Technical:**
- [ ] TypeScript/Viem for contract interaction
- [ ] JSON agent card schema
- [ ] Optional: `.well-known` endpoint verification

### Step 3: Design Agent Cards for Toast and Pamela
Create metadata schemas:

**Toast Bot Agent Card:**
```json
{
  "name": "Toast Crypto Trading Agent",
  "description": "Autonomous crypto trading bot on Base/Polygon",
  "chains": ["base", "polygon"],
  "capabilities": [
    "token-swapping",
    "portfolio-management",
    "risk-assessment"
  ],
  "endpoints": {
    "mcp": "...",
    "wallet": "0x..."
  },
  "reputation": {
    "trades_executed": 0,
    "success_rate": 0.0,
    "total_volume": 0
  }
}
```

**Pamela Bot Agent Card:**
```json
{
  "name": "Pamela Prediction Market Agent",
  "description": "Autonomous prediction market trader on Polymarket",
  "chains": ["polygon"],
  "capabilities": [
    "market-analysis",
    "position-management",
    "sentiment-trading"
  ],
  "endpoints": {
    "mcp": "...",
    "wallet": "0x48e94E6f52562a95ee70939B3bA3A411734ef0F9"
  },
  "reputation": {
    "markets_traded": 0,
    "win_rate": 0.0,
    "total_positions": 0
  }
}
```

### Step 4: Cost-Benefit Analysis
Calculate costs vs benefits:

**Costs:**
- Gas fees for registration (per chain)
- Pinata IPFS storage costs
- Development time for integration
- Ongoing maintenance

**Benefits:**
- Portable bot identity
- On-chain reputation building
- Discoverable by other agents
- Platform independence
- Future A2A trading opportunities

Document findings and make go/no-go recommendation.

### Step 5: Proof of Concept (If Approved)
If cost-benefit is favorable, create testnet POC:

```bash
# 1. Set up Pinata account and get API keys
# 2. Get testnet tokens from faucets
# 3. Register one bot (Toast or Pamela) on testnet
# 4. Upload agent card to IPFS
# 5. Set URI on-chain
# 6. Verify discoverability
```

Test on Base Sepolia or Polygon Mumbai.

### Step 6: Production Deployment Plan (If POC Succeeds)
Create deployment checklist:

**Phase 1: Infrastructure**
- [ ] Mainnet wallet setup with gas funds
- [ ] Pinata production account
- [ ] IPFS gateway configuration
- [ ] Security audit of wallet key management

**Phase 2: Registration**
- [ ] Register Toast on Base mainnet
- [ ] Register Pamela on Polygon mainnet
- [ ] Upload agent cards to IPFS
- [ ] Set URIs on-chain

**Phase 3: Integration**
- [ ] Update bot code to report metrics
- [ ] Implement reputation updates
- [ ] Add discoverable endpoints
- [ ] Monitor on-chain presence

**Phase 4: Documentation**
- [ ] Create agent identity guide
- [ ] Document reputation system
- [ ] Write discovery protocol docs
- [ ] Update VPS runbooks

### Step 7: Future Opportunities Assessment
Brainstorm what ERC-8004 enables:

**Immediate:**
- Verifiable trading performance
- Bot discovery by other users
- Platform-independent identity

**Medium-Term:**
- Agent-to-agent collaboration
- Cross-bot trading strategies
- Decentralized bot marketplace

**Long-Term:**
- Autonomous economic agents
- DAO-owned trading agents
- Self-improving reputation systems

---

## Acceptance Criteria
- [ ] ERC-8004 specification fully researched and documented
- [ ] Prerequisites identified and assessed for feasibility
- [ ] Agent card schemas designed for Toast and Pamela
- [ ] Cost-benefit analysis completed with recommendation
- [ ] (If approved) Testnet POC successfully deployed
- [ ] (If approved) Production deployment plan created
- [ ] Future opportunities documented

---

## Verification Checklist
- [ ] Research session exists with comprehensive findings
- [ ] Can explain ERC-8004 to someone unfamiliar
- [ ] Prerequisites are clearly documented
- [ ] Cost estimates are realistic
- [ ] Agent card schemas are complete and valid
- [ ] Go/no-go recommendation is justified
- [ ] (If POC) Can demonstrate testnet registration
- [ ] (If POC) Agent card is accessible via IPFS

---

## Artifacts
- Research session: `claude-vault/03-Knowledge/Research-Sessions/2026-02-03-erc8004-autonomous-agents.md`
- Agent card schemas: `nanobot-vps/agent-cards/` (new directory)
- Cost analysis: Can be section in research session
- Deployment plan: `nanobot-vps/erc8004-deployment-plan.md`
- (If deployed) Agent URLs on block explorers

## Technical Resources
- Pinata ERC-8004 Quickstart: https://docs.pinata.cloud/tools/erc-8004/quickstart
- Pinata Dashboard: https://app.pinata.cloud/
- ERC-8004 Specification: https://eips.ethereum.org/EIPS/eip-8004 (if published)
- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-sepolia-faucet
- Polygon Mumbai Faucet: https://faucet.polygon.technology/

## Questions to Answer
- Is ERC-8004 mature enough for production use?
- What's the typical gas cost for registration?
- How often should agent cards be updated?
- Can reputation be gamed or manipulated?
- What happens if IPFS gateway goes down?
- Do we need .well-known endpoint verification?
- Should we register on multiple chains?
- How do other agents discover ours?
- What's the security model for agent keys?
- Can this integrate with existing ElizaOS architecture?

## Success Metrics
**Research Phase:**
- Comprehensive understanding of ERC-8004
- Clear recommendation with justification

**POC Phase (if approved):**
- Successful testnet registration
- Agent card accessible and valid
- Can be discovered by other tools

**Production Phase (if deployed):**
- Bots have verifiable on-chain identity
- Reputation updates automatically
- Identity persists across infrastructure changes

## Notes
- This is cutting-edge tech - expect rough edges
- May need to pioneer some patterns
- Could position bots as reference implementations
- Community engagement opportunity (blog posts, talks)
- Consider open-sourcing the integration code

## Risks / Considerations
- **Immaturity Risk**: ERC-8004 is very new, ecosystem may not be ready
- **Cost Risk**: Gas fees could be prohibitive for frequent updates
- **Centralization**: Relies on Pinata for IPFS (but IPFS itself is decentralized)
- **Wallet Security**: Need to manage private keys securely on VPS
- **Maintenance**: Ongoing cost to keep agent cards updated
- **Limited Benefit**: If no other agents are using ERC-8004, discovererability value is limited
- **Platform Risk**: What if Pinata shuts down or changes pricing?

## Dependencies
- **task-110**: Pamela migration must complete first (need stable VPS)
- **Wallet Setup**: Need secure key management on new Hetzner VPS
- **Bot Stability**: Bots should be reliably operational before getting on-chain identity

## Related Tasks
- task-110: Migrate Pamela bot from Hostinger
- task-91: Toast bot persistent state implementation
- Epic 106: VPS Migration & nanobot Deployment
- Future: Could spawn tasks for A2A communication, reputation marketplace, etc.

## Integration Points
- **Toast Bot**: ElizaOS-based, needs agent card integration
- **Pamela Bot**: Custom Python, needs wallet integration
- **VPS**: New Hetzner infrastructure (Epic 106)
- **Wallet Management**: Need secure key storage
- **Monitoring**: Should track on-chain identity health
