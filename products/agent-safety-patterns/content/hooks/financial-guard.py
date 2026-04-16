#!/usr/bin/env python3
"""
Financial Guard PreToolUse Hook

Blocks any command or tool invocation involving wallet addresses, transfer
operations, or financial APIs unless explicitly confirmed via environment variable.

This is a kill switch. When FINANCIAL_GUARD_CONFIRM is not set to "true",
ALL financial operations are blocked. There is no partial mode.

Exit codes:
  0 - Allow the tool execution
  2 - Block the tool execution (returns error message to agent)

Environment variables:
  FINANCIAL_GUARD_CONFIRM - Set to "true" to allow financial operations.
                            Must be set per-session. Unset after use.
  FINANCIAL_GUARD_MAX_AMOUNT - Maximum allowed transaction amount in USD (default: 100).
  FINANCIAL_GUARD_APPROVED_ADDRESSES - Comma-separated list of approved wallet addresses.

Usage:
  Register as a PreToolUse hook matching "Bash" (and any MCP tools that touch finances).

  Test manually:
    echo '{"tool_name":"Bash","tool_input":{"command":"cast send 0xABC..."}}' | python financial-guard.py
    # Should exit 2 (blocked, FINANCIAL_GUARD_CONFIRM not set)

    FINANCIAL_GUARD_CONFIRM=true echo '{"tool_name":"Bash","tool_input":{"command":"cast send 0xABC..."}}' | python financial-guard.py
    # Should exit 0 (allowed)
"""

import sys
import json
import re
import os

# Patterns that indicate financial operations
FINANCIAL_PATTERNS = [
    # Wallet addresses (Ethereum-style)
    r"0x[a-fA-F0-9]{40}",

    # Transfer/send keywords in command context
    r"\btransfer\b.*\b(usdc|usdt|eth|matic|token|funds|balance)\b",
    r"\b(usdc|usdt|eth|matic|token|funds|balance)\b.*\btransfer\b",
    r"\bsend\b.*\b(usdc|usdt|eth|matic|token|funds)\b",
    r"\b(usdc|usdt|eth|matic|token|funds)\b.*\bsend\b",

    # Foundry/cast commands (Ethereum CLI tools)
    r"\bcast\s+(send|call|tx)\b",
    r"\bforge\s+script\b.*broadcast",

    # Web3/ethers transaction patterns
    r"\bsendTransaction\b",
    r"\btransferFrom\b",
    r"\bapprove\b.*0x[a-fA-F0-9]{40}",

    # Exchange/trading API endpoints
    r"api\.(binance|coinbase|kraken|polymarket|dydx)",
    r"/v[0-9]/order",
    r"/v[0-9]/withdraw",

    # Direct financial tool keywords
    r"\bwithdraw(al)?\b",
    r"\bswap\b.*\btoken\b",
    r"\btoken\b.*\bswap\b",
    r"\bmint\b.*\btoken\b",
    r"\bburn\b.*\btoken\b",
]

# Patterns that extract amounts from commands
AMOUNT_PATTERNS = [
    r"(\d+(?:\.\d+)?)\s*(?:usdc|usdt|usd|eth|matic)",
    r"amount[=:]\s*(\d+(?:\.\d+)?)",
    r"value[=:]\s*(\d+(?:\.\d+)?)",
    r"--amount\s+(\d+(?:\.\d+)?)",
]


def is_financial_operation(tool_name, tool_input):
    """
    Determine if a tool invocation involves financial operations.

    Checks the command (for Bash) or all string values in tool_input
    against the financial patterns list.
    """
    text_to_check = ""

    if tool_name == "Bash":
        text_to_check = tool_input.get("command", "")
    else:
        # For non-Bash tools, concatenate all string values
        for value in tool_input.values():
            if isinstance(value, str):
                text_to_check += " " + value

    if not text_to_check:
        return False, None

    for pattern in FINANCIAL_PATTERNS:
        try:
            match = re.search(pattern, text_to_check, re.IGNORECASE)
            if match:
                return True, pattern
        except re.error:
            continue

    return False, None


def extract_amount(text):
    """
    Attempt to extract a dollar amount from the command text.
    Returns the amount as a float, or None if no amount is found.
    """
    for pattern in AMOUNT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                continue
    return None


def check_approved_address(text):
    """
    Check if any wallet addresses in the text are on the approved list.
    Returns (all_approved, unapproved_addresses).
    """
    approved_raw = os.environ.get("FINANCIAL_GUARD_APPROVED_ADDRESSES", "")
    if not approved_raw:
        # No approved addresses configured; any address is unapproved
        addresses_found = re.findall(r"0x[a-fA-F0-9]{40}", text)
        return len(addresses_found) == 0, addresses_found

    approved = {addr.strip().lower() for addr in approved_raw.split(",") if addr.strip()}
    addresses_found = re.findall(r"0x[a-fA-F0-9]{40}", text)

    unapproved = [addr for addr in addresses_found if addr.lower() not in approved]
    return len(unapproved) == 0, unapproved


def main():
    """Main hook entry point."""
    try:
        hook_input = sys.stdin.read()
        hook_data = json.loads(hook_input)

        tool_name = hook_data.get("tool_name", "")
        tool_input = hook_data.get("tool_input", {})

        # Check if this is a financial operation
        is_financial, matched_pattern = is_financial_operation(tool_name, tool_input)

        if not is_financial:
            sys.exit(0)

        # This IS a financial operation. Check the confirmation gate.
        confirmed = os.environ.get("FINANCIAL_GUARD_CONFIRM", "").lower() == "true"

        if not confirmed:
            print(
                f"BLOCKED: Financial operation detected but FINANCIAL_GUARD_CONFIRM is not set.\n"
                f"Matched pattern: '{matched_pattern}'\n"
                f"To allow financial operations for this session, set:\n"
                f"  export FINANCIAL_GUARD_CONFIRM=true\n"
                f"Unset this variable when financial operations are complete.",
                file=sys.stderr,
            )
            sys.exit(2)

        # Confirmation is set. Check amount limits.
        command_text = tool_input.get("command", "")
        if not command_text:
            command_text = " ".join(
                str(v) for v in tool_input.values() if isinstance(v, str)
            )

        max_amount = float(os.environ.get("FINANCIAL_GUARD_MAX_AMOUNT", "100"))
        amount = extract_amount(command_text)

        if amount is not None and amount > max_amount:
            print(
                f"BLOCKED: Transaction amount ${amount:.2f} exceeds limit of ${max_amount:.2f}.\n"
                f"To increase the limit, set:\n"
                f"  export FINANCIAL_GUARD_MAX_AMOUNT={int(amount) + 50}\n"
                f"Consider whether this amount is correct before increasing.",
                file=sys.stderr,
            )
            sys.exit(2)

        # Check address approval
        all_approved, unapproved = check_approved_address(command_text)

        if not all_approved and unapproved:
            print(
                f"BLOCKED: Unapproved wallet address(es) detected: {', '.join(unapproved[:3])}\n"
                f"Add approved addresses to FINANCIAL_GUARD_APPROVED_ADDRESSES:\n"
                f"  export FINANCIAL_GUARD_APPROVED_ADDRESSES=\"addr1,addr2,...\"",
                file=sys.stderr,
            )
            sys.exit(2)

        # All checks passed
        sys.exit(0)

    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse hook input: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open. Change to sys.exit(2) for production.

    except Exception as e:
        print(f"ERROR: Financial guard hook failed: {e}", file=sys.stderr)
        sys.exit(0)  # Fail open. Change to sys.exit(2) for production.


if __name__ == "__main__":
    main()
