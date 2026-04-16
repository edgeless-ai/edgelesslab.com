#!/usr/bin/env python3
"""
Template: UserPromptSubmit Enhancer
Analyzes user prompts and injects additional context into Claude's view.

Register in settings.json under hooks.UserPromptSubmit. No matcher needed
(UserPromptSubmit always fires on every prompt).

The additionalContext field appears in Claude's context as if injected by the
system. Use this to surface relevant docs, suggest commands, or add warnings.

Stdout JSON:
  {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit",
   "additionalContext": "Your injected context here"}}

Example registration (settings.json):
  {
    "hooks": {
      "UserPromptSubmit": [
        {
          "hooks": [{"type": "command", "command": ".claude/hooks/my-enhancer.py"}]
        }
      ]
    }
  }
"""

import json
import sys


def analyze_prompt(prompt):
    """Analyze the user's prompt and return context to inject, or None.

    Args:
        prompt: The user's prompt text.

    Returns:
        A string to inject as additionalContext, or None for no injection.
    """
    prompt_lower = prompt.lower()

    # Example: remind about testing when user mentions deployment
    if any(word in prompt_lower for word in ["deploy", "release", "ship"]):
        return (
            "Reminder: Run the test suite before deploying. "
            "Use `npm test` or `pytest` depending on the project."
        )

    # Example: surface relevant docs when user asks about configuration
    if "config" in prompt_lower or "settings" in prompt_lower:
        return "Project configuration lives in config/ and .claude/settings.json."

    # Example: warn about sensitive operations
    if "database" in prompt_lower and any(
        w in prompt_lower for w in ["delete", "drop", "truncate", "migrate"]
    ):
        return (
            "WARNING: Database mutation detected in prompt. "
            "Ensure you have a backup before proceeding."
        )

    return None


def main():
    try:
        raw = sys.stdin.read(100_000)
        hook_input = json.loads(raw)
        if not isinstance(hook_input, dict):
            hook_input = {}
    except (json.JSONDecodeError, ValueError):
        hook_input = {}

    prompt = hook_input.get("prompt", "")
    if not isinstance(prompt, str):
        prompt = hook_input.get("content", hook_input.get("message", ""))

    context = analyze_prompt(prompt)

    if context:
        print(
            json.dumps(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "UserPromptSubmit",
                        "additionalContext": context,
                    }
                }
            )
        )
    else:
        print(json.dumps({}))


if __name__ == "__main__":
    main()
