"""
Stripe Connect — self-serve creator payouts. The "designers EARN" half of the thesis.

Replaces manual allowlisting: a creator becomes payable by completing THEIR OWN Stripe
Express onboarding (Stripe verifies identity + collects payout details). We never
auto-create an account from a request string anymore — an account exists only because
someone went through /connect/onboard, and a royalty only transfers once that account's
payouts are enabled by Stripe. Until then royalties accrue pending (per our Terms).

Requires Connect enabled on the platform account (one-time, free):
https://dashboard.stripe.com/connect/accounts/overview — until then calls degrade to
{"ok": False, "reason": "connect_not_enabled"} (no money moves, nothing breaks).

State in designer_accounts.json: { creator: {account_id, payouts_enabled, details_submitted} }.

SECURITY NOTE: creator ids are still free-text here; binding a creator-claim to an
authenticated sign-in (so nobody can onboard under someone else's name) is the companion
piece — see the identity roadmap. For the current partner stage, creator ids are issued.
"""
from __future__ import annotations
import json
import os
import stripe

# Connect account map MUST survive redeploys (else creators lose payout links + get
# duplicate Express accounts). Persistent when DATA_DIR points at a mounted disk.
_DATA_DIR = (os.environ.get("DATA_DIR") or "").strip() or os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(_DATA_DIR, "designer_accounts.json")
ROYALTY_PCT = 0.18  # creator's cut of the sale (matches the UI ledger)


import state_store  # Connect account map persists in a PRIVATE R2 bucket (survives redeploys)


def _load() -> dict:
    d = state_store.load_json("designer_accounts.json", None)
    if d is None:
        try:
            with open(ACCOUNTS_FILE) as f:
                d = json.load(f)
        except Exception:
            d = {}
    if not isinstance(d, dict):
        return {}
    # migrate legacy {creator: "acct_..."} → {creator: {account_id: ...}}
    return {k: (v if isinstance(v, dict) else {"account_id": v}) for k, v in d.items()}


def _save(d: dict) -> None:
    state_store.save_json("designer_accounts.json", d)


def _is_connect_error(e) -> bool:
    return "signed up for Connect" in str(e) or "Connect" in str(e)


def _account_id(creator: str):
    return (_load().get(creator) or {}).get("account_id")


def has_account(creator: str) -> bool:
    """True if this creator already has an Express account on file (local cache, no Stripe
    call). Lets the route allow a tokenless onboarding-link REFRESH for an existing account
    while still requiring verified identity to CREATE a new one."""
    return bool(_account_id((creator or "").strip()))


def create_onboarding(*, creator: str, return_url: str, refresh_url: str) -> dict:
    """Get-or-create the creator's Express account and return a Stripe-hosted onboarding
    URL. Stripe collects + verifies identity and payout details. Returns {ok, url, account_id}."""
    creator = (creator or "").strip()
    if not creator:
        return {"ok": False, "reason": "missing_creator"}
    cache = _load()
    aid = (cache.get(creator) or {}).get("account_id")
    try:
        if not aid:
            acct = stripe.Account.create(
                type="express", country="US", business_type="individual",
                capabilities={"transfers": {"requested": True}},
                business_profile={"url": "https://edgelesslab.com", "mcc": "5699",
                                  "product_description": "AI-generated apparel designs"},
                metadata={"creator": creator},
                # Deterministic per-creator key: a lost-response retry (now that the global
                # max_network_retries applies) or a concurrent onboarding call collapses onto
                # ONE Express account instead of minting a duplicate/orphaned one.
                idempotency_key=f"acct_create_{creator.lower()}",
            )
            aid = acct.id
            cache.setdefault(creator, {})["account_id"] = aid
            _save(cache)
        link = stripe.AccountLink.create(
            account=aid, type="account_onboarding",
            return_url=return_url, refresh_url=refresh_url,
        )
        return {"ok": True, "url": link.url, "account_id": aid}
    except stripe.error.StripeError as e:
        return {"ok": False, "reason": "connect_not_enabled" if _is_connect_error(e) else str(e)[:160]}


