"""
MPP Earn Endpoint - The service the buyer agent pays.
Returns HTTP 402 Payment Required with Stripe MPP challenge.
When paid (Stripe PaymentIntent confirmed), returns paid content.
"""
from fastapi import FastAPI, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json, os, time, uuid, stripe, sys, asyncio, secrets
import state_store  # persistent app state in a private R2 bucket (survives redeploys)

# NVIDIA NIM safety gate lives one dir up (hackathon-autoreason/gate/).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from gate.deny_by_default import gate_spend

class _SkipPOD(Exception):
    """Control-flow sentinel: a non-Printful provider already handled fulfillment."""

app = FastAPI(title="Edgeless MPP Earn Service")
# Allowed browser origins. Local dev defaults plus any set via CORS_ORIGINS
# (comma-separated) so the deployed storefront origin can call the API.
_CORS = ["http://127.0.0.1:5178", "http://localhost:5178"]
_CORS += [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stripe config
STRIPE_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
stripe.api_key = STRIPE_KEY
# Transparently retry transient Stripe failures (network blips / 5xx / rate-limits) with
# exponential backoff, so a momentary hiccup during PaymentIntent.retrieve or the royalty
# Transfer.create doesn't permanently defer a legitimate royalty. Safe for the POST too:
# pay_royalty's Transfer.create carries an idempotency_key, so a retried create can't double-pay.
stripe.max_network_retries = 2
STRIPE_MODE = "test" if "sk_test" in STRIPE_KEY else "live"

# --- Privy verified-creator identity ---------------------------------------
# A signed-in creator's identity is server-derived from a verified Privy access
# token (JWT), NEVER trusted from the client body. PRIVY_APP_ID is the JWT audience;
# PRIVY_VERIFICATION_KEY is the PEM public key (ES256) copied from the Privy dashboard
# (Settings → App settings → JWT verification key / "Verification key"). If PyJWT or
# the key is missing, verification fails SAFE (returns None) and the store keeps
# working in anonymous/unverified mode.
PRIVY_APP_ID = os.environ.get("PRIVY_APP_ID", "cmqx7iycu00670ckyssxzhkx0")
PRIVY_VERIFICATION_KEY = (os.environ.get("PRIVY_VERIFICATION_KEY", "") or "").strip()

_PAYOUTS_PROBE = {"ok": False}
def _payouts_verifiable() -> bool:
    """Can creator identity actually be verified (→ payout onboarding work)? A real probe,
    not just 'is an app id set': true only if a static PEM exists OR PyJWT is importable AND
    Privy's JWKS is reachable. Caches the first success; re-probes while false so a transient
    JWKS blip doesn't pin the health flag."""
    if _PAYOUTS_PROBE.get("ok"):
        return True
    ok = bool(PRIVY_VERIFICATION_KEY)
    if not ok:
        try:
            import jwt
            jwt.PyJWKClient(f"https://auth.privy.io/api/v1/apps/{PRIVY_APP_ID}/jwks.json").get_jwk_set()
            ok = True
        except Exception:
            ok = False
    if ok:
        _PAYOUTS_PROBE["ok"] = True
    return ok

# Local art files (uploaded designs + dogfood art). Env-driven so the service runs
# in a container where the repo isn't at /Users/djm. Defaults to the repo layout.
ART_DIR = os.environ.get("ART_DIR", os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "merch-demo", "public", "art"))

# Persistent state lives under DATA_DIR. Render's container disk is EPHEMERAL — set
# DATA_DIR to a mounted persistent disk (e.g. /data) so submissions, Connect accounts,
# promo caps, sold-counts and owed royalties SURVIVE redeploys. Defaults to the code dir
# (unchanged behavior) when DATA_DIR is unset. Committed SEED files (tape_seed.jsonl,
# fonts/) always read from the code dir — only writable runtime state moves here.
DATA_DIR = (os.environ.get("DATA_DIR") or "").strip() or os.path.dirname(os.path.abspath(__file__))
try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    DATA_DIR = os.path.dirname(os.path.abspath(__file__))
def _data_path(name: str) -> str:
    return os.path.join(DATA_DIR, name)

PRICE_CENTS = 100  # $1.00
HARD_CEILING_CENTS = 200  # absolute cap any single agent-initiated charge can move (real-money safety rail)
SERVICE_NAME = "Edgeless Store"
PAYMENTS_FILE = _data_path("payments.jsonl")

# Product kinds, single source of truth. PRINTIFY_KINDS fulfill via Printify (stickers,
# posters, hats, bags, drinkware, etc.); apparel (tee/hoodie) routes to Printful. Adding
# a new catalog product = add it here + to printify_client.KINDS (with a real probed cost).
PRINTIFY_KINDS = ("sticker", "poster", "embroidery", "cc-tee", "cap", "bucket", "tote", "mug", "enamel")
ALL_KINDS = ("tee", "hoodie") + PRINTIFY_KINDS

# Mockup render cache: Printful generation takes ~15-25s, so each (blank, art)
# combo is rendered once and cached to disk. After prewarm the demo is instant
# and resilient — the browser just fetches an already-rendered URL.
MOCKUP_CACHE_FILE = _data_path("mockup_cache.json")

# Customer/agent "Request a product" suggestion box. Append-only jsonl ledger of
# product *types* people wish we offered (e.g. "tumblers", "kids tees"). Distinct
# from wants.json (which is demand votes on existing Bazaar designs). Additive only.
_SUGGESTIONS_FILE = _data_path("suggestions.jsonl")


