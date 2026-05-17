---
id: 107
title: "Gather API keys and Telegram credentials"
epic: kernel
status: done
priority: P2
effort: S
owner: david
created: 2026-02-03
depends_on: []
blocks: [108]
tags: [vps-migration, credentials, setup]
parent_epic: 106
---

# Task 107: Gather API Keys and Telegram Credentials

## Objective

Collect all required API keys and credentials before VPS provisioning begins.

## Checklist

### OpenRouter API Key
- [ ] Create account at https://openrouter.ai/
- [ ] Generate API key at https://openrouter.ai/keys
- [ ] Save key securely (format: `sk-or-v1-xxxxx`)
- [ ] Note: ~$45 credits already loaded

### Telegram Bot
- [ ] Open Telegram app
- [ ] Search for @BotFather
- [ ] Send `/newbot`
- [ ] Choose display name (e.g., "David's Assistant")
- [ ] Choose username (must end in `_bot`)
- [ ] Save bot token (format: `123456789:ABCdefGHI...`)
- [ ] Send `/setprivacy` → Select bot → "Disable"

### Telegram User ID
- [ ] Search for @userinfobot in Telegram
- [ ] Send any message
- [ ] Save your numeric user ID

### SSH Key Verification
- [ ] Verify `~/.ssh/id_ed25519.pub` exists (or `id_rsa.pub`)
- [ ] Copy public key content for Hetzner setup

## Deliverables

Store credentials in secure location (not in git):

```bash
# Example: Store in macOS Keychain or encrypted file
# DO NOT store in plain text files

OPENROUTER_API_KEY=sk-or-v1-xxxxx
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_OWNER_ID=123456789
```

## Acceptance Criteria

- [ ] OpenRouter API key obtained and tested
- [ ] Telegram bot created and token saved
- [ ] Telegram user ID obtained
- [ ] SSH public key ready for Hetzner
- [ ] All credentials stored securely

## Time Estimate

15-20 minutes

---

*Part of Epic 106: VPS Migration & nanobot Deployment*
