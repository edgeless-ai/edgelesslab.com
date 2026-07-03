"""
The demand immune system — anti-spam / anti-Sybil checks on the "Want it" signal.

A design sits in the Bazaar once it clears the curator's art-quality gate (curator.py).
It graduates to the purchasable rack only on enough *verified* demand. This module is
the content analogue of the curator: where curator.py LOOKS at the art, this LOOKS at
the demand signal and decides whether a vote is organic or coordinated spam/Sybil.

Two layers:
  1. Hard heuristics (fail-CLOSED): malformed email, disposable domain, duplicate vote,
     burst/velocity from one email or IP, Sybil fan-out (one IP voting many designs).
     A failure here blocks the vote — no model can override it.
  2. A lightweight NIM "swarm" legitimacy score (fail-OPEN): asks an NVIDIA NIM text
     model to rate (design, email, pattern) as organic vs coordinated demand, 0-100.
     If NIM errors or is unconfigured we pass on the heuristic verdict — we never block
     a legitimate user on an API hiccup.
"""
from __future__ import annotations
import json
import os
import re
import time
import urllib.request

# Reuse the curator's base + key. curator.py uses a VISION model, so for text we use
# the same NIM base/key with a text model (per build spec).
NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
DEMAND_MODEL = "meta/llama-3.3-70b-instruct"

# Built-in disposable / throwaway email domains. Not exhaustive, but covers the common
# ones used for vote-stuffing. Matched on exact domain or as a suffix (subdomains).
DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
    "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
    "trashmail.com", "trashmail.net", "yopmail.com", "yopmail.net", "yopmail.fr",
    "throwawaymail.com", "getnada.com", "nada.email", "maildrop.cc", "dispostable.com",
    "fakeinbox.com", "mailnesia.com", "mintemail.com", "spam4.me", "mohmal.com",
    "sharklasers.com", "grr.la", "guerrillamailblock.com", "tmpmail.org", "emltmp.com",
    "discard.email", "33mail.com", "tempinbox.com", "spamgourmet.com", "mailcatch.com",
}

# Velocity thresholds. "history" is the persisted list of prior verified votes
# (each {slug, email, ip, ts}); these bound how fast one actor may legitimately vote.
WINDOW_SECONDS = 600          # 10-minute sliding window
MAX_EMAIL_VELOCITY = 5        # votes from one email in the window
MAX_IP_VELOCITY = 8           # votes from one IP in the window
MAX_IP_DISTINCT_SLUGS = 6     # distinct designs one IP may vote in the window (Sybil fan-out)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


def _domain(email: str) -> str:
    e = _norm_email(email)
    return e.rsplit("@", 1)[1] if "@" in e else ""


def _is_disposable(domain: str) -> bool:
    if not domain:
        return True
    if domain in DISPOSABLE_DOMAINS:
        return True
    # suffix match catches subdomains (e.g. foo.mailinator.com)
    return any(domain == d or domain.endswith("." + d) for d in DISPOSABLE_DOMAINS)


def _valid_email(email: str) -> bool:
    e = _norm_email(email)
    return bool(e) and len(e) <= 254 and bool(_EMAIL_RE.match(e))


def _heuristics(slug: str, email: str, ip: str, history) -> dict:
    """Hard checks. Returns {ok, reason}. ok=False here is fail-CLOSED (always blocks)."""
    e = _norm_email(email)
    if not _valid_email(e):
        return {"ok": False, "reason": "invalid_email"}
    if _is_disposable(_domain(e)):
        return {"ok": False, "reason": "disposable_email"}

    # Dedupe: same (slug, email) already voted.
    for h in (history or []):
        if h.get("slug") == slug and _norm_email(h.get("email")) == e:
            return {"ok": False, "reason": "already_voted"}

    now = time.time()
    recent = [h for h in (history or [])
              if isinstance(h.get("ts"), (int, float)) and (now - h["ts"]) <= WINDOW_SECONDS]
    email_hits = sum(1 for h in recent if _norm_email(h.get("email")) == e)
    if email_hits >= MAX_EMAIL_VELOCITY:
        return {"ok": False, "reason": "email_rate_limited"}

    if ip:
        ip_hits = sum(1 for h in recent if h.get("ip") == ip)
        if ip_hits >= MAX_IP_VELOCITY:
            return {"ok": False, "reason": "ip_rate_limited"}
        ip_slugs = {h.get("slug") for h in recent if h.get("ip") == ip}
        ip_slugs.add(slug)
        if len(ip_slugs) > MAX_IP_DISTINCT_SLUGS:
            return {"ok": False, "reason": "sybil_fanout"}

    return {"ok": True, "reason": None}