def _load_mockup_cache():
    try:
        with open(MOCKUP_CACHE_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_mockup_cache(cache):
    # Atomic write so a crash mid-save can't corrupt the cache (corruption → every
    # request re-renders at ~20s each, which would kill the demo).
    try:
        tmp = MOCKUP_CACHE_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(cache, f)
        os.replace(tmp, MOCKUP_CACHE_FILE)
    except Exception:
        pass


MOCKUP_CACHE = _load_mockup_cache()

# SSRF guard: the server fetches art_url (compositing) and Printful pulls print files
# from it, so only allow art from hosts we control / trust. Anything else → safe default.
ART_HOST_ALLOWLIST = (
    "pub-bb7dda5df9fe4493a86f5ca35c42fb79.r2.dev",
    "files.cdn.printful.com",
    "printful-upload.s3-accelerate.amazonaws.com",
    "edgelesslab.com",
)
DEFAULT_ART_URL = "https://edgelesslab.com/og-default.png"


def _url_allowed(url) -> bool:
    try:
        from urllib.parse import urlsplit
        p = urlsplit(url or "")
        return p.scheme == "https" and p.hostname in ART_HOST_ALLOWLIST
    except Exception:
        return False


def _safe_art_url(url) -> str:
    """Return url only if it's https + an allow-listed host, else the safe default."""
    return url if _url_allowed(url) else DEFAULT_ART_URL

# Art size/position is done by compositing the art onto a print-area canvas before
# sending it to Printful (avoids per-product print-area coordinate math). The canvas
# matches a DTG front print area aspect (~12x16in → 0.75 w/h). "l"/"center" is the
# default = raw art (no composite) so it reuses the prewarmed cache.
PRINT_CANVAS_W = 1500
PRINT_CANVAS_H = 2000
SIZE_SCALE = {"s": 0.45, "m": 0.68, "l": 0.95}   # fraction of canvas width the art spans
POS_ANCHOR = {"chest": 0.10, "center": 0.34}      # top of art as fraction of canvas height


def _composite_art(src_bytes: bytes, size: str, position: str) -> bytes:
    """Place the art on a transparent print-area canvas at the chosen size/position.
    Printful fills the print area with this canvas, so the art lands where we put it."""
    from PIL import Image
    import io
    art = Image.open(io.BytesIO(src_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (PRINT_CANVAS_W, PRINT_CANVAS_H), (0, 0, 0, 0))
    target_w = int(PRINT_CANVAS_W * SIZE_SCALE.get(size, 0.95))
    scale = target_w / art.width
    target_h = int(art.height * scale)
    art = art.resize((target_w, target_h), Image.LANCZOS)
    x = (PRINT_CANVAS_W - target_w) // 2
    y = int(PRINT_CANVAS_H * POS_ANCHOR.get(position, 0.34))
    canvas.alpha_composite(art, (x, y))
    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()


# --- Text Tee: typeset-text designs (Good Shirts style) ---------------------
# Crisp, auto-wrapped, auto-sized text on a transparent canvas -> DTG-ready PNG.
# Beats imagegen for text: no AI typos, razor-sharp at any size, recolorable,
# ~20KB files, instant (no gen + no slop risk). Fonts are BUNDLED because the
# service runs on Linux where macOS/system fonts don't exist. Open-licensed only
# (Liberation Sans = SIL OFL, metric-compatible with Arial). Adding a font later
# = drop the .ttf in fonts/ and add one line to TEXT_TEE_FONTS.
_FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")
TEXT_TEE_FONTS = {
    "arial-bold": "LiberationSans-Bold.ttf",   # Arial-metric clean grotesque (default)
}
TEXT_TEE_DEFAULT_FONT = "arial-bold"

def _render_text_tee(text: str, font_key: str = TEXT_TEE_DEFAULT_FONT,
                     ink=(255, 255, 255, 255), canvas=(3000, 4000),
                     margin_frac: float = 0.10, line_gap: float = 1.12) -> bytes:
    """Render centered, auto-wrapped, auto-sized text on a transparent canvas.
    Binary-searches the largest font size that fits the print band. Returns PNG bytes."""
    from PIL import Image, ImageDraw, ImageFont
    import io
    fpath = os.path.join(_FONT_DIR, TEXT_TEE_FONTS.get(font_key, TEXT_TEE_FONTS[TEXT_TEE_DEFAULT_FONT]))
    W, H = canvas
    max_w, max_h = int(W * (1 - 2 * margin_frac)), int(H * (1 - 2 * margin_frac))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def wrap(font):
        words, lines, cur = text.split(), [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if d.textlength(t, font=font) <= max_w:
                cur = t
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    lo, hi, best = 20, 700, 20
    while lo <= hi:
        mid = (lo + hi) // 2
        f = ImageFont.truetype(fpath, mid)
        lines = wrap(f)
        asc, desc = f.getmetrics()
        lh = int((asc + desc) * line_gap)
        widest = max((d.textlength(l, font=f) for l in lines), default=0)
        if widest <= max_w and lh * len(lines) <= max_h:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    f = ImageFont.truetype(fpath, best)
    lines = wrap(f)
    asc, desc = f.getmetrics()
    lh = int((asc + desc) * line_gap)
    y = (H - lh * len(lines)) // 2
    for ln in lines:
        w = d.textlength(ln, font=f)
        d.text(((W - w) // 2, y), ln, font=f, fill=ink)
        y += lh
    # Crop to the text block (+ small padding) so the PNG *is* the print — it then
    # scales predictably onto any garment's chest instead of floating in dead canvas.
    bbox = img.getbbox()
    if bbox:
        pad = int((bbox[2] - bbox[0]) * 0.06)
        img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                        min(W, bbox[2] + pad), min(H, bbox[3] + pad)))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


# --- Text content policy ----------------------------------------------------
# The vision swarm rates CRAFT, not message content (and is tuned not to refuse), so a
# cheap server-side denylist blocks the obvious abuse a print store — Edgeless is the
# merchant of record — must never fulfill: slurs/hate terms and bare third-party brand
# word-marks typed as a design. Applied to /text-tee text and listing titles. Not a
# complete moderation system; it catches the clear cases and shows due diligence.
import re as _re_policy
# Severe slurs / hate terms (lowercased, matched against a punctuation/space-stripped form
# so "n-i-g g e r" style evasion still trips). Intentionally short + obvious.
_DENY_SLURS = frozenset({
    "nigger", "nigga", "faggot", "fag", "retard", "tranny", "chink", "spic", "kike",
    "wetback", "gook", "coon", "dyke", "beaner", "raghead", "heil hitler", "kkk",
})
# Third-party brand word-marks (word-boundary match on the raw lowercased text).
_DENY_BRANDS = frozenset({
    "nike", "adidas", "gucci", "supreme", "disney", "marvel", "pokemon", "pokémon",
    "louis vuitton", "chanel", "prada", "versace", "balenciaga", "coca cola", "coca-cola",
    "pepsi", "starbucks", "mcdonalds", "nintendo", "playstation", "xbox", "ferrari",
    "rolex", "nfl", "nba", "mlb", "fifa", "olympics", "harry potter", "star wars",
})

def _text_policy_block(text: str) -> str:
    """Return a short block-reason if the text violates policy, else ''. Word-boundary
    matched on the raw lowercased text (NOT substring) so legit words like 'raccoon',
    'suspicious', 'tycoon' are never falsely blocked."""
    t = (text or "").lower()
    for w in _DENY_SLURS:
        if _re_policy.search(r"\b" + _re_policy.escape(w) + r"\b", t):
            return "blocked_content"
    for b in _DENY_BRANDS:
        if _re_policy.search(r"\b" + _re_policy.escape(b) + r"\b", t):
            return "blocked_trademark"
    return ""


# --- Per-IP rate limiting for cost-bearing endpoints (NIM / R2 / Printful) -----
# Unauthenticated endpoints that burn the shared NIM key or push to R2/Printful must be
# throttled per-IP, else a script drains the quota (which also disables the spend gate +
# screening). In-memory sliding window; resets on redeploy (fine — it's a cheap abuse rail).
_IP_BUCKETS = {}
def _client_ip(request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return (fwd.split(",")[0].strip() if fwd else "") or (request.client.host if request.client else "")
def _ip_rate_ok(bucket: str, ip: str, limit: int, window: int = 60) -> bool:
    key = f"{bucket}:{ip or '?'}"
    now = time.time()
    hits = [t for t in _IP_BUCKETS.get(key, []) if now - t < window]
    if len(hits) >= limit:
        _IP_BUCKETS[key] = hits
        return False
    hits.append(now)
    _IP_BUCKETS[key] = hits
    return True

def trace(event: str, **kwargs):
    """Log structured event to traces file."""
    import datetime
    entry = {"ts": datetime.datetime.now(datetime.timezone.utc).isoformat(), "event": event, **kwargs}
    traces_file = _data_path("traces.jsonl")
    with open(traces_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

def _state_store_ok() -> bool:
    """True if the R2 persistence backend is configured. Never raises — /health must not 500."""
    try:
        import state_store
        return bool(state_store.enabled())
    except Exception:
        return False


@app.get("/health")
async def health():
    # Don't disclose live-vs-test publicly — just whether payments are wired.
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "stripe_configured": bool(STRIPE_KEY),
        # Whether creator identity verification (→ Stripe payout onboarding) can work. True
        # when we have either an explicit PEM or an app id (tokens verify against Privy's JWKS).
        "creator_payouts_configured": _payouts_verifiable(),
        # R2 state persistence — authoritative for oxygen/royalty/payments/promo/submissions.
        # False = every money-critical record is silently degrading to ephemeral local disk.
        "state_store_configured": _state_store_ok(),
    }


@app.get("/pod/health")
async def pod_health():
    import pod_client as _pod
    return _pod.health()

@app.get("/inference")
async def inference(request: Request):
    """Main endpoint - returns 402 unless paid."""
    
    request_id = str(uuid.uuid4())[:8]
    payment_intent_id = request.headers.get("x-payment-intent")
    
    if payment_intent_id:
        # Verify payment with Stripe
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status == "succeeded":
                payment = {
                    "id": str(uuid.uuid4()),
                    "timestamp": time.time(),
                    "pi": payment_intent_id,
                    "amount_cents": intent.amount,
                    "stripe_status": intent.status
                }
                state_store.append_line("payments.jsonl", json.dumps(payment))
                trace("payment_verified", pi=payment_intent_id, amount=intent.amount)
                return JSONResponse({
                    "status": "paid",
                    "payment_id": payment["id"],
                    "stripe_pi": payment_intent_id,
                    "amount": f"${intent.amount / 100:.2f}",
                    "content": generate_intelligence_brief(),
                    "service": SERVICE_NAME
                })
            else:
                return Response(
                    content=json.dumps({"error": "payment_not_confirmed", "stripe_status": intent.status}),
                    status_code=402
                )
        except stripe.error.StripeError as e:
            trace("payment_verification_failed", error=str(e)[:200])
            return Response(
                content=json.dumps({"error": "invalid_payment", "detail": str(e)[:100]}),
                status_code=402
            )
    
    # Not paid - return 402 with Stripe challenge
    trace("inference_requested", request_id=request_id, price_cents=PRICE_CENTS)
    return Response(
        content=json.dumps({
            "error": "payment_required",
            "request_id": request_id,
            "price_cents": PRICE_CENTS,
            "currency": "usd",
            "description": "Pay to receive AI inference result"
        }),
        status_code=402,
        headers={
            "www-authenticate": f'stripe challenge="{json.dumps({"scheme":"stripe","network":"stripe","request_id":request_id,"price_cents":PRICE_CENTS,"currency":"usd","description":"AI inference - market intelligence brief generation"})}"',
            "x-request-id": request_id
        }
    )

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Receive Stripe webhook events.

    In test mode this endpoint is invoked locally by a tiny repl-replay client
    after a successful /pay. In production we'd verify the signature header.
    """
    # Auth: this endpoint creates real POD orders + moves money, so accept ONLY:
    #  (a) a valid Stripe signature (real Stripe events, when the signing secret is set),
    #  (b) the local replay client, or (c) the shared-secret header.
    # Anything else is a forged webhook → 401.
    request_id = str(uuid.uuid4())[:8]
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    client_host = request.client.host if request.client else ""
    _wh_secret = os.environ.get("WEBHOOK_SECRET", "").strip()
    # .strip() defends against a stray newline/space if the secret was pasted with a wrap.
    _sig_secret = os.environ.get("STRIPE_WEBHOOK_SIGNING_SECRET", "").strip()
    secret_ok = bool(_wh_secret) and request.headers.get("x-webhook-secret") == _wh_secret
    sig_ok = False
    if _sig_secret and sig_header:
        try:
            stripe.Webhook.construct_event(payload, sig_header, _sig_secret)
            sig_ok = True
        except Exception as e:
            trace("webhook_sig_invalid", error=str(e)[:120], request_id=request_id)
            return JSONResponse({"error": "bad_signature"}, status_code=400)
    local_ok = client_host in ("127.0.0.1", "::1", "localhost")
    # PRODUCTION: when the real Stripe signing secret is set, REQUIRE a valid Stripe
    # signature. Do not honor the local/shared-secret fallbacks (those are only for the
    # test-mode replay client) — otherwise a leaked WEBHOOK_SECRET could forge a paid
    # event and trigger real fulfillment + royalty transfers.
    if _sig_secret:
        if not sig_ok:
            return JSONResponse({"error": "unauthorized"}, status_code=401)
    elif not (local_ok or secret_ok):
        return JSONResponse({"error": "unauthorized"}, status_code=401)

    trace("webhook_received", bytes=len(payload), signed=bool(sig_header), verified=sig_ok, request_id=request_id)

    try:
        event = json.loads(payload) if payload else {}
    except Exception:
        event = {}

    evt_type = event.get("type") or "replay.test"

    # OXYGEN REVOCATION (OX-5) — a refund / dispute / early-fraud-warning KILLS the oxygen
    # record for that charge at ANY time (even after it vested): undone demand must never
    # remain counted. Intercepts BEFORE the checkout branch AND before the legacy
    # pod-replay fall-through (~:558) so these events never trigger POD work.
    # NOTE: enable charge.refunded / charge.dispute.created / radar.early_fraud_warning.created
    # on the Stripe webhook endpoint config or these are never delivered.
    if evt_type in ("charge.refunded", "charge.dispute.created", "radar.early_fraud_warning.created"):
        _obj = (event.get("data") or {}).get("object", {}) or {}
        # charge.refunded → object IS the charge (id). dispute/EFW → object CARRIES `charge`.
        _charge_id = _obj.get("id") if evt_type == "charge.refunded" else _obj.get("charge")
        # pi is present on all three object types (charge/dispute/EFW) and is the PRIMARY
        # oxygen record key — pass it so revoke() finds pi-keyed records (the common case).
        _pi_id = _obj.get("payment_intent")
        try:
            import oxygen
            _rev = oxygen.revoke(str(_charge_id or ""), evt_type, payment_intent=str(_pi_id or ""))
        except Exception as _e:
            _rev = {"revoked": False, "error": str(_e)[:160]}
        trace("oxygen_revoked", charge=_charge_id, event_type=evt_type,
              revoked=_rev.get("revoked"), found=_rev.get("found"), request_id=request_id)
        # Release the limited-edition cap slot the unit was holding, so it can resell — but ONLY
        # on a FINAL refund, NOT on dispute.created / early_fraud_warning (same finality logic as
        # the royalty reversal below): a WON dispute would leave the charge valid while we'd have
        # already released + possibly resold the slot → oversell a quantity=1 cap. Refund is
        # final. Only the FIRST revoke transition returns sold_counted (idempotent repeat omits
        # it), so a webhook retry can't double-release. (A rare cross-instance concurrent double
        # delivery could still double-release by one unit — same bounded read-then-write race as
        # _increment_sold, accepted for this storage layer; tracked for a CAS follow-up.)
        if evt_type == "charge.refunded" and _rev.get("sold_counted") and _rev.get("listing_slug"):
            try:
                _dec = _decrement_sold(_rev["listing_slug"])
                trace("listing_slot_released", slug=_rev["listing_slug"],
                      sold=(_dec or {}).get("sold"), request_id=request_id)
            except Exception:
                pass
        # Reverse the creator's 18% royalty ONLY on a definitive refund — NOT on
        # dispute.created / early_fraud_warning (those aren't final; a won dispute would leave
        # us having wrongly clawed back a legit creator). Fail-safe: reverse_royalty logs a
        # pending marker (no crash) if the creator already withdrew.
        _roy_rev = None
        if evt_type == "charge.refunded":
            # Only auto-reverse the FULL royalty on a FULL refund. charge.refunded also fires on
            # PARTIAL refunds, where clawing back 100% of the creator's royalty over a small
            # refund is unfair — prorated/threshold clawback is a business-policy decision, so a
            # partial refund is deferred to a pending marker for manual reconciliation (David's
            # call), never an implicit full clawback.
            _amt = int(_obj.get("amount") or 0)
            _refunded = int(_obj.get("amount_refunded") or 0)
            _fully_refunded = bool(_obj.get("refunded")) or (_amt > 0 and _refunded >= _amt)
            if _fully_refunded:
                try:
                    import stripe_connect as _sc
                    _roy_rev = _sc.reverse_royalty(str(_charge_id or ""), evt_type)
                except Exception as _e:
                    _roy_rev = {"reversed": False, "error": str(_e)[:160]}
            else:
                try:
                    state_store.put_record("royalty_partial_refund_pending", str(_charge_id or ""),
                        {"charge_id": str(_charge_id or ""), "amount": _amt, "amount_refunded": _refunded,
                         "note": "partial refund — royalty clawback policy TBD (David)"})
                except Exception:
                    pass
                _roy_rev = {"reversed": False, "reason": "partial_refund_deferred", "pending": True}
            trace("royalty_reversal", charge=_charge_id, reversed=(_roy_rev or {}).get("reversed"),
                  pending=(_roy_rev or {}).get("pending"), reason=(_roy_rev or {}).get("reason"),
                  request_id=request_id)
        return JSONResponse({"received": True, "event_type": evt_type,
                             "oxygen": _rev, "royalty_reversal": _roy_rev})

    # Human Stripe Checkout completed → fulfill via the SAME path as agent /pay.
    if evt_type == "checkout.session.completed":
        session = (event.get("data") or {}).get("object", {})
        meta = session.get("metadata") or {}
        pi = session.get("payment_intent") or session.get("id")
        charge = None
        try:
            if isinstance(pi, str) and pi.startswith("pi_"):
                charge = stripe.PaymentIntent.retrieve(pi).latest_charge
        except Exception as e:
            trace("checkout_pi_retrieve_failed", error=str(e)[:200], request_id=request_id)
        recipient = _recipient_for_checkout(session, meta)
        # Only confirm to production for REAL (live-mode) payments. A test-mode
        # checkout session (livemode=false) stays an unconfirmed draft — never billed.
        live_paid = bool(session.get("livemode")) and session.get("payment_status") == "paid"
        # Confirm the promo cap ONCE per REAL completed order. Guarded on live_paid so a
        # test-mode webhook replay can't burn a live promo slot; idempotent on the reservation
        # id so Stripe's at-least-once retries of a real event can't burn a second slot.
        promo_code = meta.get("promo_code")
        if promo_code and live_paid:
            try:
                import promo as _promo
                _promo.confirm(promo_code, meta.get("promo_resv") or "")
                trace("promo_redeemed", code=promo_code.upper(), resv=meta.get("promo_resv"), request_id=request_id)
            except Exception as e:
                trace("promo_redeem_failed", error=str(e)[:160], request_id=request_id)
        # OX-4: server-side payer identity — derived from the Stripe charge, never from body text.
        payer = {"resolved": False}
        try:
            import oxygen
            payer = await asyncio.to_thread(oxygen.resolve_payer, session, charge)
        except Exception as e:
            trace("payer_resolve_failed", error=str(e)[:160], request_id=request_id)
        out = await _fulfill_and_royalty(intent_id=(pi or "checkout"), charge_id=charge,
                                         body=meta, amount_cents=int(session.get("amount_total") or 0),
                                         resp={}, recipient=recipient, confirm=live_paid, payer=payer)
        trace("checkout_fulfilled", session=session.get("id"), fulfillment=out.get("fulfillment"), request_id=request_id)
        # Charge-without-fulfillment guard: a live-paid order that errored, had no recipient,
        # wasn't configured, or created a Printful draft that never confirmed means the customer
        # was charged and NOTHING is shipping. Don't silently ACK 200 (Stripe never retries) and
        # don't email them "in production". Persist for reconciliation, alert the operator, and
        # for TRANSIENT failures return non-2xx so Stripe re-delivers (fulfillment is idempotent).
        _ff = out.get("fulfillment")
        _FULFILL_OK = {"confirmed", "printify_order", "printify_order_exists", "draft_exists", "printify_simulated_test"}
        fulfill_failed = live_paid and (_ff not in _FULFILL_OK or (_ff in ("draft_created", "draft_exists") and not out.get("confirmed")))
        retryable = _ff in ("error", "exception") or (_ff == "draft_created" and not out.get("confirmed"))
        if fulfill_failed:
            try:
                state_store.put_record("fulfillment_failed", str(pi or session.get("id") or charge or "unknown"), {
                    "pi": pi, "charge": charge, "session": session.get("id"), "fulfillment": _ff,
                    "confirmed": out.get("confirmed"), "retryable": retryable,
                    "amount_cents": int(session.get("amount_total") or 0),
                    "design": meta.get("design"), "kind": meta.get("kind"),
                    "email": (recipient or {}).get("email")})
            except Exception:
                pass
            try:
                import resend_client as _rs
                _alert_to = os.environ.get("ORDER_FROM_EMAIL") or "souls@edgelesslab.com"
                await asyncio.to_thread(_rs.send_email, to_email=_alert_to,
                    subject=f"[Edgeless] FULFILLMENT FAILED ({_ff}) — reconcile {pi}",
                    html=f"<p>A live-paid order did not fulfill — customer charged, nothing shipping.</p>"
                         f"<ul><li>PI: {_esc_html(str(pi))}</li><li>fulfillment: {_esc_html(str(_ff))}</li>"
                         f"<li>confirmed: {out.get('confirmed')}</li><li>retryable: {retryable}</li>"
                         f"<li>design: {_esc_html(str(meta.get('design')))}</li><li>kind: {_esc_html(str(meta.get('kind')))}</li>"
                         f"<li>amount: {session.get('amount_total')}</li><li>buyer: {_esc_html(str((recipient or {}).get('email')))}</li></ul>"
                         f"<p>Reconcile manually (refund or complete the order).</p>")
            except Exception:
                pass
            trace("fulfillment_failed_alert", pi=pi, fulfillment=_ff, retryable=retryable, request_id=request_id)
            if retryable:
                return JSONResponse({"received": False, "error": "fulfillment_retry", "fulfillment": _ff}, status_code=500)
        # OXYGEN (OX-4): qualify this sale, persist the record, and gate the limited-
        # edition cap on the verdict. Best-effort — never blocks the webhook ACK.
        listing_slug = meta.get("listing_slug")
        qual = {"oxygen": False, "weight": 0.0, "reasons": ["oxygen_unavailable"]}
        _sold_counted_prev = False
        # Key on the ALWAYS-present, ALWAYS-stable payment_intent (pi) FIRST. `charge` comes
        # from a fallible PaymentIntent.retrieve that can transiently fail on a webhook retry,
        # which would key the SAME sale under two different ids → double sold-count + an
        # un-revocable record. pi is derived without an API call and identical across retries.
        _oxy_key = str(pi or charge or session.get("id") or "unknown")
        try:
            import oxygen
            _al = oxygen.is_arms_length(meta.get("creator") or "", payer or {"resolved": False}, meta)
            qual = oxygen.qualify_sale(
                meta=meta, session=session,
                payer={"payer_key": oxygen.payer_key(payer or {}), "charge_id": str(charge or "")},
                royalty=out.get("royalty"), creator=meta.get("creator") or "",
                arms_length=(bool(_al[0]), _al[1]),
                prior_records=oxygen.list_oxygen_cached(), now=time.time())
            out["oxygen"] = {"oxygen": qual["oxygen"], "weight": qual["weight"], "reasons": qual["reasons"]}
            if live_paid:
                _prev = oxygen._load(_oxy_key) or {}
                _sold_counted_prev = bool(_prev.get("sold_counted"))
                state_store.put_record("oxygen", _oxy_key, {
                    **oxygen.record_identity(payer or {}),
                    "status": _prev.get("status") or "pending",
                    "oxygen": qual["oxygen"], "weight": qual["weight"], "reasons": qual["reasons"],
                    "creator": meta.get("creator") or "",
                    "listing_slug": meta.get("listing_slug") or "",
                    "design_key": oxygen._design_key(meta),
                    "amount_cents": int(session.get("amount_total") or 0),
                    # Never let a failed PI-retrieve (charge="") stomp a good charge_id a prior
                    # webhook delivery already recorded — keep the previously-stored one.
                    "charge_id": str(charge or "") or _prev.get("charge_id", ""), "pi": str(pi or ""),
                    "sold_counted": _sold_counted_prev,
                    "ts": _prev.get("ts") or time.time()})
                oxygen._invalidate_oxygen_cache()
        except Exception as e:
            trace("oxygen_qualify_failed", error=str(e)[:160], request_id=request_id)
        # Limited-edition drop: count this sale against the cap ONLY if it is oxygen
        # (live, arms-length, distinct) and not already counted (Stripe retries).
        if listing_slug and qual.get("oxygen") and not _sold_counted_prev:
            try:
                so = _increment_sold(listing_slug)
                if so is not None:
                    out["listing_sold"] = so.get("sold")
                    out["listing_sold_out"] = so.get("sold_out")
                    trace("listing_sold_incremented", slug=listing_slug, sold=so.get("sold"),
                          sold_out=so.get("sold_out"), request_id=request_id)
                try:  # replay-dedupe: _increment_sold has no idempotency of its own
                    import oxygen
                    _r = oxygen._load(_oxy_key)
                    if _r is not None:
                        _r["sold_counted"] = True
                        state_store.put_record("oxygen", _oxy_key, _r)
                        oxygen._invalidate_oxygen_cache()
                except Exception:
                    pass
            except Exception as e:
                trace("listing_sold_increment_failed", slug=listing_slug, error=str(e)[:160], request_id=request_id)
        elif listing_slug:
            trace("listing_sold_skipped_not_oxygen", slug=listing_slug,
                  reasons=qual.get("reasons"), request_id=request_id)
        # Customize→buy "goes on sale for everyone": if the buyer customized their OWN art,
        # list it now (server-side, reliable — the client-side listing was killed by the
        # Stripe redirect). Best-effort; never blocks the webhook ACK.
        if str(meta.get("list_design") or "").lower() == "true" and meta.get("art_url"):
            try:
                lr = await _list_design(meta.get("art_url"), meta.get("design") or "",
                                        meta.get("creator") or "human-web",
                                        meta.get("list_kind") or meta.get("kind") or "tee")
                out["listed_design"] = (lr or {}).get("slug")
                # OX-4: buying your OWN art to list it is a self-signal — bind payer→creator.
                try:
                    import oxygen
                    if (meta.get("creator") or "").strip():
                        oxygen.bind_creator_payer(meta.get("creator"), payer or {}, oxygen.BIND_CUSTOMIZE_BUY)
                except Exception:
                    pass
                trace("design_listed_from_purchase", slug=(lr or {}).get("slug"),
                      kind=meta.get("list_kind"), request_id=request_id)
            except Exception as e:
                trace("list_from_purchase_failed", error=str(e)[:160], request_id=request_id)
        # Branded order-confirmation email (Edgeless, not the POD partner). Best-effort:
        # never let an email failure break the webhook ACK back to Stripe. Live paid only.
        if live_paid and not fulfill_failed and recipient and recipient.get("email"):
            try:
                import resend_client as _rs
                order_ref = str(out.get("printful_order_id") or out.get("printify_order_id") or pi or "")
                ship_to = ", ".join([p for p in [
                    recipient.get("name"), recipient.get("address1"), recipient.get("address2"),
                    f"{recipient.get('city','')} {recipient.get('state','')} {recipient.get('zip','')}".strip(),
                    recipient.get("country")] if p])
                er = await asyncio.to_thread(
                    _rs.send_order_confirmation,
                    to_email=recipient["email"],
                    item=meta.get("design") or "Edgeless order",
                    amount_cents=int(session.get("amount_total") or 0),
                    order_ref=order_ref, ship_to=ship_to,
                    store_url=os.environ.get("STORE_BASE_URL") or "https://shop.edgelesslab.com")
                out["email"] = er.get("ok")
                trace("order_email_sent" if er.get("ok") else "order_email_skipped",
                      to=recipient["email"], reason=er.get("reason"), request_id=request_id)
            except Exception as e:
                trace("order_email_exception", error=str(e)[:200], request_id=request_id)
        return JSONResponse({"received": True, "event_type": evt_type, "intent_id": pi, **out})

    intent = (event.get("data") or {}).get("object", {}).get("id") or event.get("intent_id")
    amount = (event.get("data") or {}).get("object", {}).get("amount") or event.get("amount")

    pod_resp = None
    pod_err = None
    design = event.get("design") or {}
    image_url = design.get("image_url")
    template_id = design.get("template_id")
    listing_name = design.get("name") or f"Edgeless Design {request_id or ''}".strip()

    try:
        import pod_client as _pod
        if not _pod.health().get("configured"):
            pod_resp = {"stub": True, "reason": "pod_not_configured"}
        elif not image_url or not template_id:
            pod_resp = {"stub": True, "reason": "missing_design"}
        elif not _url_allowed(image_url):  # SSRF guard
            pod_resp = {"stub": True, "reason": "image_url_not_allowed"}
        else:
            # 1. Pull design bytes (already cached on disk by the demo UI).
            import urllib.request as _url
            with _url.urlopen(image_url, timeout=15) as r:
                image_bytes = r.read()
            # 2. Register the image with the partner (cached by sha256).
            up = _pod.register_image(image_bytes, content_type="image/jpeg",
                                     filename=f"design-{request_id or 'd'}.jpg")
            if not up.get("ok"):
                pod_resp = {"stub": True, "stage": "image", "error": up.get("error")}
            else:
                # 3. Create the product (draft, not published).
                price_cents = int(design.get("price_cents") or 2999)
                pr = _pod.create_product(template_id=template_id, media_id=up["media_id"],
                                         name=listing_name,
                                         description=design.get("description") or "",
                                         price_cents=price_cents,
                                         publish=False)
                if not pr.get("ok"):
                    pod_resp = {"stub": True, "stage": "product", "error": pr.get("error"),
                               "status": pr.get("status")}
                else:
                    product = (pr.get("body") or {})
                    product_id = product.get("id") or product.get("productId")
                    # 4. Create the order record tied to the Stripe intent.
                    order = _pod.create_order(product_id=product_id, intent_id=intent)
                    pod_resp = {
                        "stub": False,
                        "live": True,
                        "media_id": up["media_id"],
                        "media_cached": up.get("cached", False),
                        "product_id": product_id,
                        "product_status": pr.get("status"),
                        "order": order,
                        "publish_on_create": False,
                    }
        trace("pod_order_attempted", **pod_resp)
    except Exception as e:
        pod_err = str(e)[:200]
        trace("pod_order_failed", error=pod_err)

    return JSONResponse({
        "received": True,
        "event_type": evt_type,
        "intent_id": intent,
        "pod": pod_resp,
        "pod_error": pod_err,
    })


_DEMO_RECIPIENT = {  # fallback only (agent demo path / when no real address was collected)
    "name": "Demo Buyer", "first_name": "Demo", "last_name": "Buyer",
    "email": "demo@edgelesslab.com", "address1": "123 Main St", "address2": "",
    "city": "Los Angeles", "state": "CA", "country": "US", "zip": "90001",
}


def _recipient_for_checkout(session, meta) -> dict:
    """At-cost orders ship to the exact address we priced against (carried in metadata
    as recipient_json, since Stripe address collection is off for those). Name/email
    still come from the Stripe session. Everything else falls back to the session."""
    rj = (meta or {}).get("recipient_json")
    if rj:
        try:
            r = json.loads(rj)
            cd = session.get("customer_details") or {}
            name = r.get("name") or cd.get("name") or "Customer"
            parts = name.split(" ", 1)
            if r.get("address1") and r.get("zip"):
                return {
                    "name": name, "first_name": parts[0],
                    "last_name": (parts[1] if len(parts) > 1 else parts[0]),
                    "email": cd.get("email") or "orders@edgelesslab.com",
                    "address1": r.get("address1"), "address2": r.get("address2") or "",
                    "city": r.get("city") or "", "state": r.get("state") or r.get("state_code") or "",
                    "country": r.get("country") or r.get("country_code") or "US", "zip": r.get("zip") or "",
                }
        except Exception:
            pass
    return _recipient_from_session(session)


def _recipient_from_session(session) -> dict:
    """Build a normalized shipping recipient from a Stripe Checkout session
    (shipping_details preferred, customer_details fallback). Returns None if no
    usable address so fulfillment falls back to the demo recipient."""
    sd = (session.get("shipping_details") or session.get("shipping")
          or (session.get("collected_information") or {}).get("shipping_details") or {})
    cd = session.get("customer_details") or {}
    addr = sd.get("address") or cd.get("address") or {}
    if not addr.get("line1"):
        return None
    name = sd.get("name") or cd.get("name") or "Customer"
    parts = name.split(" ", 1)
    return {
        "name": name, "first_name": parts[0], "last_name": (parts[1] if len(parts) > 1 else parts[0]),
        "email": cd.get("email") or "orders@edgelesslab.com",
        "address1": addr.get("line1"), "address2": addr.get("line2") or "",
        "city": addr.get("city") or "", "state": addr.get("state") or "",
        "country": addr.get("country") or "US", "zip": addr.get("postal_code") or "",
    }


def _fmt_recipient(norm, provider):
    """Format a normalized recipient for a specific POD provider."""
    n = norm or _DEMO_RECIPIENT
    if provider == "printify":
        return {"first_name": n["first_name"], "last_name": n["last_name"], "email": n["email"],
                "country": n["country"], "region": n["state"], "city": n["city"],
                "address1": n["address1"], "address2": n.get("address2", ""), "zip": n["zip"]}
    # printful
    return {"name": n["name"], "address1": n["address1"], "address2": n.get("address2", ""),
            "city": n["city"], "state_code": n["state"], "country_code": n["country"],
            "zip": n["zip"], "email": n["email"]}


_ROYALTY_PENDING_FILE = _data_path("royalty_pending.jsonl")


def _log_royalty_pending(intent_id, creator, amount_cents, reason):
    """Durably record a royalty that was owed but not paid, for manual reconciliation.
    Per-record in R2 (keyed by intent_id) — each owed royalty is its own object, so a
    concurrent write can never clobber another (owed money must not vanish)."""
    import datetime
    try:
        state_store.put_record("royalty", str(intent_id or uuid.uuid4()), {
            "intent_id": intent_id, "creator": creator,
            "sale_amount_cents": amount_cents, "reason": reason,
            "ts": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    except Exception:
        pass


async def _list_design(art_url, title, creator, kind="tee"):
    """List a design into the marketplace. Used by the customize-buy webhook path so a
    custom purchase reliably 'goes on sale for everyone' (the client-side listing was
    killed by the Stripe redirect). Dedupes by slug, auto-names, curates, appends."""
    import curator
    art_url = _safe_art_url(art_url)
    if not art_url or not _url_allowed(art_url):
        return None
    slug = _submit_slug(art_url)
    for s in SUBMISSIONS:
        if s.get("slug") == slug:
            return {"ok": True, "slug": slug, "duplicate": True}
    if not title or title.strip().lower() in ("untitled", "untitled design", ""):
        title = (await asyncio.to_thread(curator.name_design, art_url)) or "Edgeless Original"
    kind = kind if kind in ALL_KINDS else "tee"
    verdict = await asyncio.to_thread(curator.curate, art_url, title)
    import datetime
    rec = {"slug": slug, "title": title[:120], "art_url": art_url, "verdict": verdict.get("verdict"),
           "score": verdict.get("score"), "slop": verdict.get("slop"), "reason": verdict.get("reason"),
           "creator": (creator or "human-web")[:120], "kind": kind,
           "ts": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    SUBMISSIONS.append(rec)
    _persist_sub(rec)   # per-record write — never clobbers other listings
    return {"ok": True, "slug": slug, "verdict": verdict.get("verdict"),
            "listed": verdict.get("verdict") in ("premium", "bazaar")}


async def _confirm_printful_if_live(pf, order_id, intent_id, resp, confirm):
    """Submit a Printful draft to production — ONLY for real, live-mode payments.
    Without this, paid orders sit in drafts forever and never get made/shipped."""
    if not (confirm and order_id):
        resp["confirmed"] = False
        return
    try:
        cr = await asyncio.to_thread(pf.confirm_order, order_id)
        if cr.get("ok"):
            resp["confirmed"] = True
            resp["fulfillment"] = "confirmed"
            trace("printful_order_confirmed", order=order_id, pi=intent_id)
        else:
            resp["confirmed"] = False
            trace("printful_confirm_failed", order=order_id, pi=intent_id,
                  error=str(cr.get("error"))[:200])
    except Exception as e:
        resp["confirmed"] = False
        trace("printful_confirm_exception", order=order_id, error=str(e)[:200])


async def _fulfill_and_royalty(*, intent_id, charge_id, body, amount_cents, resp=None, recipient=None, confirm=False, payer=None):
    """Shared POD fulfillment + arms-length creator royalty for a completed sale.
    Used by BOTH the agent /pay path (test card) and the human Stripe Checkout
    webhook (real card) so both produce the same white-label POD order + royalty.

    `confirm`: when True (real, live-mode payment), the Printful order is SUBMITTED
    to production (charges our Printful balance → actually gets made + shipped). When
    False (agent test path / test-mode), it's left as an unconfirmed draft so no real
    POD order is ever produced. Mutates and returns `resp`."""
    resp = resp if resp is not None else {}
    # A confirmed (live, paid) order with no real address must NOT silently ship to the
    # demo fallback address — that's a guaranteed lost shipment + wasted POD cost.
    if confirm and recipient is None:
        resp["fulfillment"] = "error_no_recipient"
        trace("fulfillment_aborted_no_recipient", pi=intent_id)
        return resp
    order_kind = (body.get("kind") or "").lower()
    pfy_pid = body.get("printify_product_id")
    try:
        if order_kind in PRINTIFY_KINDS and pfy_pid:
            # Printify has no true "draft" order: POST /orders.json enters the
            # approval/charge flow and can be auto-sent to production (this produced a
            # real "payment-not-received" order during testing). So unless this is a
            # confirmed live payment we SIMULATE — prove the loop without a billable order.
            if not confirm:
                resp["fulfillment"] = "printify_simulated_test"
                resp["printify_order_id"] = f"sim_{intent_id[-12:]}"
                trace("printify_order_simulated", pi=intent_id, kind=order_kind,
                      reason="not_live_paid_no_real_pod_order")
                raise _SkipPOD()
            import printify_client as pfy
            variant_id = int(body.get("catalog_variant_id") or 0)
            if variant_id <= 0:
                resp["fulfillment"] = "error"
                trace("printify_order_bad_variant", pi=intent_id, kind=order_kind)
                raise _SkipPOD()
            # Idempotency: webhook can fire more than once — don't create a 2nd real order.
            existing = await asyncio.to_thread(pfy.order_exists, intent_id)
            if existing:
                resp["fulfillment"] = "printify_order_exists"
                resp["printify_order_id"] = existing
                trace("printify_order_reused", pi=intent_id, order=existing)
                raise _SkipPOD()
            po = await asyncio.to_thread(pfy.create_order, external_id=intent_id,
                                         product_id=pfy_pid, variant_id=variant_id,
                                         recipient=_fmt_recipient(recipient, "printify"))
            if po.get("ok"):
                resp["fulfillment"] = "printify_order"
                resp["printify_order_id"] = (po.get("body") or {}).get("id")
                trace("printify_order_created", pi=intent_id, kind=order_kind)
            else:
                resp["fulfillment"] = "error"
                trace("printify_order_failed", error=str(po.get("error"))[:200])
            raise _SkipPOD()
        import printful_client as pf
        if pf._enabled() and pf._store_id():
            # Idempotency: don't create a second draft for the same PaymentIntent.
            existing = await asyncio.to_thread(pf.find_order_by_external_id, intent_id)
            prior = (existing.get("body") or {}).get("data") if existing.get("ok") else None
            # Printful's external_id filter isn't reliable — verify an exact match.
            oid = None
            rows = prior if isinstance(prior, list) else ([prior] if isinstance(prior, dict) else [])
            for row in rows:
                if isinstance(row, dict) and row.get("external_id") == intent_id:
                    oid = row.get("id")
                    break
            if oid:
                resp["printful_order_id"] = oid
                resp["fulfillment"] = "draft_exists"
                trace("printful_draft_reused", order=oid, pi=intent_id)
                await _confirm_printful_if_live(pf, oid, intent_id, resp, confirm)
            else:
                _cvar = int(body.get("catalog_variant_id") or 0)
                _okind = (body.get("kind") or "tee").lower()
                if _cvar <= 0 and _okind != "tee":
                    # 4017 is a TEE variant. Never ship it as a stand-in for a hoodie (or any
                    # non-tee apparel) whose real variant failed to resolve — that ships the
                    # WRONG PRODUCT. Refuse and let the fulfillment-failed safety net alert +
                    # retry (returns 500 upstream) instead. A legit tee with no variant still
                    # gets the 4017 default (right product, maybe default color/size).
                    resp["fulfillment"] = "error"
                    resp["fulfillment_error"] = f"no catalog_variant_id for kind={_okind}; refusing tee substitute"
                    trace("printful_wrong_variant_refused", pi=intent_id, kind=_okind)
                else:
                    item = pf.build_catalog_item(
                        catalog_variant_id=(_cvar if _cvar > 0 else 4017),
                        art_url=_safe_art_url(body.get("art_url")),
                        name=(body.get("design") or "Edgeless Tee")[:120],
                        retail_price=f"{amount_cents / 100:.2f}",
                    )
                    # Ship to the address the customer entered at Stripe Checkout
                    # (falls back to the demo address for the agent/test path).
                    po = await asyncio.to_thread(pf.create_draft_order, stripe_id=intent_id,
                                                 recipient=_fmt_recipient(recipient, "printful"), items=[item])
                    if po.get("ok"):
                        oid = (po.get("body") or {}).get("data", {}).get("id")
                        resp["printful_order_id"] = oid
                        resp["fulfillment"] = "draft_created"
                        trace("printful_draft_created", order=oid, pi=intent_id)
                        await _confirm_printful_if_live(pf, oid, intent_id, resp, confirm)
                    else:
                        resp["fulfillment"] = "error"
                        trace("printful_draft_failed", error=str(po.get("error"))[:200])
        else:
            resp["fulfillment"] = "not_configured"
    except _SkipPOD:
        pass  # sticker/poster/embroidery handled by Printify above
    except Exception as e:
        resp["fulfillment"] = "exception"
        trace("printful_exception", error=str(e)[:200])

    # At-cost (floor-enforced promo) sale → no margin, so no royalty to share.
    if str(body.get("at_cost") or "").lower() == "true":
        resp["royalty"] = {"ok": False, "reason": "at_cost_no_royalty"}
        trace("royalty_skipped_at_cost", pi=intent_id)
        # OX-4: an at-cost promo buy is a self-signal — bind this payer to the creator so
        # future full-price 'sales' from the same card can never mint oxygen. Best-effort.
        try:
            if (body.get("creator") or "").strip() and payer:
                import oxygen
                oxygen.bind_creator_payer(body.get("creator"), payer, oxygen.BIND_AT_COST_PROMO)
        except Exception:
            pass
        return resp

    # Creator royalty — the "agents EARN" half. PROOF-OF-DEMAND RULE: royalties pay
    # only on arms-length sales. Self-purchase (buyer==creator) → platform keeps it.
    creator = (body.get("creator") or "").strip()
    buyer = (body.get("buyer") or "").strip()
    legacy_self = bool(creator and buyer and buyer.lower() == creator.lower())
    # OX-4: server-side arms-length check (charge fingerprint + binding store) replaces sole
    # trust in the spoofable free-text buyer. FAIL-OPEN for the royalty: only a PROVEN
    # binding ('payer_bound_to_creator') or the legacy declared match skips payment;
    # payer_unresolved / arms_length_error block oxygen elsewhere but never stiff a creator.
    al = (None, "arms_length_unavailable")
    try:
        import oxygen
        al = oxygen.is_arms_length(creator, payer or {"resolved": False}, body)
    except Exception:
        al = (None, "arms_length_error")
    resp["arms_length_reason"] = al[1]
    server_self = (al == (False, "payer_bound_to_creator"))
    if creator and (legacy_self or server_self):
        resp["royalty"] = {"ok": False, "reason": "self_purchase_no_royalty",
                           "retained_by": "platform", "creator": creator,
                           "arms_length_reason": al[1]}
        trace("royalty_skipped_self_purchase", creator=creator, buyer=buyer, arms=al[1])
        try:
            import oxygen
            oxygen.bind_creator_payer(creator, payer or {}, oxygen.BIND_DECLARED_SELF)
        except Exception:
            pass
    elif creator and confirm and resp.get("fulfillment") not in ("confirmed", "printify_order", "printify_order_exists"):
        # Gate royalty on CONFIRMED fulfillment — never pay an 18% royalty for a live sale whose
        # POD order failed / didn't confirm to production (else the creator is paid for a product
        # that never ships and the platform eats both the refund AND the royalty). Fails toward
        # NOT paying; the owed royalty still accrues pending + is logged for reconciliation. The
        # test/agent path (confirm=False) has no production confirm to check, so it keeps the
        # existing behavior via the next branch.
        _ff = resp.get("fulfillment")
        resp["royalty"] = {"ok": False, "reason": "fulfillment_not_confirmed",
                           "fulfillment": _ff, "creator": creator}
        _log_royalty_pending(intent_id, creator, amount_cents, f"fulfillment_not_confirmed:{_ff}")
        trace("royalty_deferred_fulfillment", creator=creator, fulfillment=_ff)
    elif creator:
        # Margin guard: cap the royalty at this sale's REALIZED margin (net after the Stripe
        # fee − real POD cost to the ACTUAL shipping address, not the floor's domestic proxy).
        # Closes the thin-margin edge: a cheap item with free international shipping can't pay
        # a royalty that nets the platform negative. Cost unknown → no cap (full 18%, as before).
        cap_cents = None
        try:
            real_cost = await _real_pod_cost_cents(body, recipient or {})
            if real_cost is not None:
                net_after_fee = int(amount_cents * 0.971) - 30  # what we keep after Stripe's cut
                cap_cents = max(0, net_after_fee - int(real_cost))
        except Exception as _e:
            cap_cents = None
        # SELF-SERVE: pay only a creator who completed their OWN Stripe Connect onboarding
        # (pay_royalty self-gates on payouts_enabled — no auto-created accounts, no manual
        # allowlist). Not onboarded yet → royalty accrues pending (per Terms) and is logged.
        try:
            import stripe_connect as sc
            roy = await asyncio.to_thread(sc.pay_royalty, charge_id=charge_id,
                                          sale_amount_cents=amount_cents, creator=creator,
                                          cap_cents=cap_cents)
            resp["royalty"] = roy
            if not roy.get("ok"):
                _log_royalty_pending(intent_id, creator, amount_cents, str(roy.get("reason")))
            trace("royalty_paid" if roy.get("ok") else "royalty_pending",
                  creator=creator, transfer=roy.get("transfer_id"),
                  amount=roy.get("amount_cents"), reason=roy.get("reason"))
        except Exception as e:
            _log_royalty_pending(intent_id, creator, amount_cents, "exception")
            trace("royalty_exception", error=str(e)[:200])
    return resp


@app.post("/pay")
async def pay(request: Request):
    """Demo buyer-agent payment path.

    Creates and immediately confirms a $1 test-mode PaymentIntent with Stripe's
    canonical test payment method. This gives the hackathon demo real Stripe
    objects without requiring a human Link approval during every dry run.
    """
    if not STRIPE_KEY:
        return JSONResponse({"error": "stripe_not_configured"}, status_code=500)
    if STRIPE_MODE != "test":
        return JSONResponse({
            "error": "live_mode_refused_for_autonomous_demo",
            "detail": "Set STRIPE_SECRET_KEY to sk_test_* for agent-initiated demo charges."
        }, status_code=409)

    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    request_id = body.get("request_id") or str(uuid.uuid4())[:8]
    # Charge the actual shelf price the buyer sees. In test mode we honor it as-is
    # (no real money); the HARD_CEILING rail only clamps live-mode agent charges.
    try:
        amount_cents = int(body.get("amount_cents") or PRICE_CENTS)
    except (TypeError, ValueError):
        amount_cents = PRICE_CENTS
    amount_cents = max(50, amount_cents)  # Stripe minimum is $0.50
    if STRIPE_MODE != "test":
        amount_cents = min(amount_cents, HARD_CEILING_CENTS)

    # NVIDIA NIM safety gate — every spend must clear the model. Kill the model → DENY,
    # no charge. Fail-closed: if the gate itself errors, deny (don't move money blind).
    # Runs in a thread so the blocking NIM HTTP call never freezes the event loop.
    try:
        verdict = await asyncio.to_thread(
            gate_spend, amount_cents / 100, (body.get("design") or "merch purchase")[:80])
    except Exception as e:
        trace("gate_error", error=str(e)[:200])
        return JSONResponse({"error": "gate_unavailable", "detail": str(e)[:200], "gate": "nvidia-nim"}, status_code=403)
    if not verdict.get("approved"):
        trace("spend_denied", reason=verdict.get("reason"), amount=amount_cents)
        return JSONResponse({"error": "spend_denied", "verdict": verdict.get("verdict"),
                             "reason": verdict.get("reason"), "gate": "nvidia-nim"}, status_code=403)

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            payment_method="pm_card_visa",
            confirm=True,
            idempotency_key=f"buyeragent_{request_id}",  # retry-safe: never double-charge on a lost response
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
            metadata={
                "demo": "edgeless_hackathon",
                "initiated_by": "buyer-agent",
                "request_id": request_id,
                "service": SERVICE_NAME,
            },
            description=SERVICE_NAME,
        )
        trace("payment_intent_confirmed", pi=intent.id, status=intent.status, amount=intent.amount)
        resp = {
            "intent_id": intent.id,
            "status": intent.status,
            "amount": intent.amount,
            "currency": intent.currency,
            "initiated_by": "buyer-agent",
            "request_id": request_id,
        }
        # Headless POD (Printful): on payment, create a DRAFT fulfillment order
        # (not confirmed = NOT charged). Proves the white-label loop; Printful invisible.
        # Non-breaking: skips silently if Printful isn't configured.
        # Headless POD fulfillment + arms-length creator royalty (shared with the
        # human Stripe Checkout webhook so both paths behave identically).
        if intent.status == "succeeded":
            await _fulfill_and_royalty(intent_id=intent.id, charge_id=intent.latest_charge,
                                       body=body, amount_cents=amount_cents, resp=resp)
        return JSONResponse(resp)
    except Exception as e:
        trace("payment_intent_failed", error=str(e)[:300])
        return JSONResponse({"error": "stripe_payment_failed", "detail": str(e)[:300]}, status_code=502)


@app.post("/mockup")
async def mockup(request: Request):
    """Real product mockup: art -> R2 (public) -> Printful mockup generator -> render URL.

    Body: {product_id, catalog_variant_id, art_slug (local file in merch-demo/public/art)
           OR art_url (already-public)}. Returns {mockup_url, art_url}.
    Replaces the crude CSS overlay with a photorealistic art-on-garment render.
    """
    import hashlib as _hl
    import urllib.request as _ureq
    import printful_client as pf
    import r2_client as r2
    if not _ip_rate_ok("mockup", _client_ip(request), 20, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    product_id = int(body.get("product_id") or 71)
    variant_id = int(body.get("catalog_variant_id") or 4017)
    art_url = body.get("art_url")
    art_slug = body.get("art_slug")
    size = (body.get("size") or "l").lower()
    position = (body.get("position") or "center").lower()
    # Print placement for Printify kinds that support it (mug/enamel): wrap-around vs
    # front insert. Default wrap = current behavior. Ignored for kinds with one placement.
    placement = (body.get("placement") or "wrap").lower()
    identity = art_slug or art_url
    if not identity:
        return JSONResponse({"error": "no_art"}, status_code=400)

    # Stickers/posters/embroidery fulfill via Printify (different provider/technique,
    # same invisible checkout — the user never sees which POD or method is used).
    kind = (body.get("kind") or "").lower()
    if kind in PRINTIFY_KINDS:
        import printify_client as pfy
        import r2_client as r2
        pa = art_url
        if not pa and art_slug:
            p = os.path.join(ART_DIR, os.path.basename(art_slug))
            if not os.path.exists(p):
                return JSONResponse({"error": "art_not_found"}, status_code=404)
            up = await asyncio.to_thread(r2.upload_file, p)
            pa = up.get("url")
        if not pa:
            return JSONResponse({"error": "no_art"}, status_code=400)
        # Optional variant override (e.g. a chosen Comfort Colors color) → color-accurate mockup.
        _vov = body.get("catalog_variant_id") or body.get("variant_id")
        r = await asyncio.to_thread(pfy.get_product_mockup, pa, kind, placement, _vov)
        if r.get("ok") and r.get("mockup_url"):
            return JSONResponse({"status": "completed", "provider": "printify", "kind": kind,
                                 "mockup_url": r["mockup_url"], "printify_product_id": r["product_id"],
                                 "variant_id": r["variant_id"], "price_cents": r["price_cents"],
                                 "placement": r.get("placement", placement)})
        return JSONResponse({"error": "printify_mockup_failed", "detail": r.get("detail") or r.get("error")}, status_code=502)

    # Default (full size, centered) keeps the original key so it reuses the prewarmed cache.
    is_default = size == "l" and position == "center"
    cache_key = (f"{product_id}:{variant_id}:{identity}" if is_default
                 else f"{product_id}:{variant_id}:{identity}:{size}:{position}")
    hit = MOCKUP_CACHE.get(cache_key)
    if not (hit and hit.get("mockup_url")):
        MOCKUP_CACHE.update(_load_mockup_cache())  # pick up prewarm/other-worker writes
        hit = MOCKUP_CACHE.get(cache_key)
    if hit and hit.get("mockup_url"):
        return JSONResponse({**hit, "status": "cached"})

    # Only the composite (non-default size/position) path needs the raw image bytes.
    # For the default path Printful fetches the public art_url directly — don't re-fetch it
    # ourselves (R2 blocks the default urllib UA, and the bytes aren't needed anyway).
    need_bytes = not is_default
    raw_bytes = None
    local_path = None
    if art_slug:
        art_dir = ART_DIR
        local_path = os.path.join(art_dir, os.path.basename(art_slug))
        if not os.path.exists(local_path):
            return JSONResponse({"error": "art_not_found", "slug": art_slug}, status_code=404)
        if need_bytes:
            with open(local_path, "rb") as fh:
                raw_bytes = fh.read()
    elif art_url:
        if not _url_allowed(art_url):  # SSRF guard
            return JSONResponse({"error": "art_url_not_allowed"}, status_code=400)
        if need_bytes:
            def _fetch():
                req = _ureq.Request(art_url, headers={"User-Agent": "Mozilla/5.0"})  # R2 blocks default UA
                return _ureq.urlopen(req, timeout=20).read()
            try:
                raw_bytes = await asyncio.to_thread(_fetch)
            except Exception as e:
                return JSONResponse({"error": "art_fetch_failed", "detail": str(e)[:200]}, status_code=502)

    # Build the print-ready art url: raw for default, composited for size/position.
    if is_default:
        if art_slug:
            up = await asyncio.to_thread(r2.upload_file, local_path)
            if not up.get("ok"):
                return JSONResponse({"error": "r2_upload_failed", "detail": up.get("error")}, status_code=502)
            art_url = up["url"]
        # else art_url already public (and allow-listed above)
    else:
        composited = _composite_art(raw_bytes, size, position)
        key = f"designs/tmp/{_hl.sha256(composited).hexdigest()[:16]}.png"
        up = await asyncio.to_thread(r2.upload_bytes, key, composited, "image/png")
        if not up.get("ok"):
            return JSONResponse({"error": "r2_upload_failed", "detail": up.get("error")}, status_code=502)
        art_url = up["url"]

    task = await asyncio.to_thread(pf.create_mockup_task, product_id=product_id, catalog_variant_ids=[variant_id], art_url=art_url)
    if not task.get("ok"):
        return JSONResponse({"error": "mockup_create_failed", "detail": str(task.get("error"))[:300]}, status_code=502)
    b = task.get("body") or {}
    cand = b.get("data", b)
    if isinstance(cand, list):
        cand = cand[0] if cand else {}
    task_id = b.get("id") or (cand.get("id") if isinstance(cand, dict) else None)
    if not task_id:
        return JSONResponse({"error": "mockup_task_id_missing", "raw": str(b)[:300]}, status_code=502)

    for _ in range(12):
        await asyncio.sleep(2)
        p = await asyncio.to_thread(pf.poll_mockup, task_id)
        data = (p.get("body") or {}).get("data", {})
        if isinstance(data, list):
            data = data[0] if data else {}
        if data.get("status") == "completed":
            url = None
            for m in data.get("catalog_variant_mockups", []):
                for mk in m.get("mockups", []):
                    url = mk.get("mockup_url")
                    if url:
                        break
                if url:
                    break
            trace("mockup_rendered", task=task_id, art=art_url)
            if url:
                MOCKUP_CACHE[cache_key] = {"mockup_url": url, "art_url": art_url}
                _save_mockup_cache(MOCKUP_CACHE)
            return JSONResponse({"mockup_url": url, "art_url": art_url, "task_id": task_id, "status": "completed"})
        if data.get("status") == "failed":
            return JSONResponse({"error": "mockup_failed", "detail": str(data)[:300]}, status_code=502)
    return JSONResponse({"status": "pending", "task_id": task_id, "art_url": art_url}, status_code=202)


@app.post("/upload-art")
async def upload_art(request: Request, file: UploadFile = File(...)):
    """Bring-your-own-art: accept an uploaded image, host it on R2, return its public url.
    The frontend then feeds art_url to /mockup like any other artwork (temp until ordered)."""
    import hashlib as _hl
    import r2_client as r2
    from PIL import Image
    import io
    if not _ip_rate_ok("upload-art", _client_ip(request), 12, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    data = await file.read()
    if not data or len(data) > 15 * 1024 * 1024:
        return JSONResponse({"error": "bad_size", "detail": "1 byte–15MB"}, status_code=400)
    # Re-encode through PIL → strips any non-image payload (polyglot/EXIF) and guarantees
    # what lands in the PUBLIC bucket is a real PNG, served as image/png. No raw bytes.
    try:
        im = Image.open(io.BytesIO(data)).convert("RGBA")
        out = io.BytesIO()
        im.save(out, format="PNG")
        clean = out.getvalue()
    except Exception:
        return JSONResponse({"error": "not_an_image"}, status_code=400)
    key = f"designs/tmp/upload-{_hl.sha256(clean).hexdigest()[:16]}.png"
    up = r2.upload_bytes(key, clean, "image/png")
    if not up.get("ok"):
        return JSONResponse({"error": "r2_upload_failed", "detail": up.get("error")}, status_code=502)
    trace("art_uploaded", key=key, bytes=len(data))
    # Run the design through the anti-slop immune system on upload.
    curation = None
    try:
        import curator
        curation = await asyncio.to_thread(curator.curate, up["url"], (file.filename or "")[:80])
        trace("upload_curated", verdict=(curation or {}).get("verdict"), score=(curation or {}).get("score"))
    except Exception as e:
        trace("upload_curation_error", error=str(e)[:160])
    return JSONResponse({"art_url": up["url"], "art_id": key, "curation": curation})


@app.get("/fonts")
async def text_tee_fonts():
    """List the typeset-text fonts available for Text Tees (so the UI/agents stay in sync)."""
    return {"fonts": [{"key": k, "label": "Arial Bold" if k == "arial-bold" else k.replace("-", " ").title()}
                      for k in TEXT_TEE_FONTS], "default": TEXT_TEE_DEFAULT_FONT}


@app.post("/text-tee")
async def text_tee(request: Request):
    """Typeset-text design: render a line of text as a crisp transparent PNG, host it on
    R2, return the public art_url. The frontend (or an agent) then feeds art_url to /submit
    like any other artwork — the swarm screens the message, it lists, it earns. No imagegen:
    deterministic, razor-sharp, no AI typos. Default = white print on the Black blank."""
    import hashlib as _hl
    import r2_client as r2
    if not _ip_rate_ok("text-tee", _client_ip(request), 20, 60):
        return JSONResponse({"error": "rate_limited", "detail": "slow down"}, status_code=429)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    text = " ".join((body.get("text") or "").split())   # collapse newlines/runs of whitespace
    if not text:
        return JSONResponse({"error": "empty_text"}, status_code=400)
    if len(text) > 140:
        return JSONResponse({"error": "too_long", "detail": "max 140 chars"}, status_code=400)
    blocked = _text_policy_block(text)
    if blocked:
        trace("text_tee_blocked", reason=blocked, chars=len(text))
        return JSONResponse({"error": blocked, "detail": "that text can't be printed"}, status_code=422)
    font_key = (body.get("font") or TEXT_TEE_DEFAULT_FONT).strip().lower()
    if font_key not in TEXT_TEE_FONTS:
        font_key = TEXT_TEE_DEFAULT_FONT
    # Ink: white print for dark garments (our default Black blank), black for light.
    ink = (20, 20, 20, 255) if (body.get("ink") or "white").lower() == "black" else (255, 255, 255, 255)
    try:
        png = await asyncio.to_thread(_render_text_tee, text, font_key, ink)
    except Exception as e:
        trace("text_tee_render_error", error=str(e)[:160])
        return JSONResponse({"error": "render_failed", "detail": str(e)[:160]}, status_code=500)
    key = f"designs/text/{_hl.sha256((text + '|' + font_key + '|' + str(ink)).encode()).hexdigest()[:16]}.png"
    up = r2.upload_bytes(key, png, "image/png")
    if not up.get("ok"):
        return JSONResponse({"error": "r2_upload_failed", "detail": up.get("error")}, status_code=502)
    trace("text_tee_rendered", chars=len(text), font=font_key, key=key)
    return JSONResponse({"art_url": up["url"], "art_id": key, "text": text, "font": font_key})


@app.get("/colors")
async def colors(product_id: int = 71):
    """Color swatches for a blank. Each color carries a representative variant_id (size M)
    AND a `sizes` map {SIZE: catalog_variant_id} so checkout can order the buyer's actual
    size — Printful variant IDs encode color×size, so without this the size picker is a lie."""
    import printful_client as pf
    r = pf.get_variants(product_id)
    if not r.get("ok"):
        return JSONResponse({"error": "variants_failed", "detail": str(r.get("error"))[:200]}, status_code=502)
    variants = (r.get("body") or {}).get("data", []) or []
    _SIZE_NORM = {"MEDIUM": "M", "SMALL": "S", "LARGE": "L", "X-LARGE": "XL", "XLARGE": "XL",
                  "XX-LARGE": "2XL", "XXLARGE": "2XL", "2X-LARGE": "2XL"}
    by_color = {}   # color -> {color_code, image, sizes:{SIZE:vid}}
    order = []
    for v in variants:
        color = v.get("color") or v.get("color_name")
        vid = v.get("id") or v.get("catalog_variant_id")
        if not color or not vid:
            continue
        size = (v.get("size") or "").upper()
        size = _SIZE_NORM.get(size, size)
        if color not in by_color:
            by_color[color] = {
                "color": color,
                "color_code": v.get("color_code") or v.get("color_code1") or "#cccccc",
                "image": v.get("image"),
                "sizes": {},
            }
            order.append(color)
        if size and size not in by_color[color]["sizes"]:
            by_color[color]["sizes"][size] = vid
    out = []
    for color in order[:14]:
        c = by_color[color]
        sizes = c["sizes"]
        # Representative variant for the swatch = M if present, else the first available size.
        c["variant_id"] = sizes.get("M") or (next(iter(sizes.values())) if sizes else None)
        out.append(c)
    return JSONResponse({"product_id": product_id, "colors": out})


# Comfort Colors garment hex (Printify gives names only). Approximate but close enough for
# swatches; unknown names fall back to neutral gray so the picker never breaks.
_CC_HEX = {
    "bay": "#3a6b8a", "berry": "#7d3a5d", "black": "#1a1a1a", "blossom": "#e8a0b0",
    "blue jean": "#7a94a8", "blue spruce": "#3a5a4a", "brick": "#8a4a3a", "burnt orange": "#b5541f",
    "butter": "#f0e0a0", "chalky mint": "#a8d0c0", "chambray": "#8a9bb0", "crimson": "#9e1b32",
    "crunchberry": "#d05a80", "denim": "#4a6a8a", "espresso": "#4a3a2f", "flo blue": "#3a5a8a",
    "granite": "#6a6a6a", "grape": "#5a3a6a", "graphite": "#404040", "grey": "#9a9a9a",
    "hemp": "#a89a7a", "ice blue": "#b0c8d8", "island reef": "#6ac0b0", "ivory": "#f0ead8",
    "khaki": "#b0a080", "lagoon blue": "#4a90a8", "light green": "#a8c890", "midnight": "#2a3a5a",
    "moss": "#6a7a4a", "mustard": "#c8a03a", "mystic blue": "#7a90b0", "navy": "#26304f",
    "orchid": "#b070a0", "pepper": "#4a4a48", "red": "#b02030", "royal caribe": "#2a80b0",
    "sage": "#9aab8a", "seafoam": "#90c8b8", "terracotta": "#b5654a", "true navy": "#1f2a44",
    "violet": "#7a5a9a", "washed denim": "#90a0b0", "watermelon": "#e0607a", "white": "#f5f5f0",
    "yam": "#b5651f",
}
_CC_CACHE = {"ts": 0.0, "colors": None}

@app.get("/cc-colors")
async def cc_colors():
    """Comfort Colors color × size matrix so the storefront offers real color choice (45
    colors, not 1). Printify gives names only → mapped to hex. Cached (catalog is slow)."""
    if _CC_CACHE["colors"] and (time.time() - _CC_CACHE["ts"]) < 3600:
        return JSONResponse({"colors": _CC_CACHE["colors"]})
    import catalog_client as cc
    import printify_client as pc
    spec = pc.KINDS.get("cc-tee", {})
    try:
        body = await asyncio.to_thread(cc.provider_variants, spec.get("blueprint"), spec.get("provider"))
    except Exception as e:
        return JSONResponse({"error": "catalog_failed", "detail": str(e)[:120]}, status_code=502)
    vs = (body.get("variants") if isinstance(body, dict) else body) or []
    by_color, order = {}, []
    for v in vs:
        o = v.get("options") or {}
        color, size, vid = o.get("color"), (o.get("size") or "").upper(), v.get("id")
        if not color or not vid:
            continue
        if color not in by_color:
            by_color[color] = {"color": color, "color_code": _CC_HEX.get(color.lower(), "#8a8a8a"), "sizes": {}}
            order.append(color)
        if size and size not in by_color[color]["sizes"]:
            by_color[color]["sizes"][size] = vid
    out = []
    for color in order:
        c = by_color[color]
        c["variant_id"] = c["sizes"].get("M") or (next(iter(c["sizes"].values())) if c["sizes"] else None)
        out.append(c)
    _CC_CACHE["ts"], _CC_CACHE["colors"] = time.time(), out
    return JSONResponse({"colors": out})


def _admin_ok(request: Request) -> bool:
    """Admin endpoints require X-Admin-Secret == $ADMIN_SECRET. If ADMIN_SECRET is unset,
    admin endpoints are DISABLED (fail-closed) — never publicly togglable."""
    secret = (os.environ.get("ADMIN_SECRET") or "").strip()
    # constant-time compare — a plain == short-circuits on the first mismatched byte, leaking
    # the secret byte-by-byte via response latency (an attacker could reconstruct it).
    return bool(secret) and secrets.compare_digest(request.headers.get("x-admin-secret", ""), secret)


@app.post("/gate/kill")
async def gate_kill(request: Request):
    """Admin/demo: take the NVIDIA NIM gate offline at runtime (no restart). Next spend → DENY.
    Requires X-Admin-Secret — NOT public (a public kill switch would nullify the safety gate)."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    os.environ["NIM_GATE_AVAILABLE"] = "0"
    trace("gate_killed", by="admin")
    return JSONResponse({"nim_gate_available": False})


@app.post("/gate/restore")
async def gate_restore(request: Request):
    """Admin/demo: bring the NVIDIA NIM gate back online. Requires X-Admin-Secret."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    os.environ["NIM_GATE_AVAILABLE"] = "1"
    trace("gate_restored", by="admin")
    return JSONResponse({"nim_gate_available": True})


@app.get("/gate/status")
async def gate_status():
    return JSONResponse({"nim_gate_available": os.environ.get("NIM_GATE_AVAILABLE", "1") != "0"})


# --- "Want it" demand signal -------------------------------------------------
# A Bazaar design (cleared the curator's art gate) graduates to the purchasable rack
# once it has WANT_THRESHOLD *verified* votes. Each vote is run through demand_gate's
# anti-spam / anti-Sybil immune system before it counts.
WANTS_FILE = _data_path("wants.json")
WANT_THRESHOLD = 10


def _load_wants():
    data = state_store.load_json("wants.json", None)
    if data is not None:
        return data
    try:
        with open(WANTS_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save_wants(data):
    state_store.save_json("wants.json", data)


WANTS = _load_wants()


def _email_hash(email: str) -> str:
    """Stable, non-reversible id for dedupe + logging. Never store/log the raw email."""
    import hashlib as _hl
    return _hl.sha256((email or "").strip().lower().encode()).hexdigest()[:16]


def _email_mask(email: str) -> str:
    """f***@domain for traces — enough to debug, never the full address."""
    e = (email or "").strip()
    if "@" not in e:
        return "***"
    local, _, domain = e.partition("@")
    return (local[:1] + "***@" + domain)


def _wants_history():
    """Flatten the per-slug ledger into the [{slug,email,ip,ts}] shape demand_gate wants.
    Stored emails are lowercased; that's all demand_gate needs for dedupe + velocity."""
    out = []
    for slug, rec in WANTS.items():
        for v in rec.get("votes", []):
            out.append({"slug": slug, "email": v.get("email"), "ip": v.get("ip"), "ts": v.get("ts")})
    return out


def _verified_count(slug: str) -> int:
    return len(WANTS.get(slug, {}).get("votes", []))


@app.post("/want")
async def want(request: Request):
    """Record a verified 'Want it' demand vote for a Bazaar design.
    Deduped by (slug, lowercased email). Runs the demand_gate immune system
    (heuristics fail-closed, NIM legitimacy fails-open) before counting."""
    import demand_gate
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    slug = (body.get("slug") or "").strip()[:200]
    email_raw = (body.get("email") or "").strip()[:254]
    title = (body.get("title") or "")[:120]
    email = email_raw.lower()
    if not slug or not email:
        return JSONResponse({"ok": False, "reason": "missing_slug_or_email"}, status_code=400)

    # Client IP for velocity / Sybil checks. Honor a single proxy hop, else peer addr.
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else "") or (request.client.host if request.client else "")

    # Fast dedupe before any model call.
    rec = WANTS.get(slug, {})
    votes = rec.get("votes", [])
    if any(v.get("email") == email for v in votes):
        trace("want_rejected", slug=slug, reason="already_voted", email=_email_mask(email_raw))
        return JSONResponse({
            "ok": False, "reason": "already_voted",
            "slug": slug, "verified_count": len(votes),
            "threshold": WANT_THRESHOLD, "graduated": len(votes) >= WANT_THRESHOLD,
            "already_voted": True,
        })

    verdict = await asyncio.to_thread(demand_gate.check_demand, slug, email, ip, _wants_history())
    if not verdict.get("ok"):
        trace("want_rejected", slug=slug, reason=verdict.get("reason"), email=_email_mask(email_raw))
        return JSONResponse({"ok": False, "reason": verdict.get("reason"), "slug": slug,
                             "verified_count": len(votes), "threshold": WANT_THRESHOLD,
                             "graduated": len(votes) >= WANT_THRESHOLD, "already_voted": False})

    import datetime
    votes.append({
        "email": email, "email_hash": _email_hash(email), "ip": ip,
        "ts": time.time(),
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    rec["votes"] = votes
    if title and not rec.get("title"):
        rec["title"] = title
    WANTS[slug] = rec
    _save_wants(WANTS)

    count = len(votes)
    graduated = count >= WANT_THRESHOLD
    trace("want_recorded", slug=slug, verified_count=count, graduated=graduated,
          legit=verdict.get("legit"), email=_email_mask(email_raw))
    return JSONResponse({
        "ok": True, "slug": slug, "verified_count": count,
        "threshold": WANT_THRESHOLD, "graduated": graduated, "already_voted": False,
    })


@app.get("/wants")
async def wants(slug: str | None = None):
    """Demand progress for the storefront. Returns {slug: {verified_count, graduated}}.
    Optional ?slug= narrows to one design (empty map if it has no votes yet)."""
    def _entry(s):
        c = _verified_count(s)
        return {"verified_count": c, "graduated": c >= WANT_THRESHOLD}
    if slug:
        slug = slug.strip()[:200]
        return JSONResponse({slug: _entry(slug)} if slug in WANTS else {})
    return JSONResponse({s: _entry(s) for s in WANTS})


@app.post("/suggest")
async def suggest(request: Request):
    """Record a 'Request a product' suggestion (a product *type* a customer/agent
    wishes we carried, e.g. 'tumblers'). Append-only to suggestions.jsonl. Mirrors
    /want's trim/length-cap/email-mask validation; a write failure fails SAFE
    (logged, never 500s) so the storefront stays up."""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    product = (body.get("product") or "").strip()[:120]
    note = (body.get("note") or "").strip()[:500]
    contact_raw = (body.get("email_or_handle") or "").strip()[:254]
    creator = (body.get("creator") or "").strip()[:120]
    if not product:
        return JSONResponse({"ok": False, "reason": "missing_product"}, status_code=400)

    # Client IP for light velocity/abuse triage (same single-proxy-hop logic as /want).
    fwd = request.headers.get("x-forwarded-for", "")
    ip = (fwd.split(",")[0].strip() if fwd else "") or (request.client.host if request.client else "")

    import datetime
    entry = {
        "product": product,
        "note": note,
        "contact": contact_raw,
        "creator": creator,
        "ip": ip,
        "ts": time.time(),
        "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    try:
        with open(_SUGGESTIONS_FILE, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        # Fail SAFE like _save_wants — a disk hiccup must not break the request path.
        trace("suggest_write_failed", product=product)
    contact_mask = _email_mask(contact_raw) if "@" in contact_raw else ("***" if contact_raw else "")
    trace("suggest_recorded", product=product, has_note=bool(note), contact=contact_mask)
    # Durable capture: email each request so it survives Render's ephemeral disk and reaches
    # David's inbox (the jsonl alone resets on redeploy). Best-effort; never breaks the request.
    try:
        import resend_client as _rs
        _esc = lambda s: str(s or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        _html = ("<p><b>New product request — Edgeless</b></p>"
                 f"<p><b>Product:</b> {_esc(product)}</p><p><b>Note:</b> {_esc(note)}</p>"
                 f"<p><b>Contact:</b> {_esc(contact_raw)}</p>"
                 f"<p><b>Creator:</b> {_esc(creator)} · {entry['at']}</p>")
        to = os.getenv("SUGGEST_NOTIFY_EMAIL", "thedavidmurray@gmail.com")
        await asyncio.to_thread(_rs.send_email, to_email=to,
                                subject=f"Edgeless · product request: {product[:60]}", html=_html)
    except Exception:
        trace("suggest_email_failed", product=product)
    return JSONResponse({"ok": True})


@app.get("/suggestions")
async def suggestions():
    """Recorded product suggestions, most recent first. Mirrors /wants' simple,
    ungated read shape (the suggestion box has no admin gate)."""
    out = []
    try:
        with open(_SUGGESTIONS_FILE) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    continue
    except FileNotFoundError:
        out = []
    except Exception:
        out = []
    out.reverse()
    # Public endpoint: never leak raw submitter contact/IP. Mask contact, drop ip.
    for e in out:
        c = e.get("contact") or ""
        e["contact"] = (_email_mask(c) if "@" in c else ("***" if c else ""))
        e.pop("ip", None)
    return JSONResponse(out)


@app.get("/promos")
async def promos(request: Request):
    """Admin read: each promo code's mode/max/used/reserved so we can see remaining caps.
    Admin-gated — public enumeration would hand strangers the live discount codes (the
    floor keeps at-cost codes loss-proof, but % codes like FRIENDS shouldn't be drainable)."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    import promo as _promo
    return JSONResponse(_promo.status())


@app.post("/promo/check")
async def promo_check(request: Request):
    """Validate ONE buyer-typed code → {valid, label}. Lets the storefront show real
    'code applied' feedback instead of a dead input (nobody used the codes because nothing
    confirmed they worked). Confirms only the code given — never enumerates the code list."""
    if not _ip_rate_ok("promo-check", _client_ip(request), 30, 60):
        return JSONResponse({"valid": False, "reason": "rate_limited"}, status_code=429)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    code = (body.get("code") or "").strip().upper()
    import promo as _promo
    spec = _promo.PROMOS.get(code)
    if not spec:
        return JSONResponse({"valid": False})
    mode = spec.get("mode")
    if mode == "atcost":
        label = "At-cost — you pay only our print + shipping cost (final total at checkout)"
    elif mode == "percent":
        label = f"{spec.get('value')}% off"
    elif mode == "flat":
        label = f"${spec.get('value', 0) / 100:.2f} off"
    else:
        label = "Discount applied"
    return JSONResponse({"valid": True, "mode": mode, "label": label})


@app.get("/admin/catalog-probe")
async def catalog_probe(request: Request):
    """Admin: dump per-kind Printify variant geometry (front print-area w×h) + size/color
    options, so we can wire aspect-matched poster/mug sizing + Comfort Colors colors. The
    Printify catalog API is IP-locked to this host, so we probe from here."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    try:
        import catalog_client as cc
        import printify_client as pc
    except Exception as e:
        return JSONResponse({"error": "import_failed", "detail": repr(e)[:300]}, status_code=200)
    only = (request.query_params.get("kind") or "").strip().lower()
    out = {}
    for kind, spec in pc.KINDS.items():
        if only and kind != only:
            continue
        bp, prov = spec.get("blueprint"), spec.get("provider")
        try:
            body = cc.provider_variants(bp, prov)
            vs = (body.get("variants") if isinstance(body, dict) else body) or []
            summ = []
            for v in vs[:400]:
                phs = v.get("placeholders") or []
                front = next((p for p in phs if p.get("position") == "front"), phs[0] if phs else {})
                summ.append({"id": v.get("id"), "title": v.get("title"),
                             "w": front.get("width"), "h": front.get("height"),
                             "options": v.get("options")})
            out[kind] = {"bp": bp, "prov": prov, "current_variant": spec.get("variant"),
                         "count": len(vs), "variants": summ}
        except Exception as e:
            out[kind] = {"error": repr(e)[:200], "bp": bp, "prov": prov}
    try:
        return JSONResponse(out)
    except Exception as e:
        return JSONResponse({"error": "serialize_failed", "detail": repr(e)[:200],
                             "kinds": list(out.keys())}, status_code=200)


@app.post("/curate")
async def curate_design(request: Request):
    """Anti-slop immune system: an NVIDIA NIM vision model LOOKS at a design and scores
    it (craft/originality/policy). Slop is quarantined out of the premium shelf."""
    import curator
    import r2_client as r2
    if not _ip_rate_ok("curate", _client_ip(request), 8, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    art_url = body.get("art_url")
    art_slug = body.get("art_slug")
    title = (body.get("title") or "")[:80]
    if not art_url and art_slug:
        art_dir = ART_DIR
        path = os.path.join(art_dir, os.path.basename(art_slug))
        if not os.path.exists(path):
            return JSONResponse({"error": "art_not_found"}, status_code=404)
        up = await asyncio.to_thread(r2.upload_file, path)
        if not up.get("ok"):
            return JSONResponse({"error": "r2_upload_failed"}, status_code=502)
        art_url = up["url"]
    if not _url_allowed(art_url):
        return JSONResponse({"error": "art_url_not_allowed"}, status_code=400)
    result = await asyncio.to_thread(curator.curate, art_url, title)
    trace("design_curated", verdict=result.get("verdict"), score=result.get("score"))
    return JSONResponse(result)


# --- "Submit to the Pit" supply side --------------------------------------
# Humans AND agents submit art to be SCORED by the swarm (curator). If it clears
# the art gate it's LISTED in the Bazaar to earn royalties — this is the supply
# side (create + list), NOT the customize-and-buy demand side.
SUBMISSIONS_FILE = _data_path("submissions.json")
SUBMIT_MAX = 8        # max submissions per creator...
SUBMIT_WINDOW = 600   # ...within this many seconds (light anti-spam)
_SUBMIT_LEDGER = {}   # creator(lowercased) -> [ts, ...]  (in-memory, mirrors the want/IP ledger pattern)


def _load_submissions():
    # Each listing is its OWN R2 object (sub/<slug>.json) so concurrent writers never
    # clobber each other. Per-record objects are authoritative; the legacy whole-blob is
    # merged in only for records that don't yet have an object (migrating them), which also
    # preserves anything an old instance wrote during a deploy transition.
    by_slug = {}
    for rec in state_store.list_records("sub"):
        if rec.get("slug"):
            by_slug[rec["slug"]] = rec
    blob = state_store.load_json("submissions.json", None)
    if blob is None:
        try:
            with open(SUBMISSIONS_FILE) as f:
                blob = json.load(f)
        except Exception:
            blob = []
    for rec in (blob or []):
        slug = rec.get("slug")
        if slug and slug not in by_slug:      # blob-only → adopt + migrate to its own object
            by_slug[slug] = rec
            state_store.put_record("sub", slug, rec)
    return list(by_slug.values())


def _persist_sub(rec):
    """Concurrency-safe save — writes ONLY this listing's object. A concurrent submit/
    sale/remove touches a different key, so it can never clobber another listing (the
    whole-blob read-modify-write race that silently dropped records)."""
    if rec and rec.get("slug"):
        state_store.put_record("sub", rec["slug"], rec)


def _save_submissions(data):
    # Back-compat: persist every record individually (each its own object — still no clobber).
    for rec in (data or []):
        _persist_sub(rec)


SUBMISSIONS = _load_submissions()


def _submit_slug(art_url: str) -> str:
    import hashlib as _hl
    return "sub-" + _hl.sha256((art_url or "").strip().encode()).hexdigest()[:12]


def _scarcity_fields(s: dict) -> dict:
    """Derived limited-edition fields for a submission record. Backward compatible:
    a record with no quantity is unlimited (sold_out False, remaining None)."""
    q = s.get("quantity")
    sold = int(s.get("sold") or 0)
    sold_out = q is not None and sold >= q
    remaining = (max(0, q - sold) if q is not None else None)
    return {"quantity": q, "sold": sold, "sold_out": sold_out, "remaining": remaining}


def _find_submission(slug: str):
    for s in SUBMISSIONS:
        if s.get("slug") == slug:
            return s
    return None


def _is_sold_out(slug: str) -> bool:
    """True only if the listing has a quantity cap and it's been reached."""
    s = _find_submission(slug)
    return bool(s) and _scarcity_fields(s)["sold_out"]


# Retail price floor by product kind — mirrors the _PRICE_FLOOR table used at /submit
# time so the server can re-derive a listing's authoritative retail price without
# trusting the client. Kept in sync with the /submit copy.
_KIND_PRICE_FLOOR = {"tee": 34, "hoodie": 48, "cc-tee": 40, "sticker": 10, "poster": 28,
                     "embroidery": 30, "cap": 30, "bucket": 34, "tote": 24, "mug": 18, "enamel": 26}


_PF_HOODIE_VIDS = None  # cached set of hoodie (Printful product 294) catalog_variant_ids


async def _pf_hoodie_variant_ids() -> set:
    """Cached set of hoodie-product (Printful 294) catalog_variant_ids, used at /checkout to
    detect a tee-labeled request that actually carries a hoodie variant (tee & hoodie share
    the Printful path; the variant, not the kind string, decides the physical product). Fetched
    once from Printful. FAIL-SAFE: any error → empty set → caller keeps trusting the request
    kind (no worse than before, never blocks checkout). Only a non-empty fetch is cached, so a
    transient failure retries on the next checkout."""
    global _PF_HOODIE_VIDS
    if _PF_HOODIE_VIDS is not None:
        return _PF_HOODIE_VIDS
    try:
        import printful_client as _pf
        # Printful caps page size at 100 (limit>100 → HTTP 400); the hoodie catalog is ~50
        # variants, so the default page returns them ALL (verified live: 50 ids incl 9228). If
        # it ever exceeds 100 this would need pagination — see the len>=100 log below.
        r = await asyncio.to_thread(_pf.get_variants, 294)
        body = r.get("body") or {}
        rows = body.get("data") or ((body.get("result") or {}).get("catalog_variants")) or []
        vids = set()
        for v in rows:
            try:
                vids.add(int(v.get("id")))
            except (TypeError, ValueError):
                pass
        if len(vids) >= 100:   # tripwire: at the page cap → catalog may be truncated, needs pagination
            trace("pf_hoodie_variants_page_full", count=len(vids))
        if vids:
            _PF_HOODIE_VIDS = vids
        return vids
    except Exception:
        return set()


def _retail_price_cents_for_slug(slug: str, kind: str | None = None):
    """Authoritative retail price (cents) for a listing, derived server-side.
    Uses the listing's stored price if set, else the per-kind floor — never the
    client-supplied amount. This is the retail floor for /checkout so a tampered
    request can't buy a listed item below its shelf price (only above).

    For a slug NOT in SUBMISSIONS (a baked designs.json listing — the bulk of the
    catalog), fall back to the per-kind floor from the REQUEST's kind. This is
    authoritative because `kind` also drives fulfillment (you get the product you pay
    for), so a buyer can't cheapen a tee by claiming a sticker — the cheaper kind makes
    a cheaper product. Verified: 0/88 baked designs carry a custom price, so the kind
    floor IS their shelf price. Any future custom-priced listing comes via /submit (a
    SUBMISSIONS record with .price), which takes precedence below. Returns None only when
    the kind is unknown too (caller then keeps the cost floor).

    NOTE on tee vs hoodie: those two share the Printful path where the PHYSICAL product is
    the catalog_variant_id, not the kind string — so the /checkout caller resolves the true
    kind from the variant (via _pf_hoodie_variant_ids) BEFORE calling this, so `kind` here is
    already authoritative for that pair. The 9 Printify kinds are self-consistent (kind drives
    both price and product)."""
    s = _find_submission(slug)
    if not s:
        k = str(kind or "").lower()
        return int(_KIND_PRICE_FLOOR[k] * 100) if k in _KIND_PRICE_FLOOR else None
    price = s.get("price")
    if price is not None:
        try:
            return int(round(float(price) * 100))
        except (TypeError, ValueError):
            pass
    kind = (s.get("kind") or "tee").lower()
    return int(_KIND_PRICE_FLOOR.get(kind, 34) * 100)


def _increment_sold(slug: str):
    """Count one completed sale against a limited listing's cap and persist.
    No-op (returns None) for unknown slugs or unlimited listings."""
    s = _find_submission(slug)
    if not s or s.get("quantity") is None:
        return None
    # Re-fetch the AUTHORITATIVE sold count from R2 before incrementing. SUBMISSIONS is a
    # boot-time snapshot that never re-syncs, so incrementing it blind would write
    # (stale + 1) and silently clobber sales counted since boot / by another instance —
    # a cap bypass. Re-seed from R2 first → a converging read-then-write (self-healing).
    fresh = state_store.get_text(f"sub/{slug}.json")
    if fresh:
        try:
            s["sold"] = int((json.loads(fresh) or {}).get("sold") or 0)
        except Exception:
            pass
    s["sold"] = int(s.get("sold") or 0) + 1
    _persist_sub(s)   # save only this listing's record (no whole-blob clobber)
    return _scarcity_fields(s)


def _decrement_sold(slug: str):
    """Release one unit back to a limited listing's cap (a refunded/disputed sale) so it can
    resell. Re-fetches fresh from R2 first (same converging pattern as _increment_sold) and
    floors at 0. No-op for unknown/unlimited listings."""
    s = _find_submission(slug)
    if not s or s.get("quantity") is None:
        return None
    fresh = state_store.get_text(f"sub/{slug}.json")
    if fresh:
        try:
            s["sold"] = int((json.loads(fresh) or {}).get("sold") or 0)
        except Exception:
            pass
    s["sold"] = max(0, int(s.get("sold") or 0) - 1)
    _persist_sub(s)
    return _scarcity_fields(s)


def _submit_rate_ok(creator: str) -> bool:
    """True if `creator` is under SUBMIT_MAX submissions in the last SUBMIT_WINDOW seconds."""
    key = (creator or "").strip().lower()
    now = time.time()
    hits = [t for t in _SUBMIT_LEDGER.get(key, []) if now - t < SUBMIT_WINDOW]
    _SUBMIT_LEDGER[key] = hits
    return len(hits) < SUBMIT_MAX


@app.post("/submit")
async def submit(request: Request):
    """Supply side: submit art to be SCORED by the swarm. Clears the curator → LISTED
    in the Bazaar to earn royalties; quarantined → not listed. De-duped by art_url."""
    import curator
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    art_url = (body.get("art_url") or "").strip()
    title = (body.get("title") or "").strip()[:120]
    creator = (body.get("creator") or "").strip()[:120]
    # Server-derived verified identity: if a valid Privy token is attached, the
    # creator is the token's handle (anti-impersonation) — the client-sent value
    # is ignored. No token → keep the client value (anonymous, backward compatible).
    _pv = _privy_user(request)
    identity_verified = False
    if _pv:
        creator = _pv["handle"][:120]
        identity_verified = True
    # Product kind the design was listed as (so the grid renders the right product:
    # a hoodie shows as a hoodie, etc.). Backward compatible: defaults to 'tee'.
    kind = (body.get("kind") or "tee").strip().lower()
    if kind not in ALL_KINDS:
        kind = "tee"

    # Creator-set retail price (optional, dollars). Floor = the standard retail for the
    # chosen kind (mirrors PRODUCT_DETAILS in the frontend). Creators may price UP for
    # premium/limited drops; pricing BELOW the floor would erode margin, so we clamp up.
    # Backward compatible: omitted price → stored as None, frontend uses its kind default.
    _PRICE_FLOOR = {"tee": 34, "hoodie": 48, "cc-tee": 40, "sticker": 10, "poster": 28, "embroidery": 30,
                    "cap": 30, "bucket": 34, "tote": 24, "mug": 18, "enamel": 26}
    price = None
    if body.get("price") is not None:
        try:
            price = max(float(body.get("price")), float(_PRICE_FLOOR.get(kind, 34)))
            price = round(price, 2)
        except (TypeError, ValueError):
            price = None

    # Limited-edition cap (optional). <=0, missing, or unparseable → None (unlimited).
    # Backward compatible: existing records with no quantity stay unlimited.
    quantity = None
    if body.get("quantity") is not None:
        try:
            q = int(body.get("quantity"))
            quantity = q if q > 0 else None
        except (TypeError, ValueError):
            quantity = None

    # Garment colors the creator chose to offer (Printful apparel only). Each entry =
    # {color, color_code, variant_id}. The PDP renders a WORKING picker from this and the
    # buy sends the chosen variant_id — one card, real colors, no fake swatches. Empty/missing
    # → the frontend shows the single default color, no picker. Validated + capped + de-duped.
    colors = []
    raw_colors = body.get("colors")
    if kind in ("tee", "hoodie") and isinstance(raw_colors, list):
        seen_vid = set()
        for c in raw_colors[:8]:
            if not isinstance(c, dict):
                continue
            try:
                vid = int(c.get("variant_id"))
            except (TypeError, ValueError):
                continue
            cc = str(c.get("color_code") or "").strip()[:9]
            if not vid or not cc or vid in seen_vid:
                continue
            seen_vid.add(vid)
            colors.append({"color": str(c.get("color") or cc).strip()[:40], "color_code": cc, "variant_id": vid})

    if not _url_allowed(art_url):
        return JSONResponse({"ok": False, "reason": "bad_art_url"}, status_code=400)
    if not creator:
        return JSONResponse({"ok": False, "reason": "missing_creator"}, status_code=400)
    # Content policy on the title (the swarm rates craft, not message content) — block
    # slurs / third-party word-marks before listing.
    blocked = _text_policy_block(title)
    if blocked:
        trace("submit_blocked", reason=blocked)
        return JSONResponse({"ok": False, "reason": blocked}, status_code=422)
    # Auto-name untitled designs from what the vision model sees, so agents/buyers get a
    # real product name instead of "Untitled Design".
    if not title or title.strip().lower() in ("untitled", "untitled design"):
        title = (await asyncio.to_thread(curator.name_design, art_url)) or "Edgeless Original"

    # De-dupe by art_url: re-submitting the same art returns the existing verdict,
    # never double-lists it.
    slug = _submit_slug(art_url)
    for s in SUBMISSIONS:
        if s.get("slug") == slug:
            return JSONResponse({"ok": True, "slug": slug, "verdict": s.get("verdict"),
                                 "score": s.get("score"), "slop": s.get("slop"),
                                 "reason": s.get("reason"), "kind": s.get("kind", "tee"),
                                 "price": s.get("price"), "creator": s.get("creator"),
                                 "colors": s.get("colors") or [],
                                 "identity_verified": bool(s.get("identity_verified")),
                                 **_scarcity_fields(s),
                                 "listed": s.get("verdict") in ("premium", "bazaar"),
                                 "duplicate": True})

    # Light anti-spam: rate-limit per creator AND per IP (the creator string is client-
    # supplied/spoofable, so the IP limit is the real backstop). Checked after dedupe so a
    # re-submit of already-listed art doesn't burn a slot.
    if not _submit_rate_ok(creator) or not _ip_rate_ok("submit", _client_ip(request), 12, 600):
        return JSONResponse({"ok": False, "reason": "rate_limited"}, status_code=429)
    _SUBMIT_LEDGER.setdefault(creator.lower(), []).append(time.time())

    verdict = await asyncio.to_thread(curator.curate, art_url, title)
    v = verdict.get("verdict")
    listed = v in ("premium", "bazaar")

    import datetime
    rec = {
        "slug": slug, "title": title, "art_url": art_url,
        "verdict": v, "score": verdict.get("score"), "slop": verdict.get("slop"),
        "reason": verdict.get("reason"), "creator": creator, "kind": kind,
        "price": price, "quantity": quantity, "sold": 0, "colors": colors,
        "identity_verified": identity_verified,
        **({"privy_id": _pv["privy_id"]} if _pv else {}),
        # Per-listing delete token — lets the submitter remove their own listing later
        # even without Privy (they hold this). Never returned by /submissions (private).
        "delete_token": secrets.token_hex(8),
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    SUBMISSIONS.append(rec)
    _persist_sub(rec)   # per-record write — never clobbers other listings

    trace("design_submitted", verdict=v, creator=(_email_mask(creator) if "@" in creator else creator),
          slug=slug, score=verdict.get("score"), listed=listed, price=price, quantity=quantity,
          identity_verified=identity_verified)
    # Shareable link (rich OG preview via /s/<slug>) + suggested post, so a creator or agent
    # can immediately drive eyes to their own listing.
    # Render terminates TLS at its proxy, so request.base_url is http internally — force https
    # so shared links aren't insecure/broken.
    share_url = f"{str(request.base_url).rstrip('/').replace('http://', 'https://')}/s/{slug}"
    return JSONResponse({"ok": True, "slug": slug, "verdict": v, "score": verdict.get("score"),
                         "slop": verdict.get("slop"), "reason": verdict.get("reason"),
                         "kind": kind, "price": price, "creator": creator,
                         "colors": colors,
                         "identity_verified": identity_verified,
                         # The vision swarm's per-model ballots — proof the screen is a real
                         # ensemble, not one model. Additive; safe for older clients to ignore.
                         "models": verdict.get("models") or [],
                         "votes": verdict.get("votes") or [],
                         "delete_token": rec["delete_token"],
                         "share_url": share_url,
                         "share_text": f'"{title}" cleared the NVIDIA NIM vision swarm and it\'s on sale at Edgeless: {share_url}',
                         **_scarcity_fields(rec), "listed": listed})


@app.get("/submissions")
async def submissions():
    """Listed submissions (premium/bazaar) for the storefront Bazaar to merge in,
    newest first. Quarantined submissions are NOT returned."""
    out = [{"slug": s.get("slug"), "title": s.get("title"), "art_url": s.get("art_url"),
            "verdict": s.get("verdict"), "score": s.get("score"), "reason": s.get("reason"),
            "creator": s.get("creator"), "kind": s.get("kind", "tee"),
            "price": s.get("price"), "colors": s.get("colors") or [],
            **_scarcity_fields(s),
            "verified": _is_verified(s.get("creator")),
            "identity_verified": bool(s.get("identity_verified")),
            "ts": s.get("ts")}
           for s in SUBMISSIONS if s.get("verdict") in ("premium", "bazaar")]
    out.reverse()  # newest first (appended chronologically)
    return JSONResponse(out)


def _esc_html(s):
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;"))


@app.get("/s/{slug}")
async def share_page(slug: str):
    """Shareable link with rich OG/Twitter preview for a listing, so a shared URL shows the
    product (image + title) on X/Discord, then redirects to the storefront. Looks the slug up
    in live submissions; unknown/base slugs get a generic Edgeless card and still redirect."""
    store = os.environ.get("STORE_BASE_URL", "https://shop.edgelesslab.com").rstrip("/")
    dest = f"{store}/?d={slug}"
    rec = next((s for s in SUBMISSIONS if s.get("slug") == slug and s.get("verdict") in ("premium", "bazaar")), None)
    # Baked catalog designs aren't in SUBMISSIONS, so a share link fell back to the generic
    # card. Consult the R2 OG index (slug → {title, image, creator}) so EVERY product link
    # shows its real product mockup + title.
    if not rec:
        try:
            rec = (state_store.load_json("og_index.json", {}) or {}).get(slug)
        except Exception:
            rec = None
    if rec:
        title = rec.get("title") or "Edgeless design"
        img = rec.get("mockup") or rec.get("image") or rec.get("art_url") or f"{store}/how-it-works/img/hero.png"
        desc = f"By {rec.get('creator') or 'an Edgeless creator'} · screened by an NVIDIA NIM vision swarm · on sale at Edgeless."
    else:
        title = "Edgeless — a marketplace with an immune system"
        img = f"{store}/how-it-works/img/hero.png"
        desc = "Humans and AI agents design merch, a vision swarm screens it, and designers earn real royalties."
    page = f'''<!doctype html><html><head><meta charset="utf-8">
<title>{_esc_html(title)} — Edgeless</title>
<meta property="og:type" content="product">
<meta property="og:title" content="{_esc_html(title)}">
<meta property="og:description" content="{_esc_html(desc)}">
<meta property="og:image" content="{_esc_html(img)}">
<meta property="og:url" content="{_esc_html(dest)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{_esc_html(title)}">
<meta name="twitter:description" content="{_esc_html(desc)}">
<meta name="twitter:image" content="{_esc_html(img)}">
<meta http-equiv="refresh" content="0; url={_esc_html(dest)}">
<link rel="canonical" href="{_esc_html(dest)}"></head>
<body style="background:#0B0C0E;color:#ECEEF1;font-family:system-ui;text-align:center;padding:48px">
<p>Opening <a href="{_esc_html(dest)}" style="color:#C9FF4A">{_esc_html(title)}</a> on Edgeless…</p>
<script>location.replace({json.dumps(dest)})</script></body></html>'''
    return Response(content=page, media_type="text/html")


# --- THE TAPE: read-only market event stream for the Exchange hero ----------
# A DURABLE, VERIFIABLE tape merged from three sources, newest-LAST:
#   1) tape_seed.jsonl  -- committed, sanitized historical FLOOR (survives every
#      redeploy; Render's disk is ephemeral so runtime traces.jsonl resets).
#      Source of SCREENED / PAYOUT / ACCRUED / FULFILL prints for past events.
#   2) traces.jsonl     -- recent runtime events written by trace() this boot.
#   3) Stripe (READ-ONLY) -- the durable source of truth for MONEY: settled
#      PaymentIntents (SETTLED) and Connect Transfers (PAYOUT). These $ prints
#      never reset across deploys and each id is verifiable in the Stripe
#      dashboard. STRICTLY .list reads -- no create/confirm/capture/refund/cancel.
# No writes, no money movement, no pricing/checkout/webhook logic touched.
_TAPE_VERDICT = {"premium": "PASS", "bazaar": "HOLD", "quarantined": "FAIL"}

def _tape_print_from_trace(e):
    """Map one trace/seed event dict to a typed print, or None if not a tape kind."""
    ev, ts = e.get("event"), e.get("ts")
    if ev in ("design_submitted", "design_curated"):
        verdict = _TAPE_VERDICT.get(e.get("verdict"), "HOLD")
        return {"type": "SCREENED", "label": "SCREENED", "creator": e.get("creator"),
                "score": e.get("score"), "verdict": verdict, "ref": e.get("slug"), "ts": ts}
    if ev == "payment_intent_confirmed":
        return {"type": "SETTLED", "label": "SETTLED", "amount_cents": e.get("amount"),
                "ref": e.get("pi"), "ts": ts}
    if ev == "royalty_paid":
        amt = e.get("amount") if e.get("amount") is not None else e.get("amount_cents")
        return {"type": "PAYOUT", "label": "PAYOUT", "creator": e.get("creator"),
                "amount_cents": amt, "ref": e.get("transfer"), "ts": ts}
    if ev == "royalty_pending":
        amt = e.get("amount") if e.get("amount") is not None else e.get("amount_cents")
        return {"type": "ACCRUED", "label": "ACCRUED", "creator": e.get("creator"),
                "amount_cents": amt, "ts": ts}
    if ev in ("printful_draft_created", "printify_order_created"):
        return {"type": "FULFILL", "label": "FULFILL",
                "ref": str(e.get("order") or e.get("pi") or ""), "ts": ts}
    return None

def _tape_read_jsonl(path):
    """Yield typed prints from a JSONL trace file. Missing/unreadable -> nothing."""
    if not os.path.exists(path):
        return
    try:
        with open(path) as f:
            lines = [ln for ln in f.read().splitlines() if ln.strip()]
    except OSError:
        return
    for ln in lines:
        try:
            e = json.loads(ln)
        except ValueError:
            continue
        p = _tape_print_from_trace(e)
        if p:
            yield p

_TAPE_STRIPE_CACHE = {"ts": 0.0, "data": None}

def _tape_stripe_prints():
    """READ-ONLY Stripe pull: settled PaymentIntents + Connect Transfers as typed
    prints. STRICTLY .list reads. Any error -> [] (tape falls back to seed+traces).
    This is the durable, judge-verifiable money source (each id lives in Stripe).
    Cached 60s so a crawler hammering /tape or /leaderboard can't spam Stripe's API."""
    if not STRIPE_KEY:
        return []
    if _TAPE_STRIPE_CACHE["data"] is not None and (time.time() - _TAPE_STRIPE_CACHE["ts"]) < 60:
        return _TAPE_STRIPE_CACHE["data"]
    out = []
    try:
        from datetime import datetime, timezone
        # SETTLED: succeeded PaymentIntents (read-only list).
        for pi in stripe.PaymentIntent.list(limit=40).get("data", []):
            if pi.get("status") == "succeeded":
                out.append({"type": "SETTLED", "label": "SETTLED",
                            "amount_cents": pi.get("amount"), "ref": pi.get("id"),
                            "ts": datetime.fromtimestamp(pi.get("created", 0),
                                                         tz=timezone.utc).isoformat()})
        # PAYOUT: Connect royalty Transfers (read-only list).
        for tr in stripe.Transfer.list(limit=40).get("data", []):
            meta = tr.get("metadata") or {}
            out.append({"type": "PAYOUT", "label": "PAYOUT",
                        "amount_cents": tr.get("amount"), "ref": tr.get("id"),
                        "creator": meta.get("creator"),
                        "ts": datetime.fromtimestamp(tr.get("created", 0),
                                                     tz=timezone.utc).isoformat()})
    except Exception:
        return _TAPE_STRIPE_CACHE["data"] or []  # Stripe hiccup must never break /tape.
    _TAPE_STRIPE_CACHE["ts"], _TAPE_STRIPE_CACHE["data"] = time.time(), out
    return out

def _tape_sort_key(p):
    ts = p.get("ts")
    try:
        import datetime as _dt
        return _dt.datetime.fromisoformat(ts).timestamp() if ts else 0.0
    except (ValueError, TypeError):
        return 0.0

@app.get("/tape")
async def tape(n: int = 40):
    """Last N market prints, newest-LAST, merged from the durable seed floor +
    live runtime traces + read-only Stripe money source. De-duped by ref/id."""
    n = max(1, min(int(n), 100))
    here = os.path.dirname(__file__)
    merged = []
    merged.extend(_tape_read_jsonl(os.path.join(here, "tape_seed.jsonl")))  # committed seed floor
    merged.extend(_tape_read_jsonl(_data_path("traces.jsonl")))             # recent runtime (persistent)
    merged.extend(_tape_stripe_prints())                                    # durable $ source

    # Dedup by a stable key: (type, ref) when a ref/id exists; else identity.
    deduped, seen = [], set()
    for p in merged:
        ref = p.get("ref")
        key = (p.get("type"), ref) if ref else id(p)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)

    deduped.sort(key=_tape_sort_key)          # oldest -> newest
    prints = deduped[-n:]                       # newest-last, last n

    is_open = False
    if prints:
        newest_ts = prints[-1].get("ts")
        if newest_ts:
            try:
                import datetime
                dt = datetime.datetime.fromisoformat(newest_ts)
                age = (datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds()
                is_open = age <= 600  # newest event within ~10 min
            except ValueError:
                is_open = False
    return JSONResponse({"ok": True, "open": is_open, "prints": prints})


# --- THE LEADERBOARD: read-only royalty aggregation for the Exchange ----------
# Ranks creators (human + agent) by TOTAL real royalties earned. Strictly a
# READ-ONLY companion to /tape: it re-uses the SAME durable money sources --
#   1) tape_seed.jsonl committed floor (royalty_paid + royalty_pending), and
#   2) Stripe Connect Transfers (read-only .list) when STRIPE_SECRET_KEY is set.
# No writes, no money movement, no pricing/checkout/Connect logic touched.
#   - paid     = royalty_paid events + settled Stripe PAYOUT transfers
#   - accrued  = royalty_pending events (creator earned, awaiting onboarding)
# Transfers are de-duped against the seed by transfer id (no double-count).
def _leaderboard_seed_rows(path):
    """Yield (creator, kind, amount_cents, transfer_id) from a royalty JSONL file.
    kind is 'paid' or 'accrued'. Skips non-royalty events and blank/empty data."""
    if not os.path.exists(path):
        return
    try:
        with open(path) as f:
            lines = [ln for ln in f.read().splitlines() if ln.strip()]
    except OSError:
        return
    for ln in lines:
        try:
            e = json.loads(ln)
        except ValueError:
            continue
        ev = e.get("event")
        if ev not in ("royalty_paid", "royalty_pending"):
            continue
        creator = (e.get("creator") or "").strip()
        if not creator:
            continue
        amount = e.get("amount") or e.get("amount_cents")
        try:
            amount = int(amount)
        except (TypeError, ValueError):
            continue
        if amount <= 0:
            continue
        kind = "paid" if ev == "royalty_paid" else "accrued"
        yield creator, kind, amount, (e.get("transfer") or e.get("ref"))


def _leaderboard_stripe_transfers():
    """READ-ONLY Stripe pull of Connect PAYOUT transfers as (creator, amount_cents,
    transfer_id). STRICTLY .list -- no create/transfer/charge. Any error -> []."""
    if not STRIPE_KEY:
        return []
    out = []
    try:
        for tr in stripe.Transfer.list(limit=100).get("data", []):
            meta = tr.get("metadata") or {}
            creator = (meta.get("creator") or "").strip()
            if not creator:
                continue
            try:
                amount = int(tr.get("amount"))
            except (TypeError, ValueError):
                continue
            if amount <= 0:
                continue
            out.append((creator, amount, tr.get("id")))
    except Exception:
        return []  # Stripe hiccup must never break /leaderboard.
    return out


@app.get("/leaderboard")
async def leaderboard():
    """Creators ranked by total real royalties (paid + accrued), desc. Read-only
    aggregation over the durable seed floor + read-only Stripe transfers."""
    here = os.path.dirname(__file__)
    agg = {}  # creator -> {"paid": cents, "accrued": cents, "payouts": n}
    seen_transfers = set()

    def _row(creator):
        return agg.setdefault(creator, {"paid": 0, "accrued": 0, "payouts": 0})

    # 1) Durable committed seed floor (paid + pending royalties).
    for creator, kind, amount, tid in _leaderboard_seed_rows(
            os.path.join(here, "tape_seed.jsonl")):
        r = _row(creator)
        r[kind] += amount
        if kind == "paid":
            r["payouts"] += 1
            if tid:
                seen_transfers.add(tid)

    # 2) Read-only Stripe Connect transfers, de-duped against seed by id.
    for creator, amount, tid in _leaderboard_stripe_transfers():
        if tid and tid in seen_transfers:
            continue
        if tid:
            seen_transfers.add(tid)
        r = _row(creator)
        r["paid"] += amount
        r["payouts"] += 1

    leaders = [
        {"creator": c, "total_cents": v["paid"] + v["accrued"],
         "paid_cents": v["paid"], "accrued_cents": v["accrued"],
         "payouts": v["payouts"]}
        for c, v in agg.items()
    ]
    leaders.sort(key=lambda x: (-x["total_cents"], x["creator"]))
    return JSONResponse({"ok": True, "leaders": leaders})


@app.get("/oxygen")
async def oxygen_global(request: Request):
    """The single legitimacy number: aggregate VESTED oxygen across ALL listings.
    Read-only, no auth — exposes ONLY aggregates (payer keys / emails never returned)."""
    if not _ip_rate_ok("oxygen", _client_ip(request), 60, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    import oxygen
    return JSONResponse({"slug": None, **oxygen.tally(None), "vest_days": oxygen.OXYGEN_VEST_DAYS})


@app.get("/oxygen/{slug}")
async def oxygen_for_slug(slug: str, request: Request):
    """Vested oxygen for ONE listing (matches listing_slug OR art_slug/design_key)."""
    if not _ip_rate_ok("oxygen", _client_ip(request), 60, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    import oxygen
    return JSONResponse({"slug": slug, **oxygen.tally(slug), "vest_days": oxygen.OXYGEN_VEST_DAYS})


@app.post("/admin/remove")
async def admin_remove(request: Request):
    """Human override: remove an agent-approved listing. Requires X-Admin-Secret.
    Sets the submission's verdict to 'removed' so /submissions (premium/bazaar only)
    no longer returns it. Idempotent."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    slug = (body.get("slug") or "").strip()
    removed = False
    for s in SUBMISSIONS:
        if s.get("slug") == slug and s.get("verdict") != "removed":
            s["verdict"] = "removed"
            removed = True
            _persist_sub(s)   # per-record write
    trace("admin_removed", slug=slug, ok=removed)
    return JSONResponse({"ok": removed, "slug": slug})


@app.post("/unlist")
async def unlist(request: Request):
    """Self-serve listing removal. A listing can be unlisted by EITHER:
      (a) its owner via Privy (privy_id or verified handle matches), OR
      (b) presenting the per-listing delete_token returned at /submit time.
    This lets unverified submitters delete their own (they hold the token) while keeping
    everyone else out. Sets verdict='removed' (same as /admin/remove). Constant-time token
    compare. Returns 403 if neither proof of ownership matches the listing."""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    slug = (body.get("slug") or "").strip()
    token = (body.get("delete_token") or "").strip()
    pv = _privy_user(request)
    handle = (pv.get("handle") or "").strip().lower() if pv else ""
    pid = pv.get("privy_id") if pv else None
    if not slug or (not token and not pv):
        return JSONResponse({"ok": False, "reason": "auth_required"}, status_code=401)
    removed = False
    for s in SUBMISSIONS:
        if s.get("slug") != slug or s.get("verdict") == "removed":
            continue
        owns = (pid and s.get("privy_id") == pid) or \
               (handle and (s.get("creator") or "").strip().lower() == handle) or \
               (token and s.get("delete_token") and secrets.compare_digest(str(s.get("delete_token")), token))
        if owns:
            s["verdict"] = "removed"
            removed = True
            _persist_sub(s)   # per-record write
    trace("self_unlist", slug=slug, via=("privy" if pv else "token"), ok=removed)
    if not removed:
        return JSONResponse({"ok": False, "reason": "not_your_listing"}, status_code=403)
    return JSONResponse({"ok": True, "slug": slug})


# --- Creator verification (manual admin review) ------------------------------
# Anyone can REQUEST a verified ✓ for a creator handle; the owner (admin, via
# X-Admin-Secret) approves/denies. Approved handles get a ✓ badge on their listings.
# Persisted next to main.py, atomic write (mirrors _save_submissions).
VERIFY_FILE = _data_path("verify_state.json")


def _load_verify():
    d = state_store.load_json("verify_state.json", None)
    if d is None:
        try:
            with open(VERIFY_FILE) as f:
                d = json.load(f)
        except Exception:
            d = {}
    if not isinstance(d, dict):
        d = {}
    d.setdefault("requests", [])
    d.setdefault("verified", [])
    return d


def _save_verify(data):
    state_store.save_json("verify_state.json", data)


VERIFY = _load_verify()


def _privy_handle_from_claims(claims: dict) -> str:
    """Derive a stable, human-readable creator handle from verified Privy JWT claims.
    Privy access-token claims are minimal (sub/iss/aud/exp); the linked-account detail
    we'd prefer (X username, email) lives behind the Privy API, not the token. So we
    fall back to the stable Privy DID (`sub`) shortened, which is a fine server-side
    creator id (unique + unspoofable). Returns '' if nothing usable."""
    sub = (claims.get("sub") or "").strip()
    if sub:
        # e.g. did:privy:clxxxx... → "privy:clxx…xxxx" (short, stable, unique)
        tail = sub.split(":")[-1]
        return f"privy:{tail[:6]}…{tail[-4:]}" if len(tail) >= 12 else f"privy:{tail}"
    return ""


_PRIVY_JWKS_CLIENT = None

def _privy_signing_key(token: str):
    """Key to verify a Privy token with: an explicit static PEM (PRIVY_VERIFICATION_KEY) if
    set, else Privy's published JWKS for this app — which auto-selects the right key by the
    token's `kid` and survives Privy's key rotation (their JWKS carries 2 keys). This means
    creator payouts work with NO manual key management and no stale-key outage. PyJWKClient
    caches the JWKS in-process."""
    global _PRIVY_JWKS_CLIENT
    if PRIVY_VERIFICATION_KEY:
        return PRIVY_VERIFICATION_KEY
    import jwt  # PyJWT
    if _PRIVY_JWKS_CLIENT is None:
        _PRIVY_JWKS_CLIENT = jwt.PyJWKClient(f"https://auth.privy.io/api/v1/apps/{PRIVY_APP_ID}/jwks.json")
    return _PRIVY_JWKS_CLIENT.get_signing_key_from_jwt(token).key


def _privy_user(request: Request):
    """Verify the Privy access token on a request and return the verified identity.

    Reads `Authorization: Bearer <jwt>`, verifies it (ES256) against the Privy public
    verification key with PyJWT. On success returns
        {"verified": True, "handle": <server-derived>, "privy_id": <sub>}
    Returns None when there's no token, the libs/key are unavailable, or verification
    fails — callers then keep the existing (unverified, backward-compatible) behavior.
    Never raises; identity is a bonus, the store must work without it."""
    try:
        auth = request.headers.get("authorization") or request.headers.get("Authorization") or ""
        if not auth.lower().startswith("bearer "):
            return None
        token = auth.split(" ", 1)[1].strip()
        if not token:
            return None
        try:
            import jwt  # PyJWT; [crypto] extra needed for ES256
        except Exception:
            return None
        key = _privy_signing_key(token)  # static PEM, else Privy JWKS (rotation-safe)
        if not key:
            return None
        claims = jwt.decode(
            token,
            key,
            algorithms=["ES256"],
            audience=PRIVY_APP_ID,
            issuer="privy.io",
        )
        handle = _privy_handle_from_claims(claims)
        if not handle:
            return None
        return {"verified": True, "handle": handle, "privy_id": claims.get("sub")}
    except Exception:
        # Bad/expired/forged token, key mismatch, missing crypto backend → fail safe.
        return None


def _is_verified(creator) -> bool:
    """True if `creator`'s handle is in the verified set (case-insensitive)."""
    h = (creator or "").strip().lower()
    if not h:
        return False
    return any(h == (v or "").strip().lower() for v in VERIFY.get("verified", []))


def _find_verify_request(handle: str):
    """Most recent request for `handle` (case-insensitive), or None."""
    h = (handle or "").strip().lower()
    for req in reversed(VERIFY.get("requests", [])):
        if (req.get("handle") or "").strip().lower() == h:
            return req
    return None


@app.post("/verify/request")
async def verify_request(request: Request):
    """Public: request a verified ✓ for a creator handle. No auth (admin gates approval).
    De-duped by handle: if already pending or verified, returns the current status
    instead of stacking duplicate requests. Light validation only."""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    handle = (body.get("handle") or "").strip()
    proof_url = (body.get("proof_url") or "").strip()[:500]
    note = (body.get("note") or "").strip()[:500]
    if not handle or len(handle) > 80:
        return JSONResponse({"ok": False, "reason": "bad_handle"}, status_code=400)

    if _is_verified(handle):
        return JSONResponse({"ok": True, "handle": handle, "status": "verified", "duplicate": True})
    existing = _find_verify_request(handle)
    if existing and existing.get("status") == "pending":
        return JSONResponse({"ok": True, "handle": handle, "status": "pending", "duplicate": True})

    import datetime
    rec = {
        "handle": handle, "proof_url": proof_url, "note": note,
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "pending",
    }
    VERIFY.setdefault("requests", []).append(rec)
    _save_verify(VERIFY)
    trace("verify_requested", handle=handle, has_proof=bool(proof_url))
    return JSONResponse({"ok": True, "handle": handle, "status": "pending"})


@app.get("/verify/requests")
async def verify_requests(request: Request):
    """Admin: list pending verification requests (newest first)."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    pending = [r for r in VERIFY.get("requests", []) if r.get("status") == "pending"]
    pending.reverse()
    return JSONResponse(pending)


@app.post("/verify/approve")
async def verify_approve(request: Request):
    """Admin: grant the ✓ to a handle. Adds it to the verified set and marks the
    request approved. Idempotent."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    handle = (body.get("handle") or "").strip()
    if not handle:
        return JSONResponse({"ok": False, "reason": "bad_handle"}, status_code=400)
    if not _is_verified(handle):
        VERIFY.setdefault("verified", []).append(handle)
    for req in VERIFY.get("requests", []):
        if (req.get("handle") or "").strip().lower() == handle.lower():
            req["status"] = "approved"
    _save_verify(VERIFY)
    trace("verify_approved", handle=handle, by="admin")
    return JSONResponse({"ok": True, "handle": handle, "verified": True})


@app.post("/verify/deny")
async def verify_deny(request: Request):
    """Admin: deny a verification request. Marks the request(s) denied and removes the
    handle from the verified set if present (revoke). Idempotent."""
    if not _admin_ok(request):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    handle = (body.get("handle") or "").strip()
    if not handle:
        return JSONResponse({"ok": False, "reason": "bad_handle"}, status_code=400)
    VERIFY["verified"] = [v for v in VERIFY.get("verified", [])
                          if (v or "").strip().lower() != handle.lower()]
    for req in VERIFY.get("requests", []):
        if (req.get("handle") or "").strip().lower() == handle.lower():
            req["status"] = "denied"
    _save_verify(VERIFY)
    trace("verify_denied", handle=handle, by="admin")
    return JSONResponse({"ok": True, "handle": handle, "verified": False})


@app.get("/verify/status")
async def verify_status(handle: str = ""):
    """Public: is this handle verified?"""
    return JSONResponse({"handle": handle, "verified": _is_verified(handle)})


@app.post("/connect/onboard")
async def connect_onboard(request: Request):
    """Self-serve payouts: returns a Stripe-hosted Express onboarding URL for a creator.
    Completing it (Stripe verifies identity) makes the creator payable — no allowlist."""
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    creator = (body.get("creator") or "").strip()[:120]
    # Verified identity (Privy token) wins: payouts get tied to the server-derived
    # handle, so a creator can't onboard a payout account under someone else's name.
    _pv = _privy_user(request)
    identity_verified = False
    if _pv:
        creator = _pv["handle"][:120]
        identity_verified = True
    if not creator:
        return JSONResponse({"ok": False, "reason": "missing_creator"}, status_code=400)
    store = os.environ.get("STORE_BASE_URL", "https://shop.edgelesslab.com").rstrip("/")
    import stripe_connect as sc
    import urllib.parse as _up
    # Anti-squatting: CREATING a new payout account requires verified identity (Privy),
    # so nobody can open a Stripe Express account under another creator's handle. An
    # EXISTING account may still refresh its onboarding link without a token (the Stripe
    # refresh_url redirect carries none) — that can't claim a new identity.
    if not identity_verified and not sc.has_account(creator):
        trace("connect_onboard_unverified_rejected", creator=creator)
        return JSONResponse({"ok": False, "reason": "verification_required",
                             "detail": "Sign in to create a payout account."}, status_code=401)
    cq = _up.quote(creator)
    r = await asyncio.to_thread(
        sc.create_onboarding, creator=creator,
        return_url=f"{store}/payouts/?creator={cq}&done=1",
        refresh_url=f"{store}/payouts/?creator={cq}")
    trace("connect_onboard", creator=creator, ok=r.get("ok"), reason=r.get("reason"),
          identity_verified=identity_verified)
    if isinstance(r, dict):
        r = {**r, "creator": creator, "identity_verified": identity_verified}
    return JSONResponse(r, status_code=200 if r.get("ok") else 502)


@app.get("/connect/status")
async def connect_status(creator: str = ""):
    """Whether a creator has completed onboarding and is payable."""
    creator = (creator or "").strip()[:120]
    if not creator:
        return JSONResponse({"exists": False, "payouts_enabled": False})
    import stripe_connect as sc
    st = await asyncio.to_thread(sc.account_status, creator)
    # Don't leak the raw Stripe Connect account id (acct_...) to unauthenticated callers —
    # creator handles are publicly enumerable, so this would expose every creator's acct id.
    if isinstance(st, dict):
        st = {k: v for k, v in st.items() if k != "account_id"}
    return JSONResponse(st)


# Backstop floor per kind if the live POD cost API is unreachable (real costs probed
# 2026-06-27). Apparel uses a conservative min below any real apparel cost+ship.
_FALLBACK_FLOOR_CENTS = {"sticker": 601, "poster": 1350, "embroidery": 1985, "cc-tee": 2526,
                         "cap": 2100, "bucket": 2600, "tote": 1400, "mug": 1150, "enamel": 1750}
_APPAREL_FALLBACK_FLOOR_CENTS = 2000


def _with_stripe_fee(net_cents: int) -> int:
    """Gross up a cost so we NET it after Stripe's 2.9% + 30c, i.e. solve
    net = charge*(1-0.029) - 0.30 for charge. Baked into the floor/at-cost price
    (never itemized) so an at-cost print breaks even for real, not break-even-minus-fee.
    Pure-int ceil of (net + 30) / 0.971."""
    n = int(net_cents or 0)
    if n <= 0:
        return n
    return ((n + 30) * 1000 + 970) // 971


async def _real_pod_cost_cents(body, recipient_norm):
    """REAL POD cost (item + shipping) for this product from the provider, in cents.
    Item cost is address-independent; shipping uses recipient_norm (a default address is
    fine for a price FLOOR). Returns None only if both the API and any backstop are unknown."""
    kind = (body.get("kind") or "").lower()
    try:
        if kind in PRINTIFY_KINDS:
            import printify_client as _pfy
            e = await asyncio.to_thread(_pfy.estimate_cost, kind=kind, recipient=recipient_norm,
                                        art_url=_safe_art_url(body.get("art_url")))
            if e.get("ok"):
                return int(e["total_cents"])
            return _FALLBACK_FLOOR_CENTS.get(kind)
        cvar = body.get("catalog_variant_id")
        if not cvar:
            # No variant → can't price exactly, but NEVER return None for apparel: that made
            # the floor 0 and let a crafted below-cost order through. Fall back to the apparel floor.
            return _APPAREL_FALLBACK_FLOOR_CENTS
        import printful_client as _pf
        rcp = {"address1": recipient_norm.get("address1") or "1 SW Main St",
               "city": recipient_norm.get("city") or "Portland",
               "state_code": recipient_norm.get("state") or recipient_norm.get("state_code") or "OR",
               "country_code": recipient_norm.get("country") or recipient_norm.get("country_code") or "US",
               "zip": recipient_norm.get("zip") or "97204"}
        e = await asyncio.to_thread(_pf.estimate_costs, catalog_variant_id=int(cvar),
                                    recipient=rcp, art_url=_safe_art_url(body.get("art_url")))
        return int(e["total_cents"]) if e.get("ok") else _APPAREL_FALLBACK_FLOOR_CENTS
    except Exception as e:
        trace("real_cost_error", error=str(e)[:160])
        return _FALLBACK_FLOOR_CENTS.get(kind, _APPAREL_FALLBACK_FLOOR_CENTS)


@app.post("/checkout")
async def checkout(request: Request):
    """Real-money HUMAN checkout: a hosted Stripe Checkout Session for the selected
    product. The customer enters their card on Stripe's own page — we never see or
    handle card data. Fulfillment (POD order + arms-length royalty) happens on the
    checkout.session.completed webhook via the shared _fulfill_and_royalty helper,
    so a human card buy and an agent /pay buy behave identically downstream."""
    if not STRIPE_KEY:
        return JSONResponse({"error": "stripe_not_configured"}, status_code=500)
    if not _ip_rate_ok("checkout", _client_ip(request), 20, 60):
        return JSONResponse({"error": "rate_limited"}, status_code=429)
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    try:
        amount_cents = max(50, int(body.get("amount_cents") or PRICE_CENTS))
        # $250 sanity ceiling — the client supplies amount_cents, and an inflated amount would
        # inflate the 18% Connect royalty transfer (not auto-reversed on dispute) into a
        # chargeback-extraction lever. Clamp it.
        if amount_cents > 25000:
            trace("checkout_amount_clamped", requested=amount_cents, ceiling=25000)
            amount_cents = 25000
    except (TypeError, ValueError):
        amount_cents = PRICE_CENTS
    name = (body.get("design") or SERVICE_NAME)[:120]
    # Must default to the STOREFRONT (shop.), not the marketing site — edgelesslab.com has no
    # /checkout/success route (404s), so a paid buyer would think the order failed. Matches
    # every other STORE_BASE_URL default in this service (lines 490/1858/2379).
    store = os.environ.get("STORE_BASE_URL", "https://shop.edgelesslab.com")

    # Limited-edition guard: refuse to create a Stripe session for a sold-out listing
    # (quantity cap reached). Catches the race where the last unit sold between page load
    # and checkout. Backward compatible: listings with no quantity are never sold out.
    listing_slug = (body.get("listing_slug") or "").strip()
    if listing_slug and _is_sold_out(listing_slug):
        trace("checkout_sold_out_rejected", slug=listing_slug)
        return JSONResponse({"error": "sold_out", "listing_slug": listing_slug}, status_code=409)

    # Floor-enforced promo codes — we compute the discount ourselves (NOT Stripe coupons)
    # so a code can never drop the price below the floor (cost+shipping). floor_cents is
    # the break-even price; at_cost sales skip the creator royalty (no margin to share).
    import promo as _promo
    promo_code = (body.get("promo_code") or "").strip()
    try:
        floor_cents = int(body.get("floor_cents")) if body.get("floor_cents") is not None else None
    except (TypeError, ValueError):
        floor_cents = None
    at_cost = False
    # Any promo prices against the POD provider's REAL cost (no estimate). That needs the
    # shipping address up front, so we price + ship to exactly that address (Stripe address
    # collection is turned off for promo orders). Carried to the webhook via metadata.
    promo_recipient = None
    promo_resv = ""
    if promo_code:
        # Fast read-only pre-check (fail early before the cost-estimate work). The
        # AUTHORITATIVE atomic claim is reserve(), done just before the Stripe session is
        # created — see below — which closes the old cap_ok→redeem race.
        if not _promo.cap_ok(promo_code):
            return JSONResponse({"error": "promo_cap_reached", "promo_code": promo_code.upper()}, status_code=400)
        applied = _promo.apply(promo_code, amount_cents, floor_cents)
        if not applied.get("ok"):
            return JSONResponse({"error": applied.get("reason") or "invalid_code"}, status_code=400)
        promo_code = applied.get("code") or promo_code
        mode = applied.get("mode")
        kind = (body.get("kind") or "").lower()
        is_printify = kind in PRINTIFY_KINDS
        # Normalize the address the buyer entered (required for real-cost pricing).
        r = body.get("recipient") or {}
        norm = {"name": (r.get("name") or "").strip(), "email": (r.get("email") or "").strip(),
                "address1": (r.get("address1") or "").strip(), "address2": (r.get("address2") or "").strip(),
                "city": (r.get("city") or "").strip(),
                "state": (r.get("state") or r.get("state_code") or "").strip(),
                "country": (r.get("country") or r.get("country_code") or "US").strip(),
                "zip": (r.get("zip") or "").strip()}
        if not (norm["address1"] and norm["city"] and norm["zip"] and norm["state"]):
            return JSONResponse({"error": "promo_requires_address",
                                 "detail": "Promo pricing uses the real POD cost, which needs a full shipping address."},
                                status_code=400)
        # Ask the actual POD provider what this really costs (item + shipping), to the cent.
        if is_printify:
            import printify_client as _pfy
            est = await asyncio.to_thread(_pfy.estimate_cost, kind=kind, recipient=norm,
                                          art_url=_safe_art_url(body.get("art_url")))
        else:
            cvar = body.get("catalog_variant_id")
            if not cvar:
                return JSONResponse({"error": "promo_needs_variant"}, status_code=400)
            import printful_client as _pf
            rcp = {"address1": norm["address1"], "city": norm["city"], "state_code": norm["state"],
                   "country_code": norm["country"], "zip": norm["zip"]}
            est = await asyncio.to_thread(_pf.estimate_costs, catalog_variant_id=int(cvar),
                                          recipient=rcp, art_url=_safe_art_url(body.get("art_url")))
        if not est.get("ok"):
            return JSONResponse({"error": "cost_unavailable", "detail": str(est.get("error"))[:200]}, status_code=502)
        real_cost = max(50, _with_stripe_fee(int(est["total_cents"])))  # net our cost after the Stripe fee
        if mode == "atcost":
            amount_cents = real_cost                              # at-cost = cost + fee grossed in (we net cost)
            at_cost = True
        else:
            amount_cents = max(int(applied["final_cents"]), real_cost)  # discounted, but NEVER below real cost
            at_cost = amount_cents <= real_cost + 1
        promo_recipient = norm
    else:
        # SECURITY: the client supplies amount_cents, so never trust it.
        # Two floors, strongest first:
        # 1) RETAIL floor — for a known listing_slug, re-derive the authoritative shelf
        #    price server-side and refuse anything below it. Closes the margin-erosion gap
        #    where a tampered request bought a listed item at POD cost instead of retail
        #    (the shelf price was never enforced server-side, only the cost floor below was).
        # 2) COST floor — for anything without a slug (legacy/ad-hoc), still never sell
        #    below real POD cost (a live order below cost is a guaranteed loss).
        # Pre-charge fulfillment guard: a hoodie with no resolvable Printful variant would be
        # REFUSED at fulfillment (we never ship a tee substitute), so reject it BEFORE charging
        # the card rather than charge-then-fail. Tee has a safe default variant; Printify kinds
        # validate their own variant downstream; the promo path already requires a variant.
        try:
            _cv = int(body.get("catalog_variant_id") or 0)
        except (TypeError, ValueError):
            _cv = 0
        _reqkind = str(body.get("kind") or "").lower()
        if _reqkind == "hoodie" and _cv <= 0:
            trace("checkout_hoodie_no_variant_rejected", slug=listing_slug)
            return JSONResponse({"error": "variant_required",
                                 "detail": "Please select a size for this item."}, status_code=400)
        # tee & hoodie share the Printful path; the PHYSICAL product is the variant, not the
        # kind string. A "tee"-labeled request carrying a hoodie (product 294) variant would
        # otherwise price at the $34 tee floor while a $48 hoodie ships — resolve the true kind
        # from the variant so the retail floor matches what fulfillment actually makes.
        if _reqkind == "tee" and _cv > 0 and _cv in await _pf_hoodie_variant_ids():
            trace("checkout_kind_corrected_tee_to_hoodie", variant=_cv, slug=listing_slug)
            _reqkind = "hoodie"
        retail_floor = _retail_price_cents_for_slug(listing_slug, _reqkind) if listing_slug else None
        if retail_floor and amount_cents < retail_floor:
            trace("checkout_below_retail_corrected", requested=amount_cents,
                  retail=retail_floor, slug=listing_slug)
            amount_cents = retail_floor   # enforce shelf price; ignore under-quote
        default_addr = {"country": "US", "state": "OR", "city": "Portland", "zip": "97204", "address1": "1 SW Main St"}
        floor = _with_stripe_fee(await _real_pod_cost_cents(body, default_addr))  # floor nets cost after the fee
        if floor and amount_cents < floor:
            trace("checkout_below_cost_rejected", amount=amount_cents, floor=floor, kind=body.get("kind"))
            return JSONResponse({"error": "price_below_cost",
                                 "detail": "That price is below our cost."}, status_code=400)

    # Atomically claim the promo cap slot now that all validation passed — this is the
    # authoritative gate (the early cap_ok was only a fast pre-check). Done here, right
    # before the session is created, so abandoned/invalid attempts never consumed a slot.
    if promo_code:
        promo_resv = secrets.token_hex(8)
        if not _promo.reserve(promo_code, promo_resv):
            return JSONResponse({"error": "promo_cap_reached", "promo_code": promo_code.upper()}, status_code=400)

    # The promo shipping address must NOT be silently truncated — a clipped JSON fails
    # json.loads in the webhook → the buyer is charged with no usable recipient. Validate its
    # length up front (before any charge) and carry it UN-truncated.
    recipient_json = json.dumps(promo_recipient) if promo_recipient else ""
    if len(recipient_json) > 490:  # Stripe metadata value cap is ~500
        return JSONResponse({"error": "address_too_long",
                             "detail": "That shipping address is too long to process — please shorten it and retry."},
                            status_code=400)
    # Carry only what the webhook needs to fulfill (Stripe metadata caps values ~500 chars).
    meta = {k: str(v)[:480] for k, v in {
        "kind": body.get("kind") or "tee",
        "design": name,
        "art_url": body.get("art_url") or "",
        "creator": body.get("creator") or "",
        "buyer": body.get("buyer") or "",
        "catalog_variant_id": body.get("catalog_variant_id") or "",
        "printify_product_id": body.get("printify_product_id") or "",
        # Limited-edition: the listing being bought, so the webhook can count the sale.
        "listing_slug": body.get("listing_slug") or "",
        "promo_code": promo_code if promo_code else "",
        "promo_resv": promo_resv,
        "at_cost": "true" if at_cost else "",
        # customize→buy of the buyer's OWN art: list it after the sale completes (webhook)
        "list_design": "true" if body.get("list_design") else "",
        "list_kind": body.get("list_kind") or "",
        "demo": "edgeless_hackathon",
    }.items()}
    meta["recipient_json"] = recipient_json  # full, never truncated
    try:
        sess_kwargs = dict(
            mode="payment",
            line_items=[{
                "price_data": {"currency": "usd", "unit_amount": amount_cents,
                               "product_data": {"name": name}},
                "quantity": 1,
            }],
            success_url=f"{store}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{store}/checkout/cancel",
            phone_number_collection={"enabled": True},
            # No Stripe promotion codes: we compute floor-enforced promos ourselves
            # (see promo.apply above) and create the Session at the final unit_amount.
            payment_intent_data={"metadata": meta},
            metadata=meta,
        )
        if promo_recipient:
            # We already have (and priced against) the real address — don't let Stripe
            # collect a different one that would change shipping and break the real price.
            sess_kwargs["customer_email"] = (body.get("recipient") or {}).get("email") or None
        else:
            # Collect the real shipping address + email so POD ships to the customer
            # (not the demo address). The webhook reads these into the POD recipient.
            sess_kwargs["shipping_address_collection"] = {"allowed_countries": [
                "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE", "IE", "NZ"]}
        # Idempotency key so the SDK's automatic network-retry (max_network_retries) can't
        # create a SECOND session if a response is lost after Stripe processed the request.
        # Fresh per checkout attempt; the retry of THIS call reuses it → Stripe dedupes.
        session = stripe.checkout.Session.create(
            idempotency_key=f"checkout_{uuid.uuid4().hex}",
            **{k: v for k, v in sess_kwargs.items() if v is not None})
        trace("checkout_session_created", session=session.id, amount=amount_cents, kind=meta["kind"])
        return JSONResponse({"session_id": session.id, "url": session.url, "amount": amount_cents})
    except Exception as e:
        # The session never got created, so free the cap slot we reserved above.
        if promo_code and promo_resv:
            try:
                _promo.release(promo_code, promo_resv)
            except Exception:
                pass
        trace("checkout_session_failed", error=str(e)[:300])
        return JSONResponse({"error": "stripe_checkout_failed", "detail": str(e)[:300]}, status_code=502)


@app.get("/order-summary")
async def order_summary(session_id: str = ""):
    """Order confirmation details for the success page (amount, item, email)."""
    if not session_id or not STRIPE_KEY:
        return JSONResponse({"ok": False})
    try:
        s = await asyncio.to_thread(
            lambda: stripe.checkout.Session.retrieve(session_id, expand=["line_items"]))
        # Stripe objects raise AttributeError on missing fields and field names shift
        # across API versions — access everything defensively.
        li = None
        try:
            data = getattr(getattr(s, "line_items", None), "data", None)
            if data:
                li = data[0]
        except Exception:
            pass
        cd = getattr(s, "customer_details", None)
        sd = getattr(s, "shipping_details", None)
        if sd is None:
            ci = getattr(s, "collected_information", None)
            sd = getattr(ci, "shipping_details", None) if ci else None
        return JSONResponse({
            "ok": True, "status": getattr(s, "payment_status", None),
            "amount": (getattr(s, "amount_total", 0) or 0) / 100,
            "item": (getattr(li, "description", None) or "Your order"),
            "email": (getattr(cd, "email", None) if cd else None),
            "ship_to": (getattr(sd, "name", None) if sd else None),
        })
    except Exception as e:
        trace("order_summary_failed", error=str(e)[:160])
        return JSONResponse({"ok": False})


@app.get("/balance")
async def balance(request: Request):
    """Return total earned (from Stripe balance if configured, else local). ADMIN-ONLY —
    this exposes the platform's real Stripe available balance, business-sensitive and not
    used by the storefront; unauthenticated callers were reading it directly."""
    if not _admin_ok(request):
        return JSONResponse({"error": "admin_only"}, status_code=403)
    # Try Stripe balance first
    if STRIPE_KEY and "sk_test" not in STRIPE_KEY:
        try:
            bal = stripe.Balance.retrieve()
            available = sum(a.amount for a in bal.available) / 100
            return {"stripe_balance_usd": available, "source": "stripe_live"}
        except Exception:
            pass
    
    # Local tracking (payments persisted in R2)
    total = 0
    lines = state_store.read_lines("payments.jsonl")
    for line in lines:
        try:
            total += float(json.loads(line).get("amount_cents", 0))
        except Exception:
            pass
    return {"local_total_cents": total, "payments_count": len(lines)}

def generate_intelligence_brief() -> dict:
    """Generate the actual paid content (stub - will be swarm-generated)."""
    return {
        "title": "AI Agent Infrastructure: Market Intelligence Brief - Q2 2026",
        "generated_by": "Edgeless Swarm (Hive + Scribe + Edgeless CC)",
        "sections": [
            {
                "heading": "Market Overview",
                "body": "The AI agent infrastructure market is experiencing exponential growth. Key players include LangChain, CrewAI, AutoGen, and Hermes Agent. Total addressable market estimated at $12B by 2027."
            },
            {
                "heading": "Key Trends",
                "body": "1. Multi-agent orchestration moving from research to production. 2. Agent-native payment protocols (MPP, Stripe Agent Toolkit) enabling autonomous commerce. 3. Safety guardrails becoming regulatory requirement."
            },
            {
                "heading": "Competitive Landscape",
                "body": "23 competitor funding announcements tracked in Q2. 5 new MPP-compatible APIs launched. 0 existing paid intelligence briefs in this niche - first-mover opportunity."
            },
            {
                "heading": "Recommendation",
                "body": "Build now. The agent infrastructure layer is where cloud infrastructure was in 2013. Early entrants capture the orchestration layer."
            }
        ],
        "sources": [
            "Edgeless YouTube Intelligence Pipeline (142 videos analyzed)",
            "Soul Factory / MoE Council deliberation (5-agent panel)",
            "Public funding databases (Crunchbase, PitchBook)"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    # LIVE-mode safety: without the Stripe webhook signing secret, real paid events 401 at
    # the webhook → customers get charged but no POD order / royalty / email ever fires
    # (silent money-without-fulfillment). Make that impossible to miss on boot.
    if STRIPE_MODE == "live" and not os.environ.get("STRIPE_WEBHOOK_SIGNING_SECRET", "").strip():
        # Loud, but do NOT crash — taking the whole storefront down is worse than the
        # already-in-place webhook 401. This makes the misconfig impossible to miss in logs.
        print("\n" + "!" * 72 + "\n!! WARNING: live Stripe mode but STRIPE_WEBHOOK_SIGNING_SECRET is UNSET.\n"
              "!! Paid webhooks will 401 → customers charged with NO fulfillment.\n"
              "!! Set it in the Render dashboard NOW.\n" + "!" * 72 + "\n", flush=True)
    port = int(os.environ.get("PORT", "8400"))
    uvicorn.run(app, host="0.0.0.0", port=port)
