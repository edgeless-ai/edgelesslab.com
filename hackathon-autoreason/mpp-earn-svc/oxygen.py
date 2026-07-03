"""
The oxygen (sale-legitimacy) primitive — the ONE signal the future "disintegrator"
economy reads. A sale is OXYGEN only if it proves real, arms-length, distinct human
demand for a design.

The module has three layers, in dependency order:

  (a) SERVER-SIDE PAYER IDENTITY (uses `stripe`) — resolve_payer / payer_key /
      record_identity. A downstream "did this design earn real demand?" signal is only
      unforgeable if the BUYER'S identity is derived from the Stripe charge itself,
      never from the request body. main.py today reads the buyer as free text taken
      straight from the request body (main.py:2688) and the self-purchase guard
      compares that spoofable string (main.py:864). This layer replaces that with an
      identity pulled from Stripe: the card fingerprint (Stripe's stable per-card-number
      id), the payer email, and the customer id.

  (b) CREATOR<->PAYER BINDING STORE (uses `state_store`) — bind_creator_payer /
      is_arms_length. The free-text guard is defeated by any buyer who simply omits
      'buyer'; this replaces trust in that string with a server-derived test backed by
      per-record bindings in R2.

  (c) THE QUALIFYING RULE + RECORD/VESTING HELPERS — qualify_sale is PURE (no stripe,
      no state_store, no network, no filesystem, no wall clock): the caller (main.py's
      webhook handler) resolves everything I/O-shaped — the arms-length buyer identity
      from layer (a)/(b), the royalty outcome from stripe_connect, the prior oxygen
      records from state_store — and hands it in as plain data. That's what makes it
      testable without mocking Stripe and safe to reason about as "the constitution" of
      the economy. revoke()/tally() persist and read the oxygen records around it.

Conventions match the rest of the service: stdlib + the already-imported `stripe` and
`state_store`, and the same defensive dict-access style as `_recipient_from_session`
(main.py:656-674) — Stripe objects are dict-like, so `.get(...)` works on both real
StripeObjects and the plain-dict stubs used in tests. resolve_payer NEVER raises into
the webhook: a failed Charge.retrieve degrades to {'resolved': False}, and a non-card
payment method degrades to the email key rather than inventing a wrong fingerprint.

PII: raw email is returned in-memory for arms-length comparison, but only its SHA-256
is ever meant to be persisted — use `record_identity()` to build the shape that goes
into an oxygen record (state_store.put_record), never the raw resolver dict.

Reused / mirrored machinery (do not re-derive these elsewhere — reuse this module):
  - live_paid check: same boolean expression as main.py:455.
  - at-cost detection: same meta flag as main.py:2695 (set from promo.apply's at_cost
    flag, promo.py:90) plus the royalty-layer signal (reason="at_cost_no_royalty",
    set at main.py:856 before stripe_connect is ever called).
  - self-purchase detection: the royalty-layer reason "self_purchase_no_royalty"
    (main.py:865) UNIONED with the server-side arms-length verdict (card fingerprint /
    customer id — NEVER request-body free text).
  - design-key derivation: same scheme as main.py's `_submit_slug` (main.py:1696-98).
  - velocity cap shape: mirrors demand_gate.py's WINDOW_SECONDS / MAX_IP_VELOCITY
    (demand_gate.py:44-46), reused here per-payer instead of per-IP.
"""
from __future__ import annotations

import datetime
import hashlib
import json
import os
import time

import state_store
import stripe


# ============================================================================
# (a) OX-1 — Server-side payer identity (the FOOTING). Uses `stripe`.
# ============================================================================

