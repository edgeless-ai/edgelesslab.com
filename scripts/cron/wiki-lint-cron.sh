#!/bin/bash
# Weekly wiki-lint cron wrapper
# Schedule: Sunday 01:00 (low-traffic, before paperclip audit at 10:00)
# Uses existing cron-wrapper.sh for failure alerting and flock

exec /opt/homebrew/opt/python@3.11/bin/python3.11 /Users/djm/claude-projects/scripts/cron/wiki-lint.py
