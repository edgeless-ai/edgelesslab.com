---
id: 110
title: "Migrate Pamela bot from Hostinger"
epic: kernel
status: done
priority: P2
effort: M
owner: david
created: 2026-02-03
depends_on: [109]
blocks: [111]
tags: [vps-migration, pamela, trading-bot]
parent_epic: 106
---

# Task 110: Migrate Pamela Bot from Hostinger

## Objective

Transfer Pamela Polymarket trading bot from Hostinger to Hetzner VPS.

## Phase 1: Backup on Hostinger

```bash
# SSH to Hostinger
ssh hostinger-VPS

# Create backup
cd ~
tar -czvf pamela-backup-$(date +%Y%m%d).tar.gz pamela-agent/

# Verify backup
ls -lh pamela-backup-*.tar.gz
tar -tzvf pamela-backup-*.tar.gz | head -20
```

## Phase 2: Transfer Backup

Option A - Via Mac (recommended):
```bash
# On Mac
scp hostinger-VPS:~/pamela-backup-*.tar.gz /tmp/
scp /tmp/pamela-backup-*.tar.gz nanobot@<HETZNER_IP>:~/
```

Option B - Direct transfer:
```bash
# On Hostinger
scp ~/pamela-backup-*.tar.gz nanobot@<HETZNER_IP>:~/
```

## Phase 3: Install Node.js on Hetzner

```bash
# On Hetzner VPS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Verify
node --version  # Should be 20.x
npm --version

# Install PM2
sudo npm install -g pm2
pm2 --version
```

## Phase 4: Deploy Pamela

```bash
# Extract backup
cd ~
tar -xzvf pamela-backup-*.tar.gz

# Install dependencies
cd ~/pamela-agent
npm install

# Verify .env file has correct values
cat .env  # Check wallet keys, API keys, etc.
nano .env  # Edit if needed
```

## Phase 5: Start with PM2

```bash
cd ~/pamela-agent

# Start (adjust command based on Pamela's actual entry point)
pm2 start index.js --name pamela
# OR if there's an ecosystem file:
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Set up auto-start on boot
pm2 startup
# Run the command it outputs (will be something like:)
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u nanobot --hp /home/nanobot
```

## Phase 6: Verify

```bash
pm2 status
pm2 logs pamela --lines 50

# Check if Pamela is:
# - Connected to Polymarket
# - Reading positions correctly
# - Not throwing errors
```

## Acceptance Criteria

- [ ] Backup created on Hostinger
- [ ] Backup transferred to Hetzner
- [ ] Node.js 20.x installed
- [ ] PM2 installed globally
- [ ] Pamela dependencies installed
- [ ] Pamela running under PM2
- [ ] PM2 configured for auto-start
- [ ] No errors in Pamela logs
- [ ] Positions/trades visible (if any active)

## Rollback Plan

If issues occur:
1. Pamela still running on Hostinger
2. Don't touch Hostinger until Hetzner verified
3. Can restore from backup file

## Time Estimate

60-90 minutes

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