def resolve_payer(session: dict, charge_id: str | None) -> dict:
    """Derive the buyer's identity from the Stripe charge + Checkout session.

    Synchronous (call via asyncio.to_thread from the webhook, like every other Stripe
    call in main.py, e.g. main.py:886). Returns a dict with keys:
      fingerprint  — stable per-card-number id (None for non-card / cardless PMs)
      email        — payer email, lowercased/stripped (None if unknown)
      customer_id  — Stripe customer id (charge first, session fallback)
      charge_id    — the charge id we resolved against (echoed back)
      livemode     — True for real money, False for test-mode
      resolved     — bool(fingerprint or email): False means we have no trustworthy
                     identity and MUST NOT mint oxygen for this sale
    On a Charge.retrieve failure it returns {'resolved': False, 'error': ...} and never
    raises — a webhook must ACK, and an unresolvable payer simply earns no oxygen.
    """
    session = session or {}
    fingerprint = None
    payer_email = None
    customer = None
    livemode = None

    if charge_id:
        try:
            ch = stripe.Charge.retrieve(charge_id)
        except Exception as e:  # resolver must NEVER raise into the webhook
            return {"resolved": False, "error": str(e)[:120], "charge_id": charge_id,
                    "fingerprint": None, "email": None, "customer_id": None, "livemode": None}
        pmd = ch.get("payment_method_details") or {}
        # `card` covers online card + wallets (Apple/Google Pay expose the underlying
        # card's fingerprint); `card_present` covers terminal charges. Exotic PMs
        # (Link-bank, Cash App) have neither → fingerprint stays None and we fall back
        # to the email key rather than crash or return a wrong fingerprint.
        card = pmd.get("card") or pmd.get("card_present") or {}
        fingerprint = card.get("fingerprint") or None
        payer_email = (ch.get("billing_details") or {}).get("email")
        customer = ch.get("customer")
        livemode = ch.get("livemode")

    # Merge session-side identity the way main.py already reads it (main.py:639/662):
    # Checkout always collects customer_details.email, so it's a reliable email fallback.
    cd = session.get("customer_details") or {}
    if customer is None:
        customer = session.get("customer")
    if livemode is None:
        livemode = session.get("livemode")

    email = (payer_email or cd.get("email") or "").strip().lower() or None

    return {
        "fingerprint": fingerprint,
        "email": email,
        "customer_id": customer or None,
        "charge_id": charge_id,
        "livemode": livemode,
        "resolved": bool(fingerprint or email),
    }


def payer_key(payer: dict) -> str:
    """Canonical de-dup key for a payer (the 'distinct-payer' axis of the primitive).

    Prefer the card fingerprint (stable across sessions for the same card number);
    otherwise fall back to a SHA-256 of the email (never the raw email). Empty string
    when the payer is unresolved — callers treat '' as 'cannot de-dup, not oxygen'.
    """
    payer = payer or {}
    fp = payer.get("fingerprint")
    if fp:
        return "fp:" + fp
    email = payer.get("email")
    if email:
        return "em:" + hashlib.sha256(email.encode("utf-8")).hexdigest()[:16]
    return ""


def record_identity(payer: dict) -> dict:
    """PII-safe projection of a resolved payer for persistence in an oxygen record
    (state_store.put_record). Carries the de-dup key + a SHA-256 of the email — the raw
    email is deliberately dropped so no oxygen record ever stores buyer PII."""
    payer = payer or {}
    email = payer.get("email")
    return {
        "payer_key": payer_key(payer),
        "fingerprint": payer.get("fingerprint"),
        "email_sha256": (hashlib.sha256(email.encode("utf-8")).hexdigest() if email else None),
        "customer_id": payer.get("customer_id"),
        "charge_id": payer.get("charge_id"),
        "livemode": payer.get("livemode"),
        "resolved": bool(payer.get("resolved")),
    }


# ============================================================================
# (b) OX-2 — Creator<->payer binding store + unforgeable arms-length check.
#
# The free-text guard at main.py:862-866 (buyer.lower()==creator.lower(), read
# from body['buyer']) is defeated by any buyer who simply omits 'buyer'. This
# replaces trust in that string with a SERVER-DERIVED test: a sale is self-dealing
# if the payer's fingerprint (layer (a)'s payer_key) has ever been bound to the
# design's creator via one of three explicit self-signals. Bindings live per-record
# in R2 (concurrency-safe, same pattern as _log_royalty_pending /
# state_store.put_record).
# ============================================================================