def account_status(creator: str) -> dict:
    """Live status of a creator's Express account. Caches payouts_enabled.
    Returns {exists, payouts_enabled, details_submitted, account_id}."""
    aid = _account_id(creator)
    if not aid:
        return {"exists": False, "payouts_enabled": False, "details_submitted": False}
    try:
        acct = stripe.Account.retrieve(aid)
        payouts = bool(getattr(acct, "payouts_enabled", False))
        details = bool(getattr(acct, "details_submitted", False))
        cache = _load()
        cache.setdefault(creator, {}).update({"account_id": aid, "payouts_enabled": payouts,
                                              "details_submitted": details})
        _save(cache)
        return {"exists": True, "payouts_enabled": payouts, "details_submitted": details, "account_id": aid}
    except stripe.error.StripeError as e:
        return {"exists": True, "payouts_enabled": False, "details_submitted": False,
                "account_id": aid, "reason": str(e)[:120]}


def pay_royalty(*, charge_id: str, sale_amount_cents: int, creator: str,
                pct: float = ROYALTY_PCT, cap_cents: int | None = None) -> dict:
    """Transfer the creator's royalty to their onboarded Express account. ONLY pays a
    creator who has completed Stripe onboarding (payouts_enabled). Otherwise the royalty
    is owed-but-pending — no auto-created accounts, no allowlist.

    cap_cents (optional): never pay a royalty larger than this. The caller passes the
    sale's realized margin (net after Stripe fee − real POD cost) so a thin-margin sale
    — e.g. a low-priced item with free international shipping — can never pay out more
    than it actually earned and push the platform negative. None = no cap (full pct)."""
    if not creator or not charge_id:
        return {"ok": False, "reason": "missing_creator_or_charge"}
    royalty_cents = int(round(sale_amount_cents * pct))
    if cap_cents is not None:
        royalty_cents = min(royalty_cents, max(0, int(cap_cents)))
    if royalty_cents < 1:
        return {"ok": False, "reason": "royalty_below_margin" if cap_cents is not None else "royalty_too_small"}
    aid = _account_id(creator)
    if not aid:
        return {"ok": False, "reason": "creator_not_onboarded", "amount_cents": royalty_cents, "creator": creator}
    st = account_status(creator)
    if not st.get("payouts_enabled"):
        return {"ok": False, "reason": "onboarding_incomplete", "amount_cents": royalty_cents, "creator": creator}
    # DURABLE double-pay guard (beyond Stripe's idempotency_key, which expires at 24h while
    # Stripe re-delivers failed webhooks for up to 72h — a sustained fulfillment outage could
    # otherwise mint a SECOND transfer past the 24h window). A persistent per-charge marker,
    # written ONLY after a confirmed transfer, short-circuits any later re-entry. Fail-safe:
    # a first payment always proceeds (no marker yet); state_store down → we simply fall
    # through to Stripe's 24h key. It can only PREVENT a double-pay, never withhold a real one.
    try:
        import json as _json, state_store as _ss
        _prior = _ss.get_text(f"royalty_paid/{charge_id}.json")
        if _prior:
            _p = _json.loads(_prior)
            # Echo the creator/account that was ACTUALLY paid (from the marker), not this
            # call's args — so a future re-entry with a different creator can't misreport a
            # payment as having gone to them. Correct regardless of who re-invokes.
            return {"ok": True, "transfer_id": _p.get("transfer_id"),
                    "account_id": _p.get("account_id", aid),
                    "amount_cents": _p.get("amount_cents", royalty_cents),
                    "creator": _p.get("creator", creator), "reason": "already_paid"}
    except Exception:
        pass
    try:
        tr = stripe.Transfer.create(
            amount=royalty_cents, currency="usd", destination=aid,
            source_transaction=charge_id,
            metadata={"kind": "creator_royalty", "creator": creator},
            # One royalty per charge — Stripe at-least-once-delivers webhooks, so a retry
            # must NOT create a second transfer (creator would be paid 2×, platform eats it).
            idempotency_key=f"royalty_{charge_id}",
        )
        try:  # persist the durable marker (best-effort; Stripe's key still guards within 24h)
            import state_store as _ss2
            _ss2.put_record("royalty_paid", charge_id,
                            {"transfer_id": tr.id, "amount_cents": royalty_cents,
                             "creator": creator, "account_id": aid})
        except Exception:
            pass
        return {"ok": True, "transfer_id": tr.id, "account_id": aid,
                "amount_cents": royalty_cents, "creator": creator}
    except stripe.error.StripeError as e:
        return {"ok": False, "reason": "connect_not_enabled" if _is_connect_error(e) else str(e)[:160],
                "amount_cents": royalty_cents, "creator": creator}


