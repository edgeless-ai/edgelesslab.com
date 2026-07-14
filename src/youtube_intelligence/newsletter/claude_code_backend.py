"""
Claude Code backend for newsletter synthesis.
Replaces OpenRouter API calls with claude -p subprocess calls.
Uses the user's existing Claude Code subscription (no API keys needed).
"""

import json
import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class LLMResponse:
    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    finish_reason: Optional[str] = None
    structured_output: Optional[dict] = None


def _find_claude_binary() -> str:
    """Find claude binary in common locations."""
    for path in [
        "claude",
        "/Users/djm/.local/bin/claude",
        "/Users/djm/.bun/bin/claude",
    ]:
        result = subprocess.run(
            ["which", path] if not path.startswith("/") else ["test", "-x", path],
            capture_output=True,
        )
        if path.startswith("/"):
            if result.returncode == 0:
                return path
        else:
            if result.returncode == 0:
                return path.strip()
    raise RuntimeError("claude binary not found")


def _call_claude_p(prompt: str, max_tokens: int = 2000, json_mode: bool = False) -> LLMResponse:
    """Call Claude via claude -p subprocess."""
    claude = _find_claude_binary()

    # Build system hint for JSON mode
    system = None
    if json_mode:
        system = "You are a helpful assistant. Respond ONLY with valid JSON. No markdown, no explanations outside the JSON."

    # claude -p does NOT support --system flag; include system prompt inline
    if system:
        full_prompt = f"[{system}]\n\n{prompt}"
    else:
        full_prompt = prompt

    # Create temp file for prompt
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(full_prompt)
        prompt_file = f.name

    try:
        cmd = [claude, "-p", f"@{prompt_file}"]

        # Ensure critical env vars are present for Claude auth
        env = os.environ.copy()
        # Force the Claude Code subscription, never the API account. Cron wrappers
        # (run_newsletter.sh) `source .env` which exports a (possibly depleted)
        # ANTHROPIC_API_KEY; if claude -p inherits it, it bills the API account and
        # prints "Credit balance is too low" to stdout, which then leaked into the
        # newsletter subject. Stripping these makes claude -p use the logged-in subscription.
        for auth_key in ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_TOKEN"]:
            env.pop(auth_key, None)
        for key in ["SHELL", "USER", "LOGNAME", "HOME"]:
            if not env.get(key):
                if key == "SHELL":
                    env[key] = "/bin/bash"
                elif key == "USER":
                    env[key] = subprocess.check_output(["whoami"], text=True).strip()
                elif key == "LOGNAME":
                    env[key] = env.get("USER", "djm")
                elif key == "HOME":
                    env[key] = "/Users/djm"

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )

        text = result.stdout.strip()

        if result.returncode != 0 and not text:
            raise RuntimeError(f"claude -p failed: {result.stderr[:200]}")

        # Guard: claude -p can print an auth/billing error to stdout with exit 0
        # (e.g. "Credit balance is too low", "Invalid API key"). Never let such a
        # string be mistaken for model output and leak into a subject/theme.
        _err_signatures = (
            "credit balance is too low",
            "invalid api key",
            "authentication_error",
            "your credit balance",
            "rate limit",
            "not logged in",
            "please run /login",
        )
        low = text.lower()
        if text and len(text) < 200 and any(sig in low for sig in _err_signatures):
            raise RuntimeError(f"claude -p returned an auth/billing error, not content: {text[:120]!r}")

        # Extract JSON if in json_mode
        structured_output = None
        if json_mode and text:
            # Try to find JSON block
            try:
                start = text.index("{")
                end = text.rindex("}") + 1
                structured_output = json.loads(text[start:end])
            except (ValueError, json.JSONDecodeError):
                pass

        return LLMResponse(
            text=text,
            input_tokens=len(full_prompt) // 4,
            output_tokens=len(text) // 4,
            structured_output=structured_output,
        )
    finally:
        Path(prompt_file).unlink(missing_ok=True)


class ClaudeCodeClient:
    """Drop-in replacement for LLMClient that uses claude -p."""

    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        json_mode: bool = False,
        json_schema: Optional[dict] = None,
        model: Optional[str] = None,
        model_tier: Optional[str] = None,
    ) -> LLMResponse:
        return _call_claude_p(prompt, max_tokens, json_mode)


def _freellmapi_key() -> Optional[str]:
    """Resolve the freellmapi key: env first, then the canonical hermes config."""
    for var in ("FREELMAPI_API_KEY", "FREELLMAPI_API_KEY"):
        if os.environ.get(var):
            return os.environ[var]
    # Fall back to the canonical local store (~/.hermes/config.yaml) so we never
    # duplicate the secret into this repo. Cheap line scan — no yaml dep.
    cfg = Path.home() / ".hermes" / "config.yaml"
    try:
        for line in cfg.read_text().splitlines():
            s = line.strip()
            if s.startswith("api_key:") and "freellmapi-" in s:
                return s.split("api_key:", 1)[1].strip().strip('"\'')
    except Exception:
        pass
    return None


class FreeLLMAPIClient:
    """
    Drop-in LLM client backed by the local FreeLLMAPI gateway (free, no cloud
    credits). OpenAI-compatible; used as the default newsletter synthesis backend
    because `claude -p` (subscription) and OpenRouter (paid credits) both fail
    unattended. Stdlib-only (urllib) — no new dependencies.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None,
                 model: str = "auto", timeout: int = 120):
        self.base_url = (base_url or os.environ.get("FREELMAPI_BASE_URL")
                         or "http://localhost:3001/v1").rstrip("/")
        self.api_key = api_key or _freellmapi_key()
        self.model = model
        self.timeout = timeout

    @staticmethod
    def is_available(base_url: Optional[str] = None, timeout: int = 4) -> bool:
        import urllib.request
        url = (base_url or os.environ.get("FREELMAPI_BASE_URL")
               or "http://localhost:3001/v1").rstrip("/").rsplit("/v1", 1)[0]
        try:
            with urllib.request.urlopen(f"{url}/api/ping", timeout=timeout) as r:
                return r.status == 200
        except Exception:
            return False

    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False,
        json_mode: bool = False,
        json_schema: Optional[dict] = None,
        model: Optional[str] = None,
        model_tier: Optional[str] = None,
    ) -> LLMResponse:
        import urllib.request
        messages = []
        if json_mode:
            system = ((system or "") + " Respond ONLY with valid JSON, no markdown.").strip()
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": model or self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode(),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode())
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or ""
        text = text.strip()
        if not text:
            raise RuntimeError("freellmapi returned empty content")
        structured_output = None
        if json_mode and text:
            try:
                start = text.index("{"); end = text.rindex("}") + 1
                structured_output = json.loads(text[start:end])
            except (ValueError, json.JSONDecodeError):
                pass
        usage = data.get("usage", {})
        return LLMResponse(
            text=text,
            input_tokens=usage.get("prompt_tokens", len(prompt) // 4),
            output_tokens=usage.get("completion_tokens", len(text) // 4),
            structured_output=structured_output,
        )
