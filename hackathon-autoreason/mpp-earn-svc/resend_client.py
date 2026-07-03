"""Branded order-confirmation email via Resend.

Keeps the print partner invisible — the customer hears from Edgeless, not the POD.
Pure stdlib (urllib) so it adds no dependency. No-ops gracefully when
RESEND_API_KEY is unset, so the fulfillment path never breaks on email.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

API_URL = "https://api.resend.com/emails"


def _enabled() -> bool:
    return bool(os.getenv("RESEND_API_KEY"))


def _from() -> str:
    # Verified sender for edgelesslab.com (see memory: Resend wired from souls@).
    return os.getenv("ORDER_FROM_EMAIL") or os.getenv("SOUL_FROM_EMAIL") or "Edgeless <souls@edgelesslab.com>"


def _money(cents: Optional[int]) -> str:
    try:
        return f"${(int(cents) / 100):.2f}"
    except (TypeError, ValueError):
        return "—"


def _esc(s: Any) -> str:
    return (str(s or "")
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _html(*, item: str, amount_cents: Optional[int], order_ref: str,
          ship_to: str, store_url: str) -> str:
    lime, bg, panel, fg, fg2 = "#C9FF4A", "#0B0C0E", "#121417", "#ECEEF1", "#8B919B"
    return f"""<!doctype html><html><body style="margin:0;background:{bg};color:{fg};font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <div style="font-size:24px;font-style:italic;font-family:Georgia,serif">▸ Edgeless</div>
  <h1 style="font-size:22px;margin:24px 0 4px">Order confirmed</h1>
  <p style="color:{fg2};line-height:1.6;margin:0 0 20px">Thanks — your order is in. Every item is made to order and ships directly to you.</p>
  <div style="background:{panel};border:1px solid #262A30;border-radius:12px;padding:20px;margin:0 0 20px">
    <table width="100%" style="border-collapse:collapse;font-size:14px;color:{fg}">
      <tr><td style="padding:4px 0;color:{fg2}">Item</td><td style="padding:4px 0;text-align:right">{_esc(item)}</td></tr>
      <tr><td style="padding:4px 0;color:{fg2}">Total</td><td style="padding:4px 0;text-align:right;color:{lime};font-weight:bold">{_money(amount_cents)}</td></tr>
      <tr><td style="padding:4px 0;color:{fg2}">Order</td><td style="padding:4px 0;text-align:right;font-family:monospace;font-size:12px">{_esc(order_ref)}</td></tr>
    </table>
    <div style="border-top:1px solid #262A30;margin:14px 0 0;padding-top:14px;font-size:13px;color:{fg2};line-height:1.6">
      <div style="color:{fg};margin-bottom:4px">Shipping to</div>{_esc(ship_to)}
    </div>
  </div>
  <p style="color:{fg2};font-size:13px;line-height:1.6;margin:0 0 20px">Made-to-order items typically print and ship within a few business days. You'll get a shipping notification with tracking once it's on the way. All sales are final.</p>
  <a href="{_esc(store_url)}" style="display:inline-block;background:{lime};color:{bg};text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:14px">Back to the shop</a>
  <p style="color:#5b6168;font-size:11px;margin:28px 0 0">Edgeless Lab LLC · Questions? Reply to this email.</p>
</div></body></html>"""


def send_order_confirmation(*, to_email: str, item: str, amount_cents: Optional[int],
                            order_ref: str, ship_to: str = "",
                            store_url: str = "https://shop.edgelesslab.com") -> Dict[str, Any]:
    """POST a branded order-confirmation email. Returns {ok, ...}; never raises."""
    if not _enabled():
        return {"ok": False, "reason": "resend_not_configured"}
    if not to_email or "@" not in to_email:
        return {"ok": False, "reason": "no_recipient"}
    payload = {
        "from": _from(),
        "to": [to_email],
        "subject": f"Your Edgeless order is confirmed — {item}"[:120],
        "html": _html(item=item, amount_cents=amount_cents, order_ref=order_ref,
                      ship_to=ship_to, store_url=store_url),
    }
    req = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {os.getenv('RESEND_API_KEY')}",
                 "Content-Type": "application/json",
                 # Resend's API is behind Cloudflare, which 403s the default
                 # Python-urllib UA (error 1010). Send a normal UA.
                 "User-Agent": "edgeless-store/1.0 (+https://edgelesslab.com)"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = json.loads(r.read().decode() or "{}")
            return {"ok": True, "id": body.get("id")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "reason": "http_error", "status": e.code,
                "error": e.read().decode()[:200]}
    except Exception as e:
        return {"ok": False, "reason": "exception", "error": str(e)[:200]}


def send_email(*, to_email: str, subject: str, html: str) -> Dict[str, Any]:
    """Generic branded transactional send (e.g. product-request notifications).
    Returns {ok, ...}; never raises."""
    if not _enabled():
        return {"ok": False, "reason": "resend_not_configured"}
    if not to_email or "@" not in to_email:
        return {"ok": False, "reason": "no_recipient"}
    payload = {"from": _from(), "to": [to_email], "subject": (subject or "Edgeless")[:140], "html": html}
    req = urllib.request.Request(
        API_URL, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {os.getenv('RESEND_API_KEY')}",
                 "Content-Type": "application/json",
                 "User-Agent": "edgeless-store/1.0 (+https://edgelesslab.com)"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = json.loads(r.read().decode() or "{}")
            return {"ok": True, "id": body.get("id")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "reason": "http_error", "status": e.code, "error": e.read().decode()[:200]}
    except Exception as e:
        return {"ok": False, "reason": "exception", "error": str(e)[:200]}