def reverse_royalty(charge_id: str, reason: str) -> dict:
    """Reverse a creator royalty Transfer when its sale is REFUNDED — so the platform doesn't
    eat 100% of a reversed sale while the creator keeps the 18%.

    Idempotent (a durable royalty_reversed/{charge_id} marker). Fail-safe: if the creator has
    already withdrawn the funds, the connected account may lack the balance and Stripe rejects
    the reversal — we then persist a royalty_reversal_PENDING marker for manual reconciliation
    (clawback policy is a business decision) and return pending=True rather than crash. No
    royalty_paid marker / no transfer_id → nothing was ever paid → no-op. Never raises."""
    charge_id = (charge_id or "").strip()
    if not charge_id:
        return {"reversed": False, "reason": "no_charge_id"}
    try:
        import json as _json, state_store as _ss
        if _ss.get_text(f"royalty_reversed/{charge_id}.json"):
            return {"reversed": True, "already": True, "charge_id": charge_id}
        paid = _ss.get_text(f"royalty_paid/{charge_id}.json")
        if not paid:
            return {"reversed": False, "reason": "no_royalty_paid", "charge_id": charge_id}
        p = _json.loads(paid)
        tid = p.get("transfer_id")
        if not tid:
            return {"reversed": False, "reason": "no_transfer_id", "charge_id": charge_id}
    except Exception as e:
        return {"reversed": False, "reason": f"marker_read_error:{str(e)[:80]}"}
    try:
        rev = stripe.Transfer.create_reversal(
            tid, metadata={"kind": "royalty_reversal", "charge_id": charge_id, "reason": reason},
            idempotency_key=f"royalty_reversal_{charge_id}")
        try:
            _ss.put_record("royalty_reversed", charge_id,
                           {"reversal_id": rev.id, "transfer_id": tid,
                            "amount_cents": p.get("amount_cents"), "creator": p.get("creator"),
                            "reason": reason})
        except Exception:
            pass
        return {"reversed": True, "reversal_id": rev.id, "transfer_id": tid, "charge_id": charge_id}
    except stripe.error.IdempotencyError:
        # Concurrent retry with the same idempotency_key → the OTHER in-flight call already did
        # (or is doing) the reversal. Money-safe: never a second reversal. Report already-done,
        # not a false "pending".
        return {"reversed": True, "already": True, "charge_id": charge_id, "reason": "idempotent_replay"}
    except stripe.error.StripeError as e:
        # Most common: creator already withdrew → connected account has insufficient balance.
        # Log a PENDING marker for manual reconciliation (clawback = David's policy call);
        # never crash the refund webhook.
        try:
            _ss.put_record("royalty_reversal_pending", charge_id,
                           {"transfer_id": tid, "amount_cents": p.get("amount_cents"),
                            "creator": p.get("creator"), "reason": reason, "error": str(e)[:160]})
        except Exception:
            pass
        return {"reversed": False, "reason": "reversal_failed", "error": str(e)[:160],
                "charge_id": charge_id, "pending": True}
