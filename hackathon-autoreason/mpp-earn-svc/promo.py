"""
Floor-enforced promo codes — discounts that can NEVER drop a sale below COGS+shipping.

We do NOT use Stripe coupons. The caller passes the shelf price (amount_cents) and a
floor (cost+shipping, floor_cents); apply() computes the final unit_amount and main.py
creates the Checkout Session at that exact amount. The floor (and Stripe's 50¢ minimum)
is enforced in code, so even a 100%-off "atcost" code lands at break-even, never a loss.

Per-code usage caps are tracked in promo_state.json (atomic write, mirrors _save_wants).
redeem() is called ONCE per completed order from the webhook, so caps count real sales.
"""
from __future__ import annotations
import json
import os
import time

# A reservation (held from /checkout until the webhook confirms the sale) expires after
# this many seconds, so an abandoned checkout frees its cap slot instead of leaking it.
# Longer than a buyer needs to finish Stripe Checkout, far shorter than the 24h session TTL.
_RESV_TTL_SEC = 1800

# Seeded promo codes. mode: atcost | percent | amount.
#   atcost  → drop to the floor (break-even giveaway, no margin → no royalty)
#   percent → value% off the shelf price
#   amount  → value cents off the shelf price
# max = how many times the code may be redeemed (cap).
PROMOS = {
    "ATCOST":  {"mode": "atcost", "max": 100},
    "FRIENDS": {"mode": "percent", "value": 40, "max": 50},
    # Community coupon — Nous Discord. % off, floor-enforced so it never sells below real cost.
    "NOUS":    {"mode": "percent", "value": 20, "max": 200},
    # Partner at-cost codes — buy your own designs at the real POD cost (no markup, no royalty).
    "STEPPE":  {"mode": "atcost", "max": 15},  # Derek / Steppe Integrations
    # --- Discord community at-cost drop (~100 total) — print to yourself at our real cost ---
    "NOUSGANG":  {"mode": "atcost", "max": 40},
    "INSPOART":  {"mode": "atcost", "max": 30},
    "HERMES":    {"mode": "atcost", "max": 30},
}

# Persistent across redeploys when DATA_DIR points at a mounted disk (else code dir).
_DATA_DIR = (os.environ.get("DATA_DIR") or "").strip() or os.path.dirname(os.path.abspath(__file__))
_STATE_FILE = os.path.join(_DATA_DIR, "promo_state.json")


import state_store  # promo caps persist in R2 (survive redeploys)


def _load_state() -> dict:
    data = state_store.load_json("promo_state.json", None)
    if data is not None:
        return data
    try:
        with open(_STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_state(data: dict) -> None:
    state_store.save_json("promo_state.json", data)


def _norm(code: str) -> str:
    return (code or "").strip().upper()


def apply(code: str, amount_cents: int, floor_cents: int | None = None) -> dict:
    """Compute the floor-enforced discounted price for a code.

    Returns {ok, final_cents, at_cost, code|reason}. The final price is NEVER below
    the floor, never below Stripe's 50¢ minimum. at_cost flags a break-even sale
    (final at/near the floor) so the webhook can skip the creator royalty."""
    code = _norm(code)
    spec = PROMOS.get(code)
    if not spec:
        return {"ok": False, "reason": "invalid_code", "final_cents": amount_cents}

    floor = floor_cents or 0
    mode = spec.get("mode")
    if mode == "atcost":
        discounted = floor_cents if floor_cents else amount_cents
    elif mode == "percent":
        discounted = round(amount_cents * (1 - spec.get("value", 0) / 100))
    elif mode == "amount":
        discounted = amount_cents - spec.get("value", 0)
    else:
        discounted = amount_cents

    final = max(discounted, floor, 50)  # never below floor; Stripe min 50¢
    at_cost = final <= floor + 1
    return {"ok": True, "final_cents": final, "at_cost": at_cost, "code": code, "mode": mode}


def _live_reservations(rec: dict, now: float) -> dict:
    """Non-expired reservations for a code record (drops slots older than the TTL)."""
    resv = rec.get("resv") or {}
    return {rid: ts for rid, ts in resv.items() if (now - float(ts)) < _RESV_TTL_SEC}


def _committed(rec: dict, now: float) -> int:
    """How many cap slots are currently spoken for: confirmed sales + live reservations."""
    return int(rec.get("used", 0)) + len(_live_reservations(rec, now))


def cap_ok(code: str) -> bool:
    """True if the code exists and still has cap left (used + live reservations < max).
    Read-only — for display/pre-checks. The authoritative gate is reserve()."""
    code = _norm(code)
    spec = PROMOS.get(code)
    if not spec:
        return False
    rec = _load_state().get(code, {})
    return _committed(rec, time.time()) < spec.get("max", 0)


def reserve(code: str, resv_id: str) -> bool:
    """Atomically claim a cap slot before creating the (discounted) Stripe session.

    This is the authoritative cap gate. Because it runs as a single synchronous
    read-modify-write (no await), it is atomic against other concurrent /checkout
    coroutines on the event loop, closing the cap_ok→redeem TOCTOU window where a
    viral code could be over-redeemed. Returns False if the code is invalid or the
    cap (counting confirmed sales + live reservations) is already reached. Idempotent
    on resv_id (re-reserving the same id just refreshes its timestamp)."""
    code = _norm(code)
    spec = PROMOS.get(code)
    if not spec or not resv_id:
        return False
    now = time.time()
    state = _load_state()
    rec = state.get(code, {})
    resv = _live_reservations(rec, now)  # purge expired while we're here
    if resv_id not in resv and (int(rec.get("used", 0)) + len(resv)) >= spec.get("max", 0):
        return False
    resv[resv_id] = now
    rec["resv"] = resv
    state[code] = rec
    _save_state(state)
    return True


def release(code: str, resv_id: str) -> None:
    """Drop a reservation (e.g. the Stripe session failed to create). Best-effort."""
    code = _norm(code)
    if code not in PROMOS or not resv_id:
        return
    state = _load_state()
    rec = state.get(code, {})
    resv = rec.get("resv") or {}
    if resv.pop(resv_id, None) is not None:
        rec["resv"] = resv
        state[code] = rec
        _save_state(state)


def confirm(code: str, resv_id: str = "") -> None:
    """Convert a reservation into a confirmed redemption. Call ONCE per completed order
    from the webhook. IDEMPOTENT: Stripe delivers events at-least-once, so a retried
    checkout.session.completed must not burn a second cap slot — we record each redeemed
    resv_id and skip if seen. Falls back to a plain increment if no resv_id is present."""
    code = _norm(code)
    if code not in PROMOS:
        return
    state = _load_state()
    rec = state.get(code, {})
    if resv_id:
        done = rec.get("redeemed") or []
        if resv_id in done:
            return  # already counted this order — no double-redeem on webhook retry
        done.append(resv_id)
        rec["redeemed"] = done[-500:]  # bound the ledger
        (rec.get("resv") or {}).pop(resv_id, None)
    rec["used"] = int(rec.get("used", 0)) + 1
    state[code] = rec
    _save_state(state)


def redeem(code: str) -> None:
    """Backward-compatible alias: a non-idempotent confirm with no reservation id."""
    confirm(code, "")


def status() -> dict:
    """Read-only view for the admin /promos route: mode/max/used per code (no secrets)."""
    state = _load_state()
    now = time.time()
    out = {}
    for code, spec in PROMOS.items():
        rec = state.get(code, {})
        out[code] = {
            "mode": spec.get("mode"),
            "max": spec.get("max"),
            "used": int(rec.get("used", 0)),
            "reserved": len(_live_reservations(rec, now)),
        }
    return out
