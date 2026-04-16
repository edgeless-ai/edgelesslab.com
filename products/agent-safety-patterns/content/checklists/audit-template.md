# Agent Behavior Audit Template

Use this template for periodic reviews of agent safety and behavior. Run monthly for agents with financial access. Run quarterly for agents with filesystem-only access. Run immediately after any scope change.

## Audit Metadata

| Field | Value |
|-------|-------|
| Audit date | |
| Auditor | |
| Agent name | |
| Agent purpose | |
| Last audit date | |
| Last incident date | |

## Scope Review

- [ ] The agent's stated purpose is still accurate and current.
- [ ] The agent's permitted tools have not expanded since last audit.
  - Tools at last audit: _______________
  - Tools now: _______________
  - Any additions justified? _______________
- [ ] The agent's permitted commands have not expanded since last audit.
- [ ] The agent's file path permissions are still appropriate.
- [ ] No new external services have been added without review.

## Hook Health

- [ ] `damage-control.py` is still registered and running.
  - Test: feed a known-dangerous input and verify block (exit 2).
  - Result: PASS / FAIL
- [ ] `patterns.yaml` has been reviewed for completeness.
  - Any new dangerous patterns to add? _______________
- [ ] `financial-guard.py` is still registered (if applicable).
  - Test: feed a financial operation without FINANCIAL_GUARD_CONFIRM and verify block.
  - Result: PASS / FAIL
- [ ] `scope-limiter.py` is still registered.
  - Test: feed a tool not on the allowlist and verify block.
  - Result: PASS / FAIL
- [ ] `scope-allowlist.yaml` has been reviewed for excess permissions.
  - Any entries that should be removed? _______________

## Credential Review

- [ ] All API keys used by the agent are still necessary.
- [ ] API keys have not been granted additional permissions since last audit.
- [ ] API spending limits are still appropriate.
  - Current limit: _______________
  - Actual usage (last 30 days): _______________
- [ ] No credentials are stored in places the agent can read (check zero_access patterns).
- [ ] Wallet balances are at appropriate levels (not accumulating beyond need).

## Behavioral Analysis

Review the agent's logs for the audit period. Look for patterns, not just individual events.

- [ ] Total tool invocations: _______________
- [ ] Total blocked operations: _______________
- [ ] Block rate (blocked / total): _______________
  - A sudden increase in block rate suggests the agent is attempting operations outside scope.
  - A block rate of 0% over a long period may mean the hooks are not running.
- [ ] Most common blocked pattern: _______________
- [ ] Any repeated blocks of the same operation? (indicates the agent is persistently trying something it should not)
  - Detail: _______________
- [ ] Any financial operations executed? (should be rare and intentional)
  - Count: _______________
  - Total amount: _______________
  - All transactions verified on-chain/in-system: YES / NO
- [ ] Any new file paths accessed that were not in the original scope?
  - Detail: _______________

## Error and Anomaly Review

- [ ] Total errors in agent logs: _______________
- [ ] Any errors that indicate silent failures (operation failed but agent continued)?
  - Detail: _______________
- [ ] Any confabulated status detected (agent claimed success, reality shows failure)?
  - Detail: _______________
- [ ] Any unexpected external API calls?
  - Detail: _______________
- [ ] Any sessions that exceeded expected duration?
  - Detail: _______________

## Resource Consumption

- [ ] API credit usage for the audit period: _______________
- [ ] Token usage (LLM tokens consumed): _______________
- [ ] Storage consumed (files created, logs generated): _______________
- [ ] Any resource consumption anomalies (spikes, sustained high usage)?
  - Detail: _______________

## Findings and Actions

### Issues Found

| # | Severity | Description | Action Required |
|---|----------|-------------|-----------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### Actions Taken During This Audit

- [ ] Patterns file updated: YES / NO
- [ ] Scope allowlist tightened: YES / NO
- [ ] Credentials rotated: YES / NO
- [ ] Hooks reconfigured: YES / NO
- [ ] Agent permissions reduced: YES / NO

### Next Audit

Scheduled date: _______________
Focus areas: _______________

## Sign-Off

Auditor: _______________
Date: _______________
Status: PASS / CONDITIONAL PASS / FAIL
Notes: _______________
