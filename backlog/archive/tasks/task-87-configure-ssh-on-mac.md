---
id: task-87
title: Enable and configure SSH on Mac with key-based authentication
epic: 1-kernel
status: completed
completed_date: 2026-01-27
priority: P2
depends_on: [task-86]
blocks: [task-88]
created: 2026-01-26
owner: david
estimated_effort: 30min
---

# Task 87: Enable and Configure SSH on Mac with Key-Based Authentication

## Goal
Enable SSH server on Mac, generate SSH key pair, and configure for secure key-based authentication (no password login).

## Context
SSH (Secure Shell) allows you to remotely connect to your Mac's terminal. By default, macOS has SSH disabled. We'll enable it and configure it to only accept key-based authentication (more secure than passwords).

## Why Key-Based Auth
- No passwords to type on mobile (inconvenient)
- Keys are cryptographically stronger than passwords
- Can't be brute-forced like passwords
- Can be revoked individually if device is lost

---

## Prerequisites
- Completed task-86 (Tailscale setup)
- Mac admin password

---

## Step-by-Step Instructions

### Step 1: Enable SSH Server on Mac

**Option A: System Settings (GUI)**
1. Open System Settings (Apple menu → System Settings)
2. Go to General → Sharing
3. Find "Remote Login" and toggle ON
4. Note the SSH command shown (e.g., `ssh djm@Davids-MacBook.local`)

**Option B: Command Line**
```bash
# Enable SSH
sudo systemsetup -setremotelogin on

# Verify it's running
sudo launchctl list | grep ssh
# Should show: com.openssh.sshd

# Check SSH is listening
sudo lsof -i :22
```

### Step 2: Generate SSH Key Pair (If You Don't Have One)

Check if you already have keys:
```bash
ls -la ~/.ssh/
# Look for id_rsa and id_rsa.pub (or id_ed25519 and id_ed25519.pub)
```

If no keys exist, generate new ones:
```bash
# Generate Ed25519 key (modern, secure, recommended)
ssh-keygen -t ed25519 -C "david@macbook-2026"

# When prompted:
# - File location: Press Enter for default (~/.ssh/id_ed25519)
# - Passphrase: Enter a strong passphrase (IMPORTANT - you'll need this on mobile)

# Verify keys were created
ls -la ~/.ssh/
# Should see: id_ed25519 (private) and id_ed25519.pub (public)
```

### Step 3: Set Up SSH Config File

Create or edit SSH config:
```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create/edit config file
nano ~/.ssh/config
```

Add this content:
```
# Default settings for all hosts
Host *
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519

# Your Mac (for reference when connecting from other devices)
Host macbook
    HostName 100.x.x.x  # Replace with your Mac's Tailscale IP from task-86
    User djm            # Replace with your Mac username
    IdentityFile ~/.ssh/id_ed25519
```

Save and exit (Ctrl+X, Y, Enter).

### Step 4: Add Your Public Key to Authorized Keys

```bash
# Ensure authorized_keys file exists with correct permissions
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add your public key to authorized keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Verify
cat ~/.ssh/authorized_keys
# Should show your public key
```

### Step 5: Test SSH Locally

```bash
# Test connecting to yourself via localhost
ssh localhost

# If prompted about fingerprint, type "yes"
# Enter your key passphrase if set
# Should connect successfully

# Exit the test session
exit
```

### Step 6: Test SSH via Tailscale IP

```bash
# Get your Tailscale IP
tailscale ip -4

# Test SSH via Tailscale
ssh <your-tailscale-ip>

# Should connect successfully
exit
```

### Step 7: (Optional) Restrict SSH to Tailscale Only

For maximum security, only allow SSH connections from Tailscale network:

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Find and modify these lines:
```
# Only listen on Tailscale interface (replace with your Tailscale IP)
ListenAddress 100.x.x.x

# Disable password authentication (key-only)
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
# macOS Ventura and later
sudo launchctl stop com.openssh.sshd
sudo launchctl start com.openssh.sshd

# Or reboot
```

### Step 8: Export Private Key for Mobile

You need to transfer your private key to your iPhone securely:

**Option A: AirDrop (Recommended)**
```bash
# Copy to Desktop for easy AirDrop
cp ~/.ssh/id_ed25519 ~/Desktop/id_ed25519_for_mobile

# AirDrop to iPhone
# Then DELETE from Desktop immediately
rm ~/Desktop/id_ed25519_for_mobile
```

**Option B: Copy/Paste via Secure Notes**
```bash
# Display private key
cat ~/.ssh/id_ed25519

# Copy the ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ... key content ...
# -----END OPENSSH PRIVATE KEY-----
```
Save to a secure note app, transfer to iPhone, then delete the note.

**IMPORTANT**: Never email your private key or put it in cloud storage!

---

## Verification Checklist
- [ ] SSH enabled on Mac (Remote Login ON)
- [ ] SSH key pair generated (~/.ssh/id_ed25519 and .pub)
- [ ] Public key added to ~/.ssh/authorized_keys
- [ ] Local SSH test works (`ssh localhost`)
- [ ] Tailscale SSH test works (`ssh <tailscale-ip>`)
- [ ] Private key exported for mobile transfer
- [ ] (Optional) SSH restricted to Tailscale interface only

---

## Troubleshooting

### "Permission denied (publickey)"
```bash
# Check key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Verify key is in authorized_keys
cat ~/.ssh/authorized_keys
```

### "Connection refused"
```bash
# Check SSH is running
sudo lsof -i :22

# If not running, enable it
sudo systemsetup -setremotelogin on
```

### After sshd_config changes, can't connect
```bash
# SSH from Mac terminal locally first to verify
ssh 127.0.0.1

# If locked out, use GUI:
# System Settings → General → Sharing → Remote Login → OFF then ON
```

---

## Security Notes
- Your private key passphrase is crucial - use a strong one
- If your iPhone is lost/stolen, generate new keys and remove old public key from authorized_keys
- Private key never leaves your devices (it's not stored in any cloud)

---

## Artifacts
- SSH key pair: `~/.ssh/id_ed25519` and `~/.ssh/id_ed25519.pub`
- SSH config: `~/.ssh/config`
- Key passphrase (save in password manager)

## Next Task
→ task-88: Configure iPhone terminal app with SSH key