def _nim_legit_score(slug: str, email_domain: str, signals: dict) -> int | None:
    """Ask the NIM text model to rate organic-demand vs coordinated-spam, 0-100.
    Returns None on any error/unconfigured (caller fails OPEN). Never raises."""
    key = os.getenv("NVIDIA_NIM_API_KEY", "")
    if not key:
        return None
    prompt = (
        "You are the demand-signal immune system for an AI-design merch marketplace. "
        "A 'Want it' vote was cast on a design. Decide if this looks like ORGANIC demand "
        "or COORDINATED spam / Sybil vote-stuffing. Consider the email domain reputation "
        "and the recent voting pattern. "
        f"design_slug: {slug}. email_domain: {email_domain}. "
        f"recent_votes_same_email: {signals.get('email_hits', 0)}. "
        f"recent_votes_same_ip: {signals.get('ip_hits', 0)}. "
        f"distinct_designs_this_ip: {signals.get('ip_slugs', 0)}. "
        'Respond with ONLY a JSON object: '
        '{"legit_score": <0-100 int>, "reason": "<one short sentence>"}'
    )
    body = {
        "model": DEMAND_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 120, "temperature": 0,
    }
    req = urllib.request.Request(NIM_URL, method="POST", data=json.dumps(body).encode())
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            content = json.load(r)["choices"][0]["message"]["content"]
        s = content[content.index("{"): content.rindex("}") + 1]
        p = json.loads(s)
        return max(0, min(100, int(p.get("legit_score", 0))))
    except Exception:
        return None


# Below this NIM score a structurally-valid vote is treated as spam (soft gate).
NIM_LEGIT_THRESHOLD = 35


def check_demand(slug: str, email: str, ip: str, history) -> dict:
    """Vet a 'Want it' vote. Returns {ok, reason, legit}.

      ok    — record this vote? (False = reject)
      reason — short machine reason when rejected (None when ok)
      legit  — model/heuristic judgement that the demand looks organic

    Hard heuristics fail CLOSED (block). The NIM legitimacy score fails OPEN: if NIM
    is unavailable we accept the heuristic pass rather than block a legit user.
    """
    h = _heuristics(slug, email, ip, history)
    if not h["ok"]:
        return {"ok": False, "reason": h["reason"], "legit": False}

    # Compute the velocity signals once for the model (post-pass, so all small).
    now = time.time()
    e = _norm_email(email)
    recent = [r for r in (history or [])
              if isinstance(r.get("ts"), (int, float)) and (now - r["ts"]) <= WINDOW_SECONDS]
    signals = {
        "email_hits": sum(1 for r in recent if _norm_email(r.get("email")) == e),
        "ip_hits": sum(1 for r in recent if ip and r.get("ip") == ip),
        "ip_slugs": len({r.get("slug") for r in recent if ip and r.get("ip") == ip} | {slug}),
    }

    score = _nim_legit_score(slug, _domain(e), signals)
    if score is None:
        # Fail OPEN — heuristics already cleared this vote.
        return {"ok": True, "reason": None, "legit": True}
    if score < NIM_LEGIT_THRESHOLD:
        return {"ok": False, "reason": "swarm_flagged_spam", "legit": False}
    return {"ok": True, "reason": None, "legit": True}
