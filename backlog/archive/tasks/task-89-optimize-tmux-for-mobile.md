---
id: task-89
title: Optimize tmux configuration for mobile Claude Code experience
epic: 1-kernel
status: completed
completed_date: 2026-01-27
priority: P3
depends_on: [task-88]
blocks: []
created: 2026-01-26
owner: david
estimated_effort: 20min
---

# Task 89: Optimize tmux Configuration for Mobile Claude Code Experience

## Goal
Configure tmux for a better mobile terminal experience with larger text, easier controls, and session persistence across reboots.

## Context
The default tmux configuration works but isn't optimized for small phone screens or touch input. This task adds quality-of-life improvements.

---

## Prerequisites
- Completed task-88 (iPhone SSH working with tmux)

---

## Step-by-Step Instructions

### Step 1: Create tmux Configuration File

```bash
# Create/edit tmux config
nano ~/.tmux.conf
```

Add this configuration:
```bash
# ================================================
# TMUX Configuration for Mobile Claude Code Access
# ================================================

# ----- Better Prefix Key -----
# Ctrl+B is awkward on mobile, Ctrl+A is easier
set -g prefix C-a
unbind C-b
bind C-a send-prefix

# ----- Mouse Support -----
# Essential for mobile - scroll and select with touch
set -g mouse on

# ----- Larger History -----
# More scrollback for long Claude conversations
set -g history-limit 50000

# ----- Visual Improvements -----
# Status bar at top (easier on mobile)
set -g status-position top

# Larger, clearer status bar
set -g status-style 'bg=#333333 fg=#ffffff'
set -g status-left '#[bg=#4444ff] #S #[bg=#333333] '
set -g status-left-length 20
set -g status-right '#[bg=#444444] %H:%M '

# Active window highlight
setw -g window-status-current-style 'bg=#4444ff fg=#ffffff bold'

# ----- Easier Window Navigation -----
# Use Alt+number to switch windows (easier than Ctrl+B, number)
bind -n M-1 select-window -t 1
bind -n M-2 select-window -t 2
bind -n M-3 select-window -t 3

# ----- Better Pane Splitting -----
# More intuitive split commands
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# ----- Quick Reload Config -----
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# ----- Session Persistence -----
# Resurrect sessions after reboot (requires plugin)
# See Step 3 for plugin installation

# ----- Quality of Life -----
# Start windows and panes at 1, not 0
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows when one is closed
set -g renumber-windows on

# Faster escape time (better for vim/emacs)
set -sg escape-time 10

# Aggressive resize (use largest client dimensions)
setw -g aggressive-resize on

# ----- Copy Mode Improvements -----
# Use vi-style keys in copy mode
setw -g mode-keys vi

# Scroll with touch (in copy mode)
bind -T copy-mode-vi WheelUpPane send -N3 -X scroll-up
bind -T copy-mode-vi WheelDownPane send -N3 -X scroll-down
```

Save and exit (Ctrl+X, Y, Enter).

### Step 2: Reload Configuration

```bash
# If in tmux, reload config
tmux source-file ~/.tmux.conf

# Or restart tmux sessions
tmux kill-server
```

### Step 3: (Optional) Install tmux Plugin Manager for Session Persistence

This allows your tmux sessions to survive Mac reboots:

```bash
# Install TPM (Tmux Plugin Manager)
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Add to bottom of `~/.tmux.conf`:
```bash
# ----- Plugins -----
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-resurrect'  # Save/restore sessions
set -g @plugin 'tmux-plugins/tmux-continuum'  # Auto-save every 15 min

# Resurrect settings
set -g @resurrect-capture-pane-contents 'on'
set -g @continuum-restore 'on'  # Auto-restore on tmux start

# Initialize TPM (keep at very bottom)
run '~/.tmux/plugins/tpm/tpm'
```

Install plugins:
```bash
# In tmux, press: Ctrl+A (or Ctrl+B), then I (capital i)
# This installs the plugins
```

### Step 4: Create Claude Auto-Start on Login (Optional)

To ensure Claude session exists even after Mac reboot:

```bash
# Create LaunchAgent
mkdir -p ~/Library/LaunchAgents

cat << 'EOF' > ~/Library/LaunchAgents/com.user.claude-tmux.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.claude-tmux</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>sleep 30 && /opt/homebrew/bin/tmux new-session -d -s claude -c /Users/djm/claude-projects 2>/dev/null || true</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the agent
launchctl load ~/Library/LaunchAgents/com.user.claude-tmux.plist
```

Note: This creates an empty session. You'll need to start Claude manually after reboot, or add Claude to the startup command (but that may timeout).

### Step 5: Test New Configuration

1. Kill existing tmux: `tmux kill-server`
2. Start new session: `tmux new-session -s claude -c /Users/djm/claude-projects`
3. Verify:
   - Status bar at top
   - Mouse scrolling works
   - `Ctrl+A` is now the prefix (instead of `Ctrl+B`)
   - Alt+1/2/3 switches windows

### Step 6: Mobile Keyboard Tips

**Termius on iPhone keyboard:**
- Ctrl key: Tap and hold the `123` button, then tap key
- Or enable "Extended keyboard" in Termius settings
- Termius has dedicated Ctrl/Alt/Esc buttons above keyboard

**Quick Reference (New Config):**
| Action | New Keys | Old Keys |
|--------|----------|----------|
| Prefix | `Ctrl+A` | `Ctrl+B` |
| Detach | `Ctrl+A, D` | `Ctrl+B, D` |
| Scroll | Touch scroll | `Ctrl+B, [` |
| New window | `Ctrl+A, C` | `Ctrl+B, C` |
| Switch window | `Alt+1/2/3` | `Ctrl+B, 1/2/3` |
| Reload config | `Ctrl+A, R` | - |

---

## Verification Checklist
- [ ] `~/.tmux.conf` created with mobile-optimized settings
- [ ] Configuration reloaded successfully
- [ ] Mouse scrolling works in tmux
- [ ] Status bar visible at top
- [ ] `Ctrl+A` prefix works
- [ ] (Optional) tmux-resurrect plugin installed
- [ ] (Optional) LaunchAgent created for auto-start

---

## Troubleshooting

### Mouse scrolling not working
```bash
# Verify mouse is enabled
tmux show -g mouse
# Should show: mouse on

# If not, reload config
tmux source-file ~/.tmux.conf
```

### Plugins not installing
```bash
# Make sure TPM is installed
ls ~/.tmux/plugins/tpm

# If missing, clone it again
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm

# Then in tmux: Ctrl+A, I
```

### Session not restoring after reboot
```bash
# Check continuum status
tmux run-shell ~/.tmux/plugins/tmux-continuum/scripts/continuum_status.sh

# Manual save
Ctrl+A, then Ctrl+S

# Manual restore
Ctrl+A, then Ctrl+R
```

---

## Final Mobile Workflow

1. **Open Tailscale** → Ensure connected
2. **Open Termius** → Tap "macbook"
3. **Auto-attached to Claude** (if startup snippet configured)
4. **Scroll with touch** (mouse mode enabled)
5. **Detach**: `Ctrl+A, D`
6. **Session persists** through disconnects AND reboots (with plugins)

---

## Artifacts
- `~/.tmux.conf` - Optimized tmux configuration
- `~/.tmux/plugins/` - Plugin directory (if using TPM)
- `~/Library/LaunchAgents/com.user.claude-tmux.plist` - Auto-start agent

## Mobile Access Complete!
With all four tasks complete (86-89), you have secure, persistent Claude Code access from your iPhone.
