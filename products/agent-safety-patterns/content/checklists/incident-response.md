# Incident Response Checklist

Use this checklist when an agent has exceeded scope, caused damage, or is behaving unexpectedly. Work through it in order. Do not skip to investigation before completing the immediate actions.

## Immediate Actions (First 5 Minutes)

- [ ] **Kill the agent process.** Do not ask the agent to stop. Kill the process directly.
  - PM2: `pm2 stop <name> && pm2 delete <name>`
  - systemd: `systemctl stop <service>`
  - Process: `kill -9 <pid>`
  - Container: `docker stop <container> && docker rm <container>`
  - Cron: Comment out the crontab entry immediately (`crontab -e`)

- [ ] **Revoke credentials.** Rotate every key the agent had access to.
  - [ ] API keys rotated at provider dashboards
  - [ ] Database passwords changed
  - [ ] Wallet funds moved to a wallet the agent does not know (if applicable)
  - [ ] SSH keys removed from authorized_keys on any server the agent accessed
  - [ ] OAuth tokens revoked

- [ ] **Preserve evidence.** Copy before anything rotates or gets overwritten.
  - [ ] Agent session logs copied to a safe location
  - [ ] Hook block logs copied
  - [ ] Tool invocation database/logs copied
  - [ ] Agent's stdout/stderr output captured
  - [ ] Relevant system logs (`journalctl`, application logs) captured

- [ ] **Check for ongoing effects.**
  - [ ] `crontab -l` on all relevant systems: any new entries?
  - [ ] `ps aux | grep -i agent`: any orphan processes?
  - [ ] Running containers: `docker ps`
  - [ ] Recent deployments: check CI/CD pipeline history
  - [ ] Outbound messages: check email send logs, Slack/Discord API logs, webhook histories
  - [ ] Background jobs: check PM2, systemd timers, at jobs

## Investigation (First Hour)

- [ ] **Build the timeline.** From the preserved logs, construct a chronological list of every tool invocation.
  - Start time of the agent session
  - Each tool call with timestamp, input, and output
  - The exact point where the agent exceeded scope
  - Any blocked operations (from hook logs)
  - The end state when the agent was killed

- [ ] **Verify all agent claims.** For every action the agent reported as successful, verify independently.
  - [ ] File changes: `git diff` or filesystem comparison against backup
  - [ ] Database changes: compare against backup or audit log
  - [ ] Financial transactions: verify on blockchain explorer or bank statement
  - [ ] API calls: check provider dashboards for actual usage
  - [ ] Deployments: verify what is actually running vs. what the agent claims

- [ ] **Identify confabulated status.** Flag any agent claim that does not match ground truth.
  - Document each discrepancy with evidence
  - Note: agents do not lie intentionally. They optimize for satisfying responses. Treat confabulations as a system failure, not agent malice.

- [ ] **Map blast radius.** List every system the agent touched.
  - [ ] Files read
  - [ ] Files written or modified
  - [ ] Files deleted
  - [ ] External APIs called
  - [ ] Databases queried or modified
  - [ ] Services started, stopped, or restarted
  - [ ] Messages sent to external systems
  - [ ] Funds transferred

## Remediation (First Day)

- [ ] **Fix immediate damage.**
  - [ ] Restore deleted files from backup
  - [ ] Roll back database changes (from transaction logs or backup)
  - [ ] Reverse any reversible transactions
  - [ ] Correct any corrupted configuration files
  - [ ] Redeploy known-good versions of affected services

- [ ] **Quantify the loss.**
  - [ ] Financial loss (direct)
  - [ ] API credit consumption
  - [ ] Data loss (irrecoverable files, truncated tables)
  - [ ] Time cost for investigation and remediation
  - [ ] Downstream impact (broken services, affected users)

- [ ] **Identify the safety gap.**
  - [ ] Which hook would have prevented this?
  - [ ] Was the agent running without hooks?
  - [ ] Were the hooks misconfigured?
  - [ ] Was the dangerous pattern not covered in the patterns file?
  - [ ] Was the scope allowlist too permissive?
  - [ ] Were credentials over-provisioned?

- [ ] **Deploy the fix.**
  - [ ] Add the missing pattern to `patterns.yaml`
  - [ ] Tighten the scope allowlist
  - [ ] Enable financial guards if they were not active
  - [ ] Test the fix by replaying the exact sequence that caused the incident
  - [ ] Verify the fix blocks at the correct step

## Post-Mortem

- [ ] **Write the incident report.** Include:
  - Date and time of the incident
  - Agent name and configuration
  - What the agent was supposed to do
  - What the agent actually did
  - Root cause (scope too broad, hook missing, credential over-provisioned, etc.)
  - Damage quantified
  - Fix deployed
  - Prevention measures for recurrence

- [ ] **Share the report.** Anyone who runs agents on your team should read it.

- [ ] **Schedule a follow-up audit** in 7 days to verify the fix is holding.

## Incident Log

| Field | Value |
|-------|-------|
| Date | |
| Agent | |
| Severity (low/medium/high/critical) | |
| Summary (one sentence) | |
| Financial loss | |
| Data loss | |
| Root cause | |
| Fix deployed (Y/N) | |
| Post-mortem written (Y/N) | |
| Responder | |
