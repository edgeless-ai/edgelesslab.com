---
id: 112
title: "Disable Hostinger renewal and monitor"
epic: kernel
status: pending
priority: P2
effort: S
owner: david
created: 2026-02-03
depends_on: [111]
blocks: []
tags: [vps-migration, cleanup, monitoring]
parent_epic: 106
---

# Task 112: Disable Hostinger Renewal and Monitor

## Objective

Safely decommission Hostinger VPS after verifying Hetzner migration success.

## Phase 1: Monitoring Period (1 Week)

Before disabling Hostinger, monitor Hetzner for stability:

### Daily Checks
- [ ] Day 1: nanobot responds, Pamela logs clean
- [ ] Day 2: Check OpenRouter usage/costs
- [ ] Day 3: Verify scheduled tasks running
- [ ] Day 4: Check system resources (disk, memory)
- [ ] Day 5: Review any error logs
- [ ] Day 6: Confirm all integrations working
- [ ] Day 7: Final verification

### Monitoring Commands
```bash
# Quick daily check
ssh hetzner-nanobot
pm2 status
sudo systemctl status nanobot
df -h
exit
```

## Phase 2: Disable Hostinger Auto-Renewal

Only after successful 1-week monitoring:

1. Log into Hostinger dashboard: https://hpanel.hostinger.com/
2. Navigate to VPS section
3. Click on your VPS (KVM 8)
4. Find "Auto-renewal" setting
5. Turn OFF auto-renewal
6. Confirm the action
7. Screenshot the confirmation showing:
   - Auto-renewal: OFF
   - Expiration date: 2026-02-28

## Phase 3: Final Hostinger Cleanup

Before expiration (2026-02-28):

### Data Verification
- [ ] All important data backed up
- [ ] No unique data remaining on Hostinger
- [ ] Pamela backup verified on Hetzner

### Documentation Updates
- [ ] Remove `hostinger-VPS` from SSH config (or update to new host)
- [ ] Update any hardcoded IPs in scripts
- [ ] Update CLAUDE.md VPS section

### Final Hostinger Tasks (Optional)
- [ ] Download any remaining logs
- [ ] Export any additional backups
- [ ] Document what was running for reference

## Phase 4: Post-Expiration

After 2026-02-28:

- [ ] Verify Hostinger VPS is no longer accessible
- [ ] Confirm no services are broken
- [ ] Remove Hostinger from SSH known_hosts if needed
- [ ] Update memory system with migration completion

## Acceptance Criteria

- [ ] 7-day monitoring period completed successfully
- [ ] Hostinger auto-renewal disabled
- [ ] Expiration date confirmed (2026-02-28)
- [ ] All data verified on Hetzner
- [ ] Documentation updated
- [ ] No service disruption after Hostinger expires

## Cost Verification

After migration complete:

| Metric | Target | Actual |
|--------|--------|--------|
| Hetzner monthly cost | <$12 | ______ |
| OpenRouter monthly cost | <$20 | ______ |
| Total monthly savings | >$30 | ______ |

## Time Estimate

- Monitoring: 10 min/day x 7 days = 70 min
- Hostinger disable: 10 min
- Cleanup: 20 min
- Total: ~2 hours spread over 1 week

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
*Deadline: Complete monitoring before 2026-02-28*
