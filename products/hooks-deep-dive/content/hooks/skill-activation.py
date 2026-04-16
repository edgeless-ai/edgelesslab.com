#!/usr/bin/env python3
"""
skill-activation.py -- UserPromptSubmit Hook
Analyzes user prompts and suggests relevant skills (slash commands).

Implements progressive disclosure: instead of showing all skills at session
start, this hook waits until the user's prompt matches a skill's trigger
keywords, then suggests it via additionalContext injection.

Stdin JSON (UserPromptSubmit):
  {"prompt": "I need to deploy the app to production"}

Stdout JSON:
  {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit",
   "additionalContext": "Relevant skills: /deploy (production deployment)"}}

Security hardening:
  - Config integrity verification via SHA-256 hash
  - Input size limits (100KB max)
  - No dynamic sys.path manipulation
  - Symlink attack prevention on config paths
"""

import json
import os
import sys
import re
import hashlib
from pathlib import Path

# -----------------------------------------------------------------------
# CUSTOMIZE THESE for your project
# -----------------------------------------------------------------------

# Path to skill rules configuration (JSON)
SKILL_RULES_PATH = Path(__file__).parent.parent / "skill-rules.json"

# Skills directory (for YAML-based skill discovery, optional)
SKILLS_DIR = Path(__file__).parent.parent / "skills"

# Set to None to disable integrity checking.
# Generate with: python3 -c "import hashlib; print(hashlib.sha256(open('path/to/skill-rules.json').read().encode()).hexdigest())"
EXPECTED_CONFIG_HASH = None

# Max input size to prevent DoS
MAX_INPUT_SIZE = 100_000

# -----------------------------------------------------------------------


def verify_config_integrity(content):
    """Verify skill-rules.json has not been tampered with."""
    if EXPECTED_CONFIG_HASH is None:
        return True
    actual_hash = hashlib.sha256(content.encode()).hexdigest()
    return actual_hash == EXPECTED_CONFIG_HASH


def load_skill_rules():
    """Load skill rules from configuration file with integrity verification."""
    default_rules = {"skills": [], "global_rules": {"suggest_skills": True}}

    if not SKILL_RULES_PATH.exists():
        return default_rules

    # Verify path is within expected directory (prevent symlink attacks)
    try:
        resolved = SKILL_RULES_PATH.resolve()
        expected_parent = Path(__file__).parent.parent.resolve()
        if not str(resolved).startswith(str(expected_parent)):
            return default_rules
    except (OSError, ValueError):
        return default_rules

    try:
        content = SKILL_RULES_PATH.read_text()
        if not verify_config_integrity(content):
            return default_rules  # Config tampered, fail closed
        return json.loads(content)
    except (json.JSONDecodeError, OSError):
        return default_rules


def analyze_prompt(prompt, rules):
    """Analyze a prompt and return matching skills.

    Supports two trigger types:
      - keyword:<word1>|<word2>  -- matches if any keyword is in the prompt
      - session_start           -- matches short greetings
    """
    matches = []
    prompt_lower = prompt.lower()

    for skill in rules.get("skills", []):
        trigger = skill.get("trigger", "")

        if trigger.startswith("keyword:"):
            keywords = trigger[8:].split("|")
            matched_kws = [kw for kw in keywords if kw in prompt_lower]
            if matched_kws:
                matches.append(
                    {
                        "name": skill["name"],
                        "description": skill.get("description", ""),
                        "reason": f"Matched keywords: {', '.join(matched_kws)}",
                    }
                )

        elif trigger == "session_start":
            indicators = ["hello", "hi", "start", "begin", "let's", "help me"]
            if any(ind in prompt_lower for ind in indicators) and len(prompt) < 100:
                matches.append(
                    {
                        "name": skill["name"],
                        "description": skill.get("description", ""),
                        "reason": "Session start detected",
                    }
                )

    return matches


def format_suggestions(matches):
    """Format skill suggestions as a concise one-line string."""
    if not matches:
        return ""

    hints = []
    for match in matches:
        name = match.get("name", "")
        desc = match.get("description", "")
        if desc:
            desc_short = desc.split(".")[0] if "." in desc else desc
            words = desc_short.split()[:5]
            hint = " ".join(words)
            if len(desc.split()) > 5:
                hint += "..."
        else:
            hint = match.get("reason", "relevant skill")
        hints.append(f"/{name} ({hint})")

    if not hints:
        return ""

    return f"\nRelevant skills: {', '.join(hints)}"


def validate_input(hook_input):
    """Validate and sanitize hook input."""
    prompt = hook_input.get("prompt", "")
    if not isinstance(prompt, str):
        prompt = ""
    prompt = prompt[:10000]  # Limit prompt length

    # Fallback fields
    if not prompt:
        content = hook_input.get("content", hook_input.get("message", ""))
        if isinstance(content, str):
            prompt = content[:10000]

    return {"prompt": prompt}


def main():
    """Main hook entry point."""
    try:
        raw_input = sys.stdin.read(MAX_INPUT_SIZE)
        hook_input = json.loads(raw_input)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    validated = validate_input(hook_input)
    prompt = validated.get("prompt", "")

    rules = load_skill_rules()
    matches = analyze_prompt(prompt, rules)

    response = {"continue": True}

    if matches and rules.get("global_rules", {}).get("suggest_skills", True):
        suggestions = format_suggestions(matches)
        if suggestions:
            response["hookSpecificOutput"] = {
                "hookEventName": "UserPromptSubmit",
                "additionalContext": suggestions,
            }

    print(json.dumps(response))


if __name__ == "__main__":
    main()
