---
id: 108
title: "Provision Hetzner VPS and configure security"
epic: kernel
status: done
priority: P2
effort: M
owner: david
created: 2026-02-03
depends_on: [107]
blocks: [109]
tags: [vps-migration, infrastructure, security]
parent_epic: 106
---

# Task 108: Provision Hetzner VPS and Configure Security

## Objective

Create Hetzner Cloud VPS with proper security hardening.

## Phase 1: Account & Server Creation

### Create Hetzner Account
- [ ] Go to https://www.hetzner.com/cloud
- [ ] Sign up and verify email
- [ ] Add payment method

### Provision Server
- [ ] Go to https://console.hetzner.cloud/
- [ ] New Project → "nanobot-prod"
- [ ] Add Server with these settings:

| Setting | Value | Notes |
|---------|-------|-------|
| **Location** | **Helsinki** (hel1) | NOT US - Polymarket requires non-US IP |
| **Type** | CX33 ($5.99/mo) or CPX32 ($11.99/mo) | CX33 = best value |
| **Image** | Ubuntu 24.04 | |
| **Networking** | Public IPv4 + IPv6 | Default is fine |
| **SSH Key** | See below | REQUIRED - add before creating |
| **Volumes** | Skip | Not needed |
| **Firewalls** | Skip | Configure with UFW after |
| **Backups** | Optional (+20%) | ~$1.20/mo extra |
| **Name** | `nanobot-1` | Change from auto-generated |

### SSH Key to Add
Click "Add SSH key" and paste this exact line:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL+IEQrO+3REJ8lgtjzGDL94se5P/1A41UlvpLxZpSRu thedavidmurray@gmail.com
```
Name it "MacBook" or "David's Key"

- [ ] Create & Buy (~$6-12/mo depending on plan)
- [ ] Record IP address: `_______________`

## Phase 2: Initial Access

```bash
# Test SSH access
ssh root@<IP>

# Update system
apt update && apt upgrade -y
```

## Phase 3: Security Hardening

### Create Non-Root User
```bash
adduser nanobot
usermod -aG sudo nanobot

mkdir -p /home/nanobot/.ssh
cp ~/.ssh/authorized_keys /home/nanobot/.ssh/
chown -R nanobot:nanobot /home/nanobot/.ssh
chmod 700 /home/nanobot/.ssh
chmod 600 /home/nanobot/.ssh/authorized_keys
```

### Test New User
```bash
# From Mac
ssh nanobot@<IP>
sudo whoami  # Should output: root
```

### Configure Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Install Fail2ban
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Optional: Disable Root SSH
```bash
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

## Acceptance Criteria

- [ ] Server provisioned in Helsinki datacenter (non-US for Polymarket)
- [ ] SSH access working with key authentication
- [ ] Non-root user `nanobot` created with sudo
- [ ] UFW firewall enabled (ports 22, 80, 443 only)
- [ ] Fail2ban running
- [ ] System fully updated

## Verification Commands

```bash
# On VPS
sudo ufw status
sudo systemctl status fail2ban
df -h
free -h
```

## Time Estimate

30-45 minutes

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