# Binding sources (wired by OX-4; defined here so the whole primitive lives in oxygen.py).
BIND_DECLARED_SELF = "declared_self_purchase"   # meta buyer==creator (the main.py:864 case)
BIND_AT_COST_PROMO = "at_cost_promo"            # meta at_cost=='true' AND creator non-empty
BIND_CUSTOMIZE_BUY = "customize_buy"            # meta list_design=='true' (main.py:522-524)

_CREATOR_PAYERS_COLLECTION = "creator_payers"

# Cache state_store.list_records('creator_payers') so each webhook doesn't re-list R2.
_CP_CACHE_TTL_SEC = 300
_cp_cache = {"ts": 0.0, "records": None}


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _norm_creator(creator: str) -> str:
    # Normalize once, use for BOTH the binding-id hash and the stored 'creator' field so
    # bind and lookup agree (case/whitespace-insensitive, bounded length).
    return (creator or "").strip().lower()[:120]


def _binding_id(creator: str, payer: dict) -> str:
    raw = _norm_creator(creator) + "|" + (payer_key(payer) or "")
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


def _invalidate_cache() -> None:
    """Drop the cached creator_payers list so the next check re-lists R2. Called on every bind."""
    _cp_cache["ts"] = 0.0
    _cp_cache["records"] = None


def _creator_payers() -> list:
    """Cached list_records('creator_payers') with a 300s TTL. Never raises: an R2 blip
    degrades to the last-good list (or empty = 'unbound'), never a webhook 500."""
    now = time.time()
    if _cp_cache["records"] is not None and (now - _cp_cache["ts"]) < _CP_CACHE_TTL_SEC:
        return _cp_cache["records"]
    try:
        recs = state_store.list_records(_CREATOR_PAYERS_COLLECTION) or []
    except Exception:
        recs = _cp_cache["records"] or []   # cold-start R2 blip -> degrade to unbound + move on
    _cp_cache["ts"] = now
    _cp_cache["records"] = recs
    return recs


def bind_creator_payer(creator: str, payer: dict, source: str) -> None:
    """Record that this payer fingerprint IS this creator (a self-signal). Swallow-all,
    mirroring _log_royalty_pending (main.py:692-704): a binding failure must NEVER break
    the money path. Bind ONLY on the three explicit self-signals (see BIND_* constants) —
    never on an ordinary purchase — so a real fan is never locked out of oxygen."""
    try:
        pk = payer_key(payer)
        c = _norm_creator(creator)
        if not pk or not c:
            return
        state_store.put_record(_CREATOR_PAYERS_COLLECTION, _binding_id(creator, payer), {
            "creator": c,
            "payer_key": pk,
            "source": source,
            "ts": _now_iso(),
        })
        _invalidate_cache()   # so an immediate is_arms_length() in the same webhook sees it
    except Exception:
        pass


def is_arms_length(creator: str, payer: dict, meta: dict) -> tuple[bool, str]:
    """Unforgeable arms-length test. Returns (is_arms_length, reason).

    NOT arms-length (False) when ANY of:
      - payer is unresolved (fail CLOSED for oxygen; caller decides royalty separately, OX-4)
      - meta-declared buyer == creator (belt-and-suspenders vs the main.py:864 case)
      - payer email equals the creator handle (creator handles are sometimes emails)
      - payer_key has ever been bound to this creator (the OX-2 store)
    """
    c = _norm_creator(creator)
    meta = meta or {}
    payer = payer or {}

    # (0) Can't derive who paid -> can't prove arms-length -> not oxygen. Fail closed.
    if not payer.get("resolved"):
        return (False, "payer_unresolved")

    # (1) Keep the exact main.py:864 free-text case as a cheap first line of defense.
    buyer = (meta.get("buyer") or "").strip()
    if c and buyer and buyer.lower() == c:
        return (False, "declared_self_purchase")

    # (2) Creator handles are sometimes emails.
    email = (payer.get("email") or "").strip().lower()
    if c and email and email == c:
        return (False, "payer_is_creator_email")

    # (3) The unforgeable check: has this fingerprint ever self-signalled for this creator?
    pk = payer_key(payer)
    if c and pk:
        for r in _creator_payers():
            if r.get("creator") == c and r.get("payer_key") == pk:
                return (False, "payer_bound_to_creator")

    return (True, "arms_length")


