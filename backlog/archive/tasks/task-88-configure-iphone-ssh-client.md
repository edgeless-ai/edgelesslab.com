---
id: task-88
title: Configure iPhone terminal app with SSH key and tmux
epic: 1-kernel
status: completed
completed_date: 2026-01-27
priority: P2
depends_on: [task-86, task-87]
blocks: [task-89]
created: 2026-01-26
owner: david
estimated_effort: 30min
---

# Task 88: Configure iPhone Terminal App with SSH Key and Tmux

## Goal
Install a terminal app on iPhone, import your SSH private key, and successfully connect to your Mac to run Claude Code via tmux.

## Context
With Tailscale (task-86) and SSH (task-87) configured, you now need a terminal app on your iPhone that can SSH into your Mac. We'll also set up tmux on the Mac for persistent sessions.

---

## Prerequisites
- Completed task-86 (Tailscale on Mac and iPhone)
- Completed task-87 (SSH keys generated, private key exported)
- Mac's Tailscale IP address
- SSH private key passphrase

---

## Step-by-Step Instructions

### Step 1: Install Terminal App on iPhone

**Recommended Apps** (in order of preference):

| App | Price | Pros | Cons |
|-----|-------|------|------|
| **Termius** | Free (paid Pro) | Best free option, clean UI, key management | Some features require subscription |
| **Blink Shell** | $19.99 | Best overall, native mosh support | Paid only |
| **Prompt 3** | $24.99 | Polished Apple design | Paid only |
| **a]Shell** | Free | Lightweight | Basic features |

**For this guide, we'll use Termius (free):**
1. Open App Store
2. Search "Termius"
3. Install "Termius - Terminal & SSH Client"
4. Open app and create account (or skip)

### Step 2: Import SSH Private Key into Termius

1. Open Termius app
2. Tap **Keychain** (bottom nav)
3. Tap **+** button → **Import**
4. Choose import method:

**If you AirDropped the key:**
- Tap "Files"
- Navigate to the key file
- Import it

**If you copied to clipboard:**
- Tap "Paste from clipboard"
- Paste the entire key (including BEGIN/END lines)
- Tap "Import"

5. Name the key: "MacBook SSH Key" (or similar)
6. When prompted, enter your key passphrase

### Step 3: Create SSH Host Entry in Termius

