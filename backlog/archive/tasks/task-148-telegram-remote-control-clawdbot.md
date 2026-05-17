---
id: 148
title: "Implement Telegram Remote Control for Claude Code (ClawdBot/OpenClawd Pattern)"
epic: 1-kernel
priority: P1
effort: L
status: done
completed: 2026-03-21
completion_note: Hermes agent on VPS handles this, plus claude remote-control exists natively
depends_on: []
blocks: []
created: 2026-03-07
source: "YouTube intelligence - ClawdBot/OpenClawd videos (Videos 5, 6, 20)"
tags: [telegram, remote-control, mobile, agent, infrastructure]
---

# Task 148: Implement Telegram Remote Control for Claude Code

## Goal
Set up a Telegram bot that bridges to Claude Code sessions, enabling mobile command-and-control of the agent system from iPhone/iPad without SSH.

## Context
Multiple YouTube creators have demonstrated the "ClawdBot" / "OpenClawd" pattern:
- **ClawdBot**: Telegram bot that spawns Claude Code CLI sessions, forwards messages bidirectionally
- **OpenClawd**: Open-source framework for WhatsApp/Telegram/Discord bridges to Claude Code
- **Key insight**: Claude Code's headless mode (`--print`) makes it trivially bridgeable to any messaging platform

Currently we use Tailscale + SSH + tmux for mobile access (tasks 86-89). Telegram would be a massive UX improvement — push notifications, inline keyboards, photo/file sharing, conversation threads.

## Architecture Options

### Option A: Lightweight Custom Bot (Recommended)
- Python `python-telegram-bot` library
- Spawns `claude --print` subprocess per conversation
- Maps Telegram chat threads to Claude Code sessions
- Runs on VPS (Hetzner after migration, or current Hostinger)

### Option B: OpenClawd Framework
- Fork/deploy the open-source OpenClawd project
- Supports multiple platforms (Telegram + Discord + WhatsApp)
- More features but more complexity
- Evaluate: https://github.com/search for "openclawd" or similar

### Option C: n8n Workflow Bridge
- Use existing n8n instance to bridge Telegram webhook → Claude Code
- Lower maintenance but less interactive

## Acceptance Criteria
- [ ] Telegram bot responds to messages by forwarding to Claude Code CLI
- [ ] Supports multi-turn conversations (session persistence)
- [ ] Can execute commands: `/status`, `/cron`, `/backlog`, `/ask <question>`
- [ ] Handles long responses (Telegram 4096 char limit) with pagination or file upload
- [ ] Photo/screenshot sharing works (Claude Code can view images)
- [ ] Push notifications for cron job completions or errors
- [ ] Authentication: only responds to authorized Telegram user IDs
- [ ] Runs as persistent service (pm2 or systemd on VPS)
- [ ] Graceful session timeout and cleanup

## Implementation Steps
1. Create Telegram bot via @BotFather, get token
2. Build Python bridge: Telegram ↔ Claude Code `--print` mode
3. Add session management (map chat_id → subprocess)
4. Add command handlers (`/status`, `/cron`, `/backlog`)
5. Deploy to VPS with pm2
6. Test from iPhone
7. Add push notification hooks for cron job events

## Security Considerations
- Whitelist only authorized Telegram user IDs
- Never echo API keys or credentials
- Rate limit to prevent abuse
- Session isolation between conversations

## Artifacts
- `telegram-bot/` directory with bot code
- pm2 ecosystem config
- Documentation in vault