# ============================================================================
# (c) OX-3 — qualify_sale: the qualifying rule. PURE — everything downstream
# (limited-edition caps, creator rankings, whatever gets built on top of this
# signal) reads `qualify_sale()`'s verdict, never the raw Stripe event, so the
# rule must be exhaustive, deterministic, and side-effect free. No stripe /
# state_store / network / filesystem / wall-clock calls INSIDE this function —
# the caller injects everything as plain data.
# ============================================================================

# Mirrors demand_gate.py's velocity window (demand_gate.py:44 WINDOW_SECONDS=600,
# demand_gate.py:46 MAX_IP_VELOCITY=8) — same shape, applied to a payer fingerprint
# instead of an IP so one payer can't pump a design (or the whole marketplace) by
# rapid-firing many small "distinct" sales.
OXY_WINDOW_SECONDS = 600
OXY_MAX_PAYER_VELOCITY = 8

# Distinct-payer diminishing curve: 1st sale from a payer on a given design counts
# full, 2nd half, 3rd quarter, 4th+ contributes nothing (still "a sale" — refunds/
# fulfillment are untouched — it just proves zero NEW demand).
_DIMINISH_WEIGHTS = (1.0, 0.5, 0.25)

# Royalty-layer reasons (stripe_connect.py) that are explicitly OXYGEN-ELIGIBLE:
# the sale was arms-length and margin-positive, the royalty is merely parked
# (creator hasn't onboarded yet) or too small to transfer. None of these say
# anything bad about the DEMAND — only about payout plumbing — so they must
# never be treated as disqualifiers.
#   - "creator_not_onboarded"   (stripe_connect.py:136)
#   - "onboarding_incomplete"   (stripe_connect.py:139)
#   - "royalty_below_margin"    (stripe_connect.py:133, cap_cents given)
#   - "royalty_too_small"       (stripe_connect.py:133, no cap given)
# (Not referenced directly below — listed here so the eligibility list is legible
# next to the disqualifier list it is NOT part of.)


def _design_key(meta: dict) -> str:
    """Stable identity for 'which design was this a sale of'.

    Same scheme main.py already uses: an explicit listing_slug (limited-edition
    listings, main.py:508) wins; otherwise fall back to the same content-hash
    slug main.py's `_submit_slug` computes from art_url (main.py:1696-1698), so
    two sales of the same not-yet-listed design still diminish against each
    other. Returns "" if neither is present (caller/record has no design identity
    — such a record can still be disqualified above, but never diminishes/is
    diminished against, since "" wouldn't usefully match).
    """
    slug = (meta.get("listing_slug") or "").strip()
    if slug:
        return slug
    art_url = (meta.get("art_url") or "").strip()
    if art_url:
        return "sub-" + hashlib.sha256(art_url.encode()).hexdigest()[:12]
    return ""


