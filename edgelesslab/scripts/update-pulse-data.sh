#!/bin/bash
# Update Pulse (living content wall) data
# Run via cron every 5 minutes for fresh fleet data
cd "$(dirname "$0")/.."
python3 scripts/generate_content_wall.py
