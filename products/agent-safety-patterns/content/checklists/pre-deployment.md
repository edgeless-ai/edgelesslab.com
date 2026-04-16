# Pre-Deployment Checklist

Complete every item before giving an agent autonomous access to any system. Do not skip items because the agent "seems safe." The $252 loss came from an agent that seemed safe.

## Scope Definition

- [ ] The agent's task is documented in a single sentence. If you cannot describe it in one sentence, the scope is too broad.
- [ ] The agent's permitted tools are listed explicitly. "All tools" is not acceptable.
- [ ] The agent's permitted commands are listed explicitly (for Bash access).
- [ ] The agent's permitted file paths are defined. Which directories can it read? Write? Delete?
- [ ] The agent's permitted external services are listed. Which APIs can it call? Which endpoints?
- [ ] The maximum session duration is defined. The agent will be killed after this time.
- [ ] The maximum number of tool invocations per session is defined.

## Hook Configuration

- [ ] `damage-control.py` is registered as a PreToolUse hook.
- [ ] `patterns.yaml` exists and contains patterns relevant to your environment.
- [ ] `financial-guard.py` is registered if the agent has ANY access to financial systems.
- [ ] `FINANCIAL_GUARD_CONFIRM` is set to `false` by default.
- [ ] `scope-limiter.py` is registered with a populated `scope-allowlist.yaml`.
- [ ] You have tested each hook by feeding it a known-dangerous input and verifying it blocks (exit code 2).
- [ ] You have tested each hook by feeding it a known-safe input and verifying it allows (exit code 0).

## Credentials

- [ ] The agent has its own API keys, separate from your personal keys.
- [ ] API keys are scoped to the minimum required permissions.
- [ ] API keys have spending limits configured at the provider level.
- [ ] No API key grants delete, admin, or owner permissions unless strictly necessary.
- [ ] Wallet private keys are NOT accessible to the agent (use signing services or hardware wallets).
- [ ] The agent cannot read `.env.production`, `credentials.json`, or equivalent files (verify with zero_access patterns).

## Financial Operations (skip if no financial access)

- [ ] `FINANCIAL_GUARD_MAX_AMOUNT` is set to the maximum single transaction amount.
- [ ] `FINANCIAL_GUARD_APPROVED_ADDRESSES` contains only addresses the agent should send to.
- [ ] You have verified the approved addresses are correct by sending a small test transaction manually.
- [ ] There is a balance alert on every wallet the agent can access, set to trigger below a threshold.
- [ ] The agent's wallet contains only the funds needed for the current session, not your full balance.

## Observability

- [ ] Tool invocation logging is enabled (PostToolUse hook or framework-level logging).
- [ ] Block events are logged with the full context (tool name, input, matched pattern).
- [ ] Alerts are configured for: 3+ blocks in a session, any financial operation, any error.
- [ ] Logs are written to a location the agent cannot modify or delete.
- [ ] You have a way to view logs in real time while the agent is running.

## Recovery Preparation

- [ ] You know the process ID, PM2 name, or systemd service name to kill the agent immediately.
- [ ] You have a copy of `checklists/incident-response.md` accessible outside the agent's environment.
- [ ] Critical data has been backed up before the agent session starts.
- [ ] You have tested the backup restore procedure within the last 30 days.

## Final Verification

- [ ] Run the agent in dry-run mode (if your framework supports it) and review the planned actions.
- [ ] Have a second person review the scope definition and hook configuration.
- [ ] Set a calendar reminder to audit the agent's permissions in 30 days.
- [ ] Sign off: "I understand that this agent will operate autonomously and I have verified the safety boundaries."

Date: _______________
Reviewer: _______________
Agent name/ID: _______________