def qualify_sale(*, meta: dict, session: dict, payer: dict, royalty: dict | None,
                 creator: str, arms_length: tuple[bool, str], prior_records: list[dict],
                 now: float) -> dict:
    """Decide whether ONE completed checkout.session sale is OXYGEN, and with what
    weight. Pure function — no stripe / state_store / network / filesystem calls.

    Args:
      meta: the webhook's session metadata dict (main.py checkout.session.completed
        handler reads this as `session.get('metadata')`, main.py:444). Only
        'at_cost', 'listing_slug', 'art_url' are read here.
      session: the raw Stripe Checkout Session object (main.py:443). Only
        'livemode' and 'payment_status' are read here.
      payer: caller-resolved payer identity for THIS sale —
        {"payer_key": str, "charge_id": str}. payer_key MUST be derived
        server-side from the Stripe charge (layer (a)'s payer_key(resolve_payer(...)))
        — never from request-body free text. charge_id is this sale's own charge,
        used only to exclude this sale's own prior write(s) from the
        diminishing/velocity counts below (webhook retries must not self-diminish
        or self-throttle).
      royalty: the dict stripe_connect.pay_royalty() returned for this sale (or
        None if it was never called, e.g. at-cost path returns before it in
        main.py). Only 'reason' is read here. NOTE: 'at_cost_no_royalty' and
        'self_purchase_no_royalty' are set by main.py itself (main.py:856/865)
        BEFORE pay_royalty is ever called — the caller mirrors its own pre-royalty
        branch outcome into this dict.
      creator: the design's creator id (main.py's `body.get('creator')`,
        main.py:862), already stripped by the caller or as-is (this function
        strips it again defensively).
      arms_length: (is_arms_length, reason_if_not) — the caller's SERVER-SIDE
        verdict (layer (b)'s is_arms_length) on whether the payer's resolved
        identity differs from the creator's. reason_if_not is used verbatim as
        the disqualifier reason when is_arms_length is False (e.g.
        "payer_bound_to_creator", "payer_unresolved").
      prior_records: already-recorded oxygen records this sale should be
        compared against (injected by the caller — this function does no I/O;
        use list_oxygen_cached()). Each record is expected to carry at least
        {"payer_key", "design_key", "charge_id", "ts"} — the same shape this
        function's caller is expected to persist via state_store.put_record()
        for every qualifying sale.
      now: the current time (epoch seconds), injected so this stays a pure
        function with no wall-clock read inside.

    Returns:
      {"oxygen": bool, "weight": float, "reasons": [str, ...]}
      weight is 0.0 whenever oxygen is False. reasons is never empty when
      oxygen is False; it may contain a "repeat_payer_k{k}" note even when
      oxygen is True (weight reduced but still > 0).
    """
    reasons: list[str] = []
    royalty_reason = (royalty or {}).get("reason")

    # (1) live_paid — recomputed EXACTLY as main.py:455. A test-mode webhook
    # replay (or an event Stripe fires before the charge is real money) proves
    # nothing about demand.
    live_paid = bool(session.get("livemode")) and session.get("payment_status") == "paid"
    if not live_paid:
        return {"oxygen": False, "weight": 0.0, "reasons": ["not_live_paid"]}

    # (2) at-cost — no margin, so this sale proves willingness to acquire at
    # break-even, not real demand at a real price.
    at_cost_meta = str(meta.get("at_cost") or "").lower() == "true"
    if at_cost_meta or royalty_reason == "at_cost_no_royalty":
        return {"oxygen": False, "weight": 0.0, "reasons": ["at_cost"]}

    # (3) self-purchase — either the royalty layer already caught buyer==creator
    # (main.py:864, free-text buyer field — kept as a belt-and-suspenders signal)
    # OR the caller's server-side (charge-derived) arms-length check failed. The
    # server-side check is authoritative; its reason string is used verbatim.
    arms_ok, arms_reason = arms_length
    if not arms_ok:
        reasons.append(arms_reason or "not_arms_length")
        return {"oxygen": False, "weight": 0.0, "reasons": reasons}
    if royalty_reason == "self_purchase_no_royalty":
        return {"oxygen": False, "weight": 0.0, "reasons": ["self_purchase_no_royalty"]}

    # (4) no creator — a sale of unattributed art proves nothing about a
    # DESIGN's earning power (there's no design identity to award oxygen to).
    creator_norm = (creator or "").strip()
    if not creator_norm:
        return {"oxygen": False, "weight": 0.0, "reasons": ["no_creator"]}

    # NOTE: royalty reasons "creator_not_onboarded", "onboarding_incomplete",
    # "royalty_below_margin", "royalty_too_small" reach this point WITHOUT being
    # disqualified — see the module-level comment. They are arms-length,
    # margin-positive (or margin-thin) sales; only the payout plumbing differs.

    pk = (payer or {}).get("payer_key") or ""
    charge_id = (payer or {}).get("charge_id") or ""
    design_key = _design_key(meta)
    records = prior_records or []

    # Velocity cap — mirrors demand_gate.py:44-46. Same payer fingerprint showing
    # up >= OXY_MAX_PAYER_VELOCITY times (any design) inside OXY_WINDOW_SECONDS
    # means "throttle", regardless of the per-design diminishing curve below.
    if pk:
        velocity_hits = sum(
            1 for r in records
            if r.get("payer_key") == pk
            and r.get("charge_id") != charge_id
            and isinstance(r.get("ts"), (int, float))
            and (now - r["ts"]) < OXY_WINDOW_SECONDS
        )
        if velocity_hits >= OXY_MAX_PAYER_VELOCITY:
            return {"oxygen": False, "weight": 0.0, "reasons": ["payer_velocity"]}

    # Distinct-payer diminishing — count prior qualifying sales from the SAME
    # payer on the SAME design, excluding any record sharing this sale's own
    # charge_id (a Stripe at-least-once webhook retry of THIS sale must not
    # diminish against itself).
    k = sum(
        1 for r in records
        if pk
        and r.get("payer_key") == pk
        and r.get("design_key") == design_key
        and r.get("charge_id") != charge_id
    )
    weight = _DIMINISH_WEIGHTS[k] if k < len(_DIMINISH_WEIGHTS) else 0.0
    if k > 0:
        reasons.append(f"repeat_payer_k{k}")

    return {"oxygen": weight > 0.0, "weight": weight, "reasons": reasons}


