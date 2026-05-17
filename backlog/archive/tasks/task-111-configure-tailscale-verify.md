---
id: 111
title: "Configure Tailscale and final verification"
epic: kernel
status: done
priority: P2
effort: S
owner: david
created: 2026-02-03
depends_on: [110]
blocks: [112]
tags: [vps-migration, tailscale, verification]
parent_epic: 106
---

# Task 111: Configure Tailscale and Final Verification

## Objective

Add Hetzner VPS to Tailscale mesh and perform comprehensive verification.

## Phase 1: Install Tailscale on Hetzner

```bash
# On Hetzner VPS
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Follow auth URL in browser
# Note the Tailscale IP
tailscale ip -4  # e.g., 100.x.x.x
```

## Phase 2: Update SSH Config on Mac

```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config << 'EOF'

Host hetzner-nanobot
    HostName 100.x.x.x
    User nanobot
    IdentityFile ~/.ssh/id_ed25519
EOF
```

Replace `100.x.x.x` with actual Tailscale IP.

## Phase 3: Test Tailscale Access

```bash
# From Mac
ssh hetzner-nanobot

# Should connect via Tailscale mesh
```

## Phase 4: Final Verification Checklist

### System Health
```bash
htop  # Check CPU/RAM (press q to exit)
df -h  # Check disk space
uptime
```

### nanobot Status
```bash
sudo systemctl status nanobot
nanobot doctor
sudo journalctl -u nanobot --since "1 hour ago"
```

### Pamela Status
```bash
pm2 status
pm2 logs pamela --lines 30
```

### Network Connectivity
```bash
curl -I https://api.openrouter.ai
curl -I https://api.telegram.org
curl -I https://api.anthropic.com
```

### Telegram Test
- [ ] Send message to bot
- [ ] Verify response uses Kimi K2.5
- [ ] Test Claude fallback (if configurable)

## Phase 5: Update Documentation

- [ ] Update `~/.serena/memories/` with new VPS info
- [ ] Update any scripts referencing old Hostinger IP
- [ ] Add new VPS to monitoring (if applicable)

## Acceptance Criteria

- [ ] Tailscale installed and connected
- [ ] SSH via Tailscale works
- [ ] SSH config updated on Mac
- [ ] All services verified running
- [ ] Telegram bot responsive
- [ ] Pamela logs show no errors
- [ ] Documentation updated

## Time Estimate

30 minutes

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
