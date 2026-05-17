---
id: task-86
title: Set up Tailscale mesh network for secure mobile access
epic: 1-kernel
status: completed
completed_date: 2026-01-27
priority: P2
depends_on: []
blocks: [task-87, task-88]
created: 2026-01-26
owner: david
estimated_effort: 30min
---

# Task 86: Set up Tailscale Mesh Network for Secure Mobile Access

## Goal
Install and configure Tailscale on Mac and iPhone to create a private mesh network that allows secure SSH access from anywhere without exposing any public ports.

## Context
Tailscale creates a WireGuard-based private network between your devices. Once set up, your Mac gets a stable Tailscale IP (100.x.x.x) that's only accessible from your other Tailscale-connected devices. This is the foundation for secure mobile Claude Code access.

## Why Tailscale
- Zero public port exposure (no firewall changes needed)
- WireGuard encryption (military-grade)
- Works through NAT/firewalls automatically
- Free tier supports 100 devices
- No need to remember changing IP addresses

---

## Prerequisites
- macOS with admin access
- iPhone with App Store access
- Email account for Tailscale sign-up

---

## Step-by-Step Instructions

### Step 1: Create Tailscale Account
1. Go to https://login.tailscale.com/start
2. Sign up with Google, Microsoft, GitHub, or email
3. Verify email if required
4. You'll land on the admin console (empty network)

### Step 2: Install Tailscale on Mac

**Option A: Homebrew (Recommended)**
```bash
# Install Tailscale
brew install --cask tailscale

# Verify installation
ls /Applications/Tailscale.app
```

**Option B: Direct Download**
1. Go to https://tailscale.com/download/mac
2. Download the .pkg file
3. Run installer
4. Drag to Applications

### Step 3: Connect Mac to Tailscale
```bash
# Open Tailscale (appears in menu bar)
open /Applications/Tailscale.app

# Click menu bar icon → "Log in"
# Browser opens for authentication
# Approve the device

# Verify connection
tailscale status

# Get your Mac's Tailscale IP
tailscale ip -4
# Example output: 100.64.0.1
```

**Record your Mac's Tailscale IP**: `_____________`

### Step 4: Install Tailscale on iPhone
1. Open App Store
2. Search "Tailscale"
3. Install the official Tailscale app
4. Open app and tap "Get Started"
5. Log in with same account as Mac
6. Allow VPN configuration when prompted
7. Toggle ON to connect

### Step 5: Verify Devices See Each Other
On Mac:
```bash
tailscale status
# Should show both your Mac and iPhone

# Test connectivity from Mac to iPhone (optional)
ping <iphone-tailscale-ip>
```

On iPhone:
- Open Tailscale app
- Should see Mac listed with green dot

### Step 6: Name Your Devices (Optional but Recommended)
1. Go to https://login.tailscale.com/admin/machines
2. Click on your Mac → Edit → Set name to "macbook" or similar
3. Click on iPhone → Edit → Set name to "iphone"

Now you can use `ssh macbook` instead of remembering IPs.

---

## Verification Checklist
- [ ] Tailscale account created
- [ ] Tailscale installed on Mac
- [ ] Mac connected and shows in admin console
- [ ] Mac's Tailscale IP recorded: `100.___.___.___`
- [ ] Tailscale installed on iPhone
- [ ] iPhone connected and shows in admin console
- [ ] Both devices visible in `tailscale status`

---

## Troubleshooting

### Mac won't connect
```bash
# Check Tailscale daemon status
sudo launchctl list | grep tailscale

# Restart Tailscale
killall Tailscale
open /Applications/Tailscale.app
```

### iPhone won't connect
- Ensure VPN permission was granted
- Try toggling Tailscale off/on in the app
- Check if other VPNs are interfering

### Devices don't see each other
- Both must be logged into same Tailscale account
- Wait 30 seconds for network propagation
- Check admin console shows both devices "Connected"

---

## Security Notes
- Tailscale encrypts all traffic between devices
- Your Tailscale IP is not routable from the public internet
- Only devices in YOUR Tailscale network can reach each other
- No firewall/router changes needed

---

## Artifacts
- Tailscale account credentials (save in password manager)
- Mac Tailscale IP address
- iPhone Tailscale IP address

## Next Task
→ task-87: Enable and configure SSH on Mac
