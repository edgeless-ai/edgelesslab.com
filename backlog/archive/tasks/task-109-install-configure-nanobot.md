---
id: 109
title: "Install and configure nanobot"
epic: kernel
status: pending
priority: P2
effort: M
owner: david
created: 2026-02-03
depends_on: [108]
blocks: [110]
tags: [vps-migration, nanobot, ai-agent]
parent_epic: 106
---

# Task 109: Install and Configure nanobot

## Objective

Deploy nanobot AI assistant with Kimi K2.5 via OpenRouter.

## Phase 1: Python Environment

```bash
# SSH to VPS as nanobot user
ssh nanobot@<IP>

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Verify
python3.11 --version

# Create virtual environment
cd ~
python3.11 -m venv .nanobot-venv
source .nanobot-venv/bin/activate
```

## Phase 2: Install nanobot

```bash
pip install nanobot-ai
nanobot --version
```

## Phase 3: Initialize and Configure

```bash
mkdir -p ~/nanobot
cd ~/nanobot
nanobot init
```

### Create .env file

```bash
cat > ~/nanobot/.env << 'EOF'
OPENROUTER_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-backup-key>
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_OWNER_ID=<your-user-id>
GATEWAY_SECRET=<generate-random-32-char>
OWNER_ONLY_MODE=true
EOF

chmod 600 ~/nanobot/.env
nano ~/nanobot/.env  # Edit with real values
```

### Create config.yaml

```bash
cat > ~/nanobot/config.yaml << 'EOF'
llm:
  provider: openrouter
  default_model: moonshotai/kimi-k2.5
  fallback_model: anthropic/claude-sonnet-4

providers:
  openrouter:
    api_key: ${OPENROUTER_API_KEY}
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}

telegram:
  bot_token: ${TELEGRAM_BOT_TOKEN}
  owner_id: ${TELEGRAM_OWNER_ID}
  owner_only: true

memory:
  enabled: true
  persistence_path: ./data/memory

scheduler:
  enabled: true
  timezone: America/Los_Angeles
EOF
```

## Phase 4: Test

```bash
nanobot doctor

# Start manually for testing
nanobot run

# Test in Telegram - send /start to your bot
# Send: "What's 2+2?"
# Ctrl+C to stop
```

## Phase 5: Create Systemd Service

```bash
sudo tee /etc/systemd/system/nanobot.service << 'EOF'
[Unit]
Description=nanobot AI Assistant
After=network.target

[Service]
Type=simple
User=nanobot
Group=nanobot
WorkingDirectory=/home/nanobot/nanobot
Environment=PATH=/home/nanobot/.nanobot-venv/bin:/usr/bin
EnvironmentFile=/home/nanobot/nanobot/.env
ExecStart=/home/nanobot/.nanobot-venv/bin/nanobot run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nanobot
sudo systemctl start nanobot
sudo systemctl status nanobot
```

## Acceptance Criteria

- [ ] Python 3.11 installed
- [ ] nanobot installed via pip
- [ ] .env configured with real credentials
- [ ] config.yaml set up for Kimi K2.5 + Claude fallback
- [ ] `nanobot doctor` passes all checks
- [ ] Telegram bot responds to messages
- [ ] Systemd service running and enabled
- [ ] Service survives reboot

## Verification Commands

```bash
sudo systemctl status nanobot
sudo journalctl -u nanobot -f
```

## Time Estimate

45-60 minutes

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