# ============================================================================
# (c, cont.) OX-4/OX-5 — oxygen record store: cached lister, vesting, revocation.
#
# Record schema (written by the OX-4 wiring in main.py's webhook, read here):
#   {charge_id, status: 'pending'|'vested'|'revoked', ts (epoch or ISO),
#    payer_key (hashed, server-derived), design_key, weight (float),
#    listing_slug and/or art_slug, ...}
# Count oxygen only after the refund/chargeback window. No cron (this codebase
# has no scheduler) — vesting is computed lazily at read time in tally().
# ============================================================================

OXYGEN_VEST_DAYS = int(os.environ.get("OXYGEN_VEST_DAYS") or 14)
_VEST_SECONDS = OXYGEN_VEST_DAYS * 86400

_OXYGEN_COLLECTION = "oxygen"

# Cache state_store.list_records('oxygen') so each webhook / read doesn't re-list R2.
_OXY_CACHE_TTL_SEC = 300
_oxy_cache = {"ts": 0.0, "records": None}


def _invalidate_oxygen_cache() -> None:
    """Drop the cached oxygen list so the next read re-lists R2. Call after every
    put_record into the 'oxygen' collection (OX-4's wiring does; revoke/_vest do)."""
    _oxy_cache["ts"] = 0.0
    _oxy_cache["records"] = None


def list_oxygen_cached() -> list:
    """Cached list_records('oxygen') with a 300s TTL (same pattern as _creator_payers).
    Never raises: an R2 blip degrades to the last-good list (or empty), never a 500."""
    now = time.time()
    if _oxy_cache["records"] is not None and (now - _oxy_cache["ts"]) < _OXY_CACHE_TTL_SEC:
        return _oxy_cache["records"]
    try:
        recs = state_store.list_records(_OXYGEN_COLLECTION) or []
    except Exception:
        recs = _oxy_cache["records"] or []
    _oxy_cache["ts"] = now
    _oxy_cache["records"] = recs
    return recs