1. Tap **Hosts** (bottom nav)
2. Tap **+** button → **New Host**
3. Fill in:
   - **Alias**: `macbook` (or whatever you prefer)
   - **Hostname**: `100.x.x.x` (your Mac's Tailscale IP from task-86)
   - **Port**: `22` (default)
   - **Username**: `djm` (your Mac username)
   - **Key**: Select the key you imported
4. Tap **Save**

### Step 4: Test SSH Connection from iPhone

1. Ensure Tailscale is connected on iPhone (open Tailscale app, toggle should be ON)
2. In Termius, tap on your "macbook" host
3. First connection will show fingerprint warning - tap "Continue"
4. Enter key passphrase if prompted
5. You should see your Mac's terminal prompt!

```bash
# Verify you're connected
whoami
# Should show: djm

pwd
# Should show: /Users/djm
```

### Step 5: Install tmux on Mac (If Not Already Installed)

From the SSH session (or on Mac directly):
```bash
# Check if tmux is installed
which tmux

# If not installed:
brew install tmux

# Verify
tmux -V
# Should show: tmux 3.x
```

### Step 6: Create Persistent Claude Code Session

On your Mac (via SSH or directly):
```bash
# Create a new tmux session named "claude" in your project directory
tmux new-session -d -s claude -c /Users/djm/claude-projects

# Start Claude Code in that session
tmux send-keys -t claude 'claude' Enter

# Verify session exists
tmux list-sessions
# Should show: claude: 1 windows (created ...)
```

### Step 7: Connect to Claude Session from iPhone

In Termius on iPhone:
```bash
# Attach to the existing Claude session
tmux attach -t claude

# You should now see Claude Code running!
# You can interact with it normally
```

### Step 8: Learn Essential tmux Commands

**While in tmux session:**
| Command | Action |
|---------|--------|
| `Ctrl+B, D` | Detach (leave session running) |
| `Ctrl+B, [` | Scroll mode (use finger to scroll, q to exit) |
| `Ctrl+B, c` | Create new window |
| `Ctrl+B, n` | Next window |
| `Ctrl+B, p` | Previous window |
| `Ctrl+B, 0-9` | Switch to window by number |

**From command line:**
```bash
tmux list-sessions      # List all sessions
tmux attach -t claude   # Attach to 'claude' session
tmux kill-session -t X  # Kill session X
```

### Step 9: Create Convenience Script (Optional)

On Mac, create a script to ensure Claude session exists:
```bash
cat << 'EOF' > ~/scripts/claude-session.sh
#!/bin/bash
# Ensure Claude Code session exists

if ! tmux has-session -t claude 2>/dev/null; then
    echo "Creating new Claude session..."
    tmux new-session -d -s claude -c /Users/djm/claude-projects
    tmux send-keys -t claude 'claude' Enter
    sleep 2
fi

echo "Claude session ready. Attaching..."
tmux attach -t claude
EOF

chmod +x ~/scripts/claude-session.sh
```

Now from iPhone you can just run:
```bash
~/scripts/claude-session.sh
```

### Step 10: Configure Termius for Quick Access

1. In Termius, tap on your macbook host entry
2. Tap **Edit**
3. Scroll to **Startup snippet**
4. Add: `tmux attach -t claude || tmux new-session -s claude -c /Users/djm/claude-projects`
5. Save

Now tapping the host will auto-attach to Claude session!

---

## Daily Workflow

1. **Open Tailscale** on iPhone (ensure connected)
2. **Open Termius** → Tap "macbook" host
3. **Claude Code appears** (auto-attached to tmux session)
4. **Work with Claude** as normal
5. **When done**: `Ctrl+B, D` to detach (session stays running)
6. **Later**: Reconnect and session is exactly where you left it

---

## Verification Checklist
- [ ] Terminal app installed on iPhone (Termius recommended)
- [ ] SSH private key imported into terminal app
- [ ] Host entry created with Tailscale IP
- [ ] SSH connection successful from iPhone to Mac
- [ ] tmux installed on Mac
- [ ] Claude Code session created and running in tmux
- [ ] Successfully attached to Claude session from iPhone
- [ ] Know how to detach (`Ctrl+B, D`) and reattach
- [ ] (Optional) Startup snippet configured for auto-attach

---

## Troubleshooting

### "Connection refused" from iPhone
1. Check Tailscale is connected on BOTH devices
2. Verify Mac's SSH is enabled: `sudo lsof -i :22`
3. Confirm correct Tailscale IP

### "Permission denied"
1. Verify key was imported correctly
2. Check key passphrase is correct
3. On Mac: `cat ~/.ssh/authorized_keys` should contain your public key

### tmux session not found
```bash
# Check if session exists
tmux list-sessions

# Create it if missing
tmux new-session -d -s claude -c /Users/djm/claude-projects
tmux send-keys -t claude 'claude' Enter
```

### Slow/laggy connection
- Tmux helps buffer input/output
- If still slow, check internet connection quality
- Consider enabling tmux aggressive-resize: `setw -g aggressive-resize on`

### Text wrapping issues
```bash
# In tmux, resize to current terminal size
tmux resize-pane -x $(tput cols) -y $(tput lines)

# Or detach and reattach
Ctrl+B, D
tmux attach -t claude
```

---

## Security Reminders
- Never share your private key
- If iPhone is lost: generate new keys on Mac, remove old public key from `~/.ssh/authorized_keys`
- Key passphrase adds protection even if private key is compromised

---

## Artifacts
- Terminal app configured with SSH key
- Claude tmux session running persistently
- (Optional) `~/scripts/claude-session.sh` convenience script

## Next Task
→ task-89: (Optional) Set up tmux configuration for better mobile experience