def _load(charge_id: str):
    """Load one oxygen record by charge id, or None if it doesn't exist."""
    t = state_store.get_text(f"oxygen/{charge_id}.json")
    if not t:
        return None
    try:
        return json.loads(t)
    except Exception:
        return None


def _records():
    """Every oxygen record (through the TTL cache)."""
    return list_oxygen_cached()


def _ts(rec) -> float:
    """Record creation time as epoch seconds. Tolerates epoch (int/float) OR an ISO-8601
    string (other collections in this repo store ISO timestamps)."""
    v = rec.get("ts")
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and v:
        try:
            return datetime.datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0
    return 0.0


def _weight(rec) -> float:
    """Oxygen weight (distinct-payer diminishing set upstream by qualify_sale).
    Defaults to 1.0 for records written before weighting existed."""
    try:
        return float(rec.get("weight", 1.0))
    except (TypeError, ValueError):
        return 1.0


def revoke(charge_id: str, reason: str) -> dict:
    """Kill the oxygen record for a charge (refund / dispute / early-fraud-warning).
    Idempotent and safe on a missing record:
      * unknown / no charge id -> no-op, {'found': False} (never raises)
      * already revoked        -> stays revoked, {'already': True}
    Revokes at ANY status, INCLUDING 'vested' — a post-vest refund is still forged demand."""
    charge_id = (charge_id or "").strip()
    if not charge_id:
        return {"revoked": False, "found": False, "reason": "no_charge_id"}
    rec = _load(charge_id)
    if rec is None:
        return {"revoked": False, "found": False, "charge_id": charge_id}
    if rec.get("status") == "revoked":
        return {"revoked": True, "found": True, "already": True,
                "charge_id": charge_id, "status": "revoked"}
    rec["status"] = "revoked"
    rec["revoke_reason"] = reason
    rec["revoked_ts"] = time.time()
    state_store.put_record(_OXYGEN_COLLECTION, charge_id, rec)  # last-writer-wins, converges
    _invalidate_oxygen_cache()
    return {"revoked": True, "found": True, "charge_id": charge_id, "status": "revoked"}


def _vest(rec) -> None:
    """Best-effort persist a pending->vested flip so the store converges (idempotent,
    last-writer-wins on identical content — safe across racing instances)."""
    cid = rec.get("charge_id") or rec.get("id")
    if not cid:
        return
    rec["status"] = "vested"
    rec.setdefault("vested_ts", time.time())
    try:
        state_store.put_record(_OXYGEN_COLLECTION, str(cid), rec)
        _invalidate_oxygen_cache()
    except Exception:
        pass


def tally(slug=None) -> dict:
    """Aggregate oxygen. Lazy vesting: a 'pending' record older than OXYGEN_VEST_DAYS is
    treated as vested (and best-effort persisted). Filtered to `slug` (matching either
    listing_slug OR art_slug) when given. Returns ONLY aggregates — a payer_key is never
    returned, only the COUNT of distinct vested payers."""
    now = time.time()
    vested_weight = pending_weight = 0.0
    vested_count = pending_count = revoked_count = 0
    distinct = set()
    for rec in _records():
        if slug is not None and slug not in (rec.get("listing_slug"), rec.get("art_slug")):
            continue
        status = rec.get("status")
        if status == "revoked":
            revoked_count += 1
            continue
        weight = _weight(rec)
        if status == "vested" or (status == "pending" and (now - _ts(rec)) >= _VEST_SECONDS):
            if status == "pending":
                _vest(rec)
            vested_weight += weight
            vested_count += 1
            pk = rec.get("payer_key")
            if pk:
                distinct.add(pk)
        else:
            pending_weight += weight
            pending_count += 1
    return {
        "vested_weight": round(vested_weight, 6),
        "vested_count": vested_count,
        "pending_weight": round(pending_weight, 6),
        "pending_count": pending_count,
        "revoked_count": revoked_count,
        "distinct_payers": len(distinct),
    }
