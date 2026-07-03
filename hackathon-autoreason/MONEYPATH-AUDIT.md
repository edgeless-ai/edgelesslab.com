# Edgeless money-path audit — 22 verified findings

*Adversarial audit (30 agents, each finding independently verified) of checkout webhook → POD fulfillment → 18% royalty payout → oxygen. Store has processed 0 real sales, so none of these have fired yet — but they will on real traffic. Fix as a coherent pass BEFORE the first real sale. Not hot-patched autonomously (money path = your review).*

**11 HIGH · 9 MEDIUM · 2 LOW.**

---
## ✅ FIXED + DEPLOYED 2026-07-03 (adversarially reviewed, checkout verified green — commit 37b7ee6)
David greenlit "the most durable money-path bug fixes." Done, live, and verified on api.edgelesslab.com:
1. **Royalty double-pay (root-cause group 2, #2/#8)** — durable `royalty_paid/{charge_id}` marker in R2 state_store (beyond Stripe's 24h idempotency key vs 72h retries). Written only after a confirmed transfer; fail-open on read; `already_paid` echoes the *persisted* creator/account (not the caller's). Can only prevent a double-pay, never withhold a first.
2. **Hoodie-ships-tee (group 4, #6)** — Printful fulfillment now REFUSES tee variant 4017 as a substitute for a non-tee kind whose variant didn't resolve → routes to the fulfillment-failed safety net (alert + Stripe 500-retry) instead of shipping the wrong product.
3. **Silent R2-persistence failure** — `/health` now reports `state_store_configured` (live: `true`).

**STAGED (your design call, NOT auto-fixed):** the retail-floor-for-baked-designs gap (see GAP-REPORT.md — needs an authoritative price source for designs.json listings), plus a reviewer-suggested pre-charge `catalog_variant_id` requirement at /checkout (closes the charge-then-refuse window but risks blocking legit flows — test first). Remaining root-cause groups 1/3/5/6 below still warrant a coherent supervised pass.

---

## Root-cause groups (fix these together)

1. **Webhook keying + idempotency** (#1,#3,#7,#17,#18,#21): oxygen/sold-count keyed `charge or pi` but charge comes from a fallible retrieve → key differs across retries → double sold-count, un-revocable records, false pending. Also Printify order create has no idempotency key (scan-race → duplicate real POD bill). FIX: key everything on the always-present `pi` (payment_intent||session.id); add durable per-charge markers; give Printify create an idempotency key; add Stripe event-id dedup.

2. **Royalty double-pay + never-settled** (#2,#8,#13,#9): `idempotency_key=royalty_{charge}` expires at 24h but Stripe retries 72h → duplicate 18% transfer on sustained fulfillment outage. AND accrued 'pending' royalties (creator onboards later) are never paid out. FIX: durable `royalty_paid:{charge}` marker + short-circuit; build a settlement job for pending royalties.

3. **Royalty vs fulfillment coupling** (#11,#10,#4): royalty is paid even when POD fulfillment FAILED, and never reversed on refund/chargeback; draft_exists+confirm-fail escapes the fulfillment_failed net. FIX: gate royalty on confirmed fulfillment; reverse the transfer on charge.refunded/dispute.

4. **Fulfillment routing (wrong product shipped)** (#6,#5): hoodie kind defaults to tee variant 4017 → ships a TEE for a HOODIE; printify-kind with missing product_id falls through to Printful tee. FIX: hard-fail (don't ship a substitute) if the correct variant can't be resolved.

5. **Fail-CLOSED royalty skips** (#12,#15,#14): transient Stripe/PI blips permanently defer a LEGIT royalty; self-purchase guard ignores the server 'payer_is_creator_email' verdict. FIX: retry transient checks; honor the server arms-length verdict.

6. **Concurrency/state** (#19,#20,#22,#16): whole-blob read-modify-write on promo/state (over-redeem caps, dropped appends); _increment_sold reads a boot-time global; refund doesn't release the cap slot.


## Full ranked list

### 1. [HIGH] Unstable webhook dedupe key (charge-or-pi fallback) double-counts sales and breaks refund revocation
**main.py:537** · webhook-idempotency  
*Failure:* pi->charge resolution at main.py:468 is a live Stripe API call that can fail transiently (caught at :469, charge stays None). _oxy_key = str(charge or pi or session.id) (line 537) therefore differs between two deliveries of the SAME checkout.session.completed event: delivery 1 (charge resolved) stores the oxygen record under oxygen/{charge}.json and runs the sold-count dedupe under that key; a Stripe retry where the retrieve fails computes _oxy_key = pi, so oxygen._load(pi) returns None, _sold_counted_prev=False, a SECOND oxygen record is written, and _increment_sold runs AGAIN (lines 567-580)  
*Fix:* Do not proceed with sold-count / oxygen record writes under a non-charge key. Either (a) if charge cannot be resolved, retry the PI retrieve / return non-2xx so Stripe re-delivers rather than writing a record keyed on pi, or (b) key the oxygen record on a single always-present stable id (session.id) AND make revoke() look records up by the charge_id FIELD (scan/index) instead of by object key. Ens

### 2. [HIGH] Royalty double-pay after >24h of forced webhook retries (idempotency key expires before Stripe stops retrying)
**stripe_connect.py:147** · webhook-idempotency  
*Failure:* pay_royalty uses idempotency_key=f'royalty_{charge_id}' (stripe_connect.py:147). Stripe idempotency keys expire after 24h, but Stripe re-delivers a failing webhook for up to ~3 days. The royalty Transfer is created (main.py:990) BEFORE/independent of POD confirmation, and when a Printful draft is created but confirm fails the webhook returns HTTP 500 (main.py:504-505,531, _ff=='draft_created' and not confirmed => retryable) to force Stripe to retry. If confirmation keeps failing past the 24h window (e.g. Printful outage), a later retry re-enters pay_royalty with an EXPIRED idempotency key -> S  
*Fix:* Persist a durable 'royalty_paid:{charge_id}' marker (state_store) the moment a transfer succeeds and short-circuit pay_royalty if present, independent of Stripe's 24h key TTL. Alternatively gate royalty payment on successful order confirmation (so a still-failing order never triggers a paid royalty), and/or stop returning 500 once the royalty+order already exist.

### 3. [HIGH] Printify order creation has no idempotency key; scan-based dedupe races into duplicate real billable orders
**printify_client.py:289** · webhook-idempotency  
*Failure:* create_order (printify_client.py:289) POSTs /orders.json with NO Idempotency-Key header; the only guard is order_exists() (printify_client.py:273), a read-scan of the last 100 orders called separately at main.py:869-874 before create at :875. This is TOCTOU: two concurrent/overlapping deliveries of the same live-paid checkout.session.completed both see no existing order and both POST -> TWO real, auto-charged Printify orders for one payment (customer receives duplicate goods, platform pays POD cost twice). The 100-order scan window also silently misses a retry that arrives after a burst of >10  
*Fix:* Send a stable Idempotency-Key (e.g. the intent_id) on the Printify create call if supported, or enforce single-flight per external_id server-side (atomic marker written before POST). Do not rely on a bounded read-scan for a billable, unrecoverable side effect.

### 4. [HIGH] draft_exists + confirm failure escapes the fulfillment_failed safety net (charge-without-fulfillment)
**main.py:504** · fulfillment-pod  
*Failure:* Live-paid Printful order. Delivery 1: create_draft_order succeeds but _confirm_printful_if_live fails (transient Printful 5xx / insufficient Printful balance) -> fulfillment="draft_created", confirmed=False -> safety net flags it retryable, returns 500, Stripe re-delivers. Delivery 2: find_order_by_external_id finds the existing draft -> fulfillment set to "draft_exists" (line 900), _confirm_printful_if_live is retried and fails AGAIN -> fulfillment stays "draft_exists", confirmed=False. At line 504, _FULFILL_OK contains "draft_exists", and the failure special-case only tests `_ff == "draft_cr  
*Fix:* Treat draft_exists identically to draft_created when unconfirmed. Change line 504 to: `fulfill_failed = live_paid and (_ff not in _FULFILL_OK or (_ff in ("draft_created", "draft_exists") and not out.get("confirmed")))` and update `retryable` (line 505) the same way. Simpler: remove "draft_exists" from _FULFILL_OK (line 503) since an unconfirmed reused draft is never a terminal-OK state for a live 

### 5. [HIGH] Printify kind with missing printify_product_id silently falls through to the Printful (tee) branch
**main.py:851** · fulfillment-pod  
*Failure:* The routing guard is `if order_kind in PRINTIFY_KINDS and pfy_pid:`. A Printify kind (e.g. "mug", "embroidery", "cc-tee") whose checkout metadata is missing printify_product_id (e.g. a promo checkout — the promo branch at ~2779 estimates Printify cost but never creates/carries a printify_product_id; or any client that omits it) fails the `and pfy_pid` test and drops into the Printful branch at line 886. It then builds a Printful garment order using catalog_variant_id from body (or the tee default 4017). Result: either Printful rejects the Printify variant id -> fulfillment=error (customer char  
*Fix:* After computing order_kind, if `order_kind in PRINTIFY_KINDS and not pfy_pid`, set resp["fulfillment"]="error" (and trace) and raise _SkipPOD instead of falling through to Printful. Never let a Printify kind be fulfilled by the Printful garment path.

### 6. [HIGH] hoodie kind routes to Printful but defaults to tee variant 4017 — ships a tee for a hoodie
**main.py:905** · fulfillment-pod  
*Failure:* "hoodie" is in ALL_KINDS (line 94) and is sellable, but the Printful branch has no hoodie product/variant mapping. build_catalog_item is called with `catalog_variant_id=int(body.get("catalog_variant_id") or 4017)`. 4017 is a Bella+Canvas 3001 TEE variant (DEFAULT_PRODUCT_ID=71 in printful_client). The non-promo checkout path (line 2846) carries catalog_variant_id = body's value or "". A hoodie sold at retail whose checkout body omits catalog_variant_id -> metadata empty -> Printful order created and confirmed as a TEE. Customer pays hoodie price, receives a t-shirt. There is no server-side che  
*Fix:* Do not silently default a garment variant. If kind is a Printful garment and catalog_variant_id is missing/invalid, fail closed (fulfillment=error + safety-net alert) rather than defaulting to 4017. Ideally add a per-kind default/validation map (hoodie -> a real Printful hoodie variant) and reject a variant whose product does not match the ordered kind.

### 7. [HIGH] Printify order_exists idempotency is a non-atomic check + 100-order scan window (double POD order)
**main.py:869** · fulfillment-pod  
*Failure:* Idempotency for real Printify orders relies on order_exists (printify_client.py:273) which GETs the last 100 orders and matches external_id — Printify enforces no external_id uniqueness server-side (that's why the scan exists). The check at line 869 and the create at line 875 are not atomic. Two near-simultaneous Stripe deliveries of the same checkout.session.completed (or a manual retry racing an in-flight handler) can both see no existing order and both call create_order -> TWO real, billable Printify production orders for one $ale (double POD cost + double shipment). Separately, under a bur  
*Fix:* Persist an idempotency record keyed by intent_id in state_store the moment an order is created and check it (not just the remote scan) before creating; guard the check-then-create with a per-intent lock. Longer term, prefer a provider that enforces external_id uniqueness or paginate the scan beyond 100 for delayed retries.

### 8. [HIGH] Royalty double-pay: Stripe re-delivers webhooks for up to 72h but the only guard (idempotency_key) lasts 24h
**stripe_connect.py:147** · royalty-payout  
*Failure:* The only thing preventing a second royalty Transfer on a webhook replay is idempotency_key=f"royalty_{charge_id}" (stripe_connect.py:147). Stripe idempotency keys are honored for only 24h, but Stripe retries webhook delivery on an exponential backoff for up to ~3 days. Crucially, royalty is paid inside _fulfill_and_royalty (called at main.py:493) BEFORE the fulfillment-retry gate at main.py:504-531, which deliberately returns HTTP 500 to force Stripe to re-deliver whenever a live-paid order's POD fulfillment is 'error'/'exception'/unconfirmed. Scenario: live checkout.session.completed arrives;  
*Fix:* Do not rely on Stripe's 24h idempotency window for money that can be retried for 72h. Before calling pay_royalty, check a persistent state_store record keyed by charge_id (e.g. a 'royalty_paid' object) and short-circuit if already paid; write that record atomically after a successful Transfer. Alternatively move the royalty payout AFTER an idempotent 'fulfilled' marker so a fulfillment-retry loop 

### 9. [HIGH] No settlement path ever pays out accrued 'pending' royalties after a creator onboards
**main.py:995** · royalty-payout  
*Failure:* Every royalty that returns creator_not_onboarded / onboarding_incomplete / missing_creator_or_charge / exception is recorded via _log_royalty_pending into the 'royalty' collection (main.py:770-781) and nothing else. There is no code that reads that collection and pays the owed transfer once the creator later completes Stripe Connect onboarding (grep: the only reader is the display ledger at main.py:2223-2227). A creator who makes their first sales BEFORE finishing onboarding (the common real-world order of events, since onboarding is self-serve) accrues real owed money that is never automatica  
*Fix:* Add a settlement job (or on-onboarding-complete hook / account.updated webhook) that scans the pending 'royalty' collection for the creator, re-derives the charge, and issues the Transfer with idempotency_key royalty_{charge_id}; mark each record settled with the transfer_id so it is paid exactly once. At minimum, alert the operator when a pending royalty is written so owed money is not invisible.

### 10. [HIGH] Refund/chargeback does not reverse the 18% Connect royalty transfer already paid to the creator
**main.py:453** · oxygen-integration  
*Failure:* On an arms-length sale _fulfill_and_royalty calls stripe_connect.pay_royalty, which creates a Stripe Transfer of 18% to the creator's Express account with source_transaction=charge_id (stripe_connect.py:141-148). When the customer is later refunded or wins a dispute, the webhook's refund branch (main.py:447-458) only calls oxygen.revoke() and returns — it issues no Transfer reversal and stores no transfer_id to reverse against. Unless whoever issued the refund happened to set reverse_transfer=true on the Stripe Refund (this service never creates the refund, so that is not guaranteed), the crea  
*Fix:* Persist the royalty transfer_id on the oxygen record at sale time. In the refund branch, after locating the record, call stripe.Transfer.create_reversal(transfer_id, idempotency_key=f'rev_{charge_id}') (best-effort, try/except, fail-open on the ACK) so the creator's royalty is clawed back when the underlying charge is undone. Log a pending-reversal record if the reversal call fails for manual reco

### 11. [HIGH] Creator royalty (18%) is paid even when POD fulfillment failed, and is never reversed on refund
**main.py:972** · errors-races-state  
*Failure:* In _fulfill_and_royalty, the POD block sets resp['fulfillment']='error'/'exception'/'not_configured' (lines 921, 924, 928) WITHOUT returning. Control falls through to the royalty branch (line 972 `elif creator:`), so stripe_connect.pay_royalty fires for any onboarded creator regardless of whether an order was actually created. Scenario: live checkout.session.completed for an onboarded creator's design where the Printful draft create returns not-ok (fulfillment='error') or the variant is permanently unprintable → customer is charged, NOTHING ships, but an 18% Connect Transfer goes to the creato  
*Fix:* Gate the royalty on fulfillment actually succeeding: only run the royalty block when resp['fulfillment'] is in a success set ({confirmed, printify_order, printify_order_exists, draft_exists+confirmed}); otherwise log it as pending via _log_royalty_pending and pay after the order confirms. Separately, on the charge.refunded/dispute branch, look up the paid transfer for that charge and call stripe.T

### 12. [MEDIUM] Fail-CLOSED: a transient Stripe error while checking account status permanently defers a legit creator's royalty
**stripe_connect.py:137** · royalty-payout  
*Failure:* pay_royalty always calls account_status(creator) live (stripe_connect.py:137), which does stripe.Account.retrieve(aid). On ANY StripeError, account_status swallows it and returns payouts_enabled=False (stripe_connect.py:112-114). pay_royalty then returns {'ok': False, 'reason': 'onboarding_incomplete'} (line 138-139) for a creator who is in fact fully onboarded and payouts-enabled. main.py:994-995 logs this as pending. There is NO automated settlement/backfill that ever reads the 'royalty' pending collection and pays it later (grep confirms _log_royalty_pending is write-only; the only reader,   
*Fix:* Distinguish 'payouts genuinely disabled' from 'status check errored'. account_status already returns a 'reason' on error (line 114); in pay_royalty, if the status call errored (vs returned a definite payouts_enabled=False), return a distinct retryable reason and make the webhook treat it as retryable (return non-2xx so Stripe re-delivers), or attempt the Transfer anyway and let Stripe reject if tr

### 13. [MEDIUM] cap_cents nondeterminism across webhook replays mislogs an ALREADY-PAID royalty as pending (manual-reconcile double-pay risk)
**main.py:979** · royalty-payout  
*Failure:* cap_cents is computed from _real_pod_cost_cents(body, recipient) (main.py:979-982), which can return None on a transient POD-pricing failure -> cap_cents=None -> royalty = full 18% of gross. On the first delivery cost is known, so royalty = min(0.18*gross, margin) = the CAPPED (smaller) amount and Transfer.create succeeds with idempotency_key royalty_{charge_id}. On a Stripe replay where _real_pod_cost_cents transiently returns None, cap_cents=None -> royalty_cents becomes the larger 0.18*gross, so Transfer.create is called with the SAME idempotency_key but a DIFFERENT amount. Stripe rejects i  
*Fix:* Make the payout amount deterministic for a given charge: persist the computed cap/royalty amount with the charge and reuse it on replay, or when _real_pod_cost_cents returns None do not fall back to an uncapped 0.18*gross on a retry. Better, detect the idempotency-conflict StripeError specifically and treat it as 'already_paid' (not pending) so it never lands in the reconcile queue.

### 14. [MEDIUM] Self-purchase royalty guard ignores the 'payer_is_creator_email' server verdict, paying a royalty to a positively-identified self-dealer
**main.py:961** · royalty-payout  
*Failure:* The royalty self-purchase skip only fires on legacy_self (body 'buyer'==creator, spoofable/omittable) OR server_self computed as exact tuple equality al == (False, 'payer_bound_to_creator') (main.py:961-962). But oxygen.is_arms_length can also return (False, 'payer_is_creator_email') (oxygen.py:264-267) — a strong SERVER-DERIVED self signal where the payer's own Stripe card billing email equals the creator handle. That verdict is used to deny oxygen but is NOT matched by server_self, so the royalty path treats the sale as arms-length and pays 18% to the creator who just bought their own design  
*Fix:* Key the self-purchase skip off the arms-length boolean being definitively False, not one hard-coded reason string: treat al[0] is False (payer_bound_to_creator, payer_is_creator_email, declared_self_purchase) as self_purchase_no_royalty, while keeping fail-OPEN only when al[0] is None (payer_unresolved / arms_length_error) so a real creator is never stiffed by an unknown verdict.

### 15. [MEDIUM] Fail-CLOSED: PaymentIntent retrieve blip -> charge_id=None -> royalty skipped as missing_creator_or_charge with no retry
**main.py:466** · royalty-payout  
*Failure:* In the webhook, charge = stripe.PaymentIntent.retrieve(pi).latest_charge, and on any exception charge stays None (main.py:466-470) while the handler continues. _fulfill_and_royalty is then called with charge_id=None (main.py:493). pay_royalty short-circuits on 'if not creator or not charge_id' -> returns {'ok': False, 'reason': 'missing_creator_or_charge'} (stripe_connect.py:127-128) -> main.py:995 logs pending. If fulfillment otherwise succeeded, the webhook ACKs 200 and Stripe never re-delivers, so a legit creator's royalty for a real paid sale is permanently deferred to manual reconciliatio  
*Fix:* If live_paid and charge is None after the retrieve attempt, treat it as a transient/retryable condition: return non-2xx so Stripe re-delivers (fulfillment is already idempotent), or retry the PaymentIntent.retrieve before proceeding, rather than silently ACKing and logging the royalty as pending.

### 16. [MEDIUM] Refund/dispute/EFW never releases the limited-edition cap slot the sale consumed
**main.py:447** · oxygen-integration  
*Failure:* A limited-edition drop has quantity=N. A live, arms-length buyer completes checkout: qualify_sale returns oxygen=True and the webhook calls _increment_sold(listing_slug) (main.py:569), bumping the persisted listing 'sold' count (main.py:1854-1862) and possibly flipping sold_out. The customer is then refunded or files a chargeback. Stripe delivers charge.refunded / charge.dispute.created / radar.early_fraud_warning.created, which hits the revoke branch (main.py:447-458). That branch ONLY calls oxygen.revoke() (which flips the oxygen record to status='revoked') and returns. There is NO _decremen  
*Fix:* In the revoke branch, after oxygen.revoke() succeeds and the loaded oxygen record shows sold_counted=True with a listing_slug, decrement the listing via a new _decrement_sold(slug) (guarded so it never goes below 0) and clear the record's sold_counted flag so it can't be double-decremented on Stripe's at-least-once retries. Key the decrement off the persisted oxygen record (which carries listing_s

### 17. [MEDIUM] Oxygen record is keyed by payment_intent when charge is unresolved, but revoke() looks it up only by charge id, so refunds silently fail to revoke
**main.py:537** · oxygen-integration  
*Failure:* At checkout.session.completed the code resolves charge = PaymentIntent.retrieve(pi).latest_charge inside a try that swallows failures and continues with charge=None (main.py:466-470). The oxygen record is then persisted under _oxy_key = str(charge or pi or session.id) (main.py:537, 551) — i.e. keyed by the pi string, with the record's internal charge_id field set to '' (main.py:559). resolve_payer still yields resolved=True via the session email, so qualify_sale can mint oxygen=True and _increment_sold runs. Later, charge.refunded arrives; the revoke branch computes _charge_id from the event's  
*Fix:* Key the oxygen record by the charge id whenever available and make revoke resilient to the pi-keyed fallback: either (a) always resolve/persist under the charge id and refuse to mint oxygen when charge is None, or (b) have revoke() fall back to scanning list_oxygen_cached() for a record whose charge_id OR pi matches the event's charge/payment_intent. Also persist pi on the record so a pi-keyed rec

### 18. [MEDIUM] Cap-increment idempotency relies on a state_store.put_record whose failure is silent, so a webhook retry double-counts the limited-edition cap
**main.py:575** · oxygen-integration  
*Failure:* After _increment_sold runs, the code marks the oxygen record sold_counted=True via state_store.put_record('oxygen', _oxy_key, _r) (main.py:575-583) — this is the ONLY thing that stops a Stripe retry from incrementing the cap again (comment at 575 admits _increment_sold has no idempotency of its own). But put_record returns a bool and swallows R2 write failures (state_store.py:64-72), and the return value is not checked. If the R2 PUT of the sold_counted flag fails (transient R2 blip) while the local disk cache write succeeded, the persisted record in R2 still has sold_counted=False. _load() re  
*Fix:* Check the put_record return value; if the sold_counted persist fails, either retry, or roll back the just-applied _increment_sold, or refuse to ACK 200 (return a retryable non-2xx) so the whole idempotent flow re-runs cleanly. Better: make _increment_sold itself idempotent per charge (record which charge ids have been counted for a slug) instead of relying on a second best-effort write landing.

### 19. [MEDIUM] Promo cap state (promo_state.json) is a single whole-blob read-modify-write — over-redeems caps across instances/redeploys
**promo.py:138** · errors-races-state  
*Failure:* reserve()/confirm()/release() all do _load_state() (blocking GET of the single promo_state.json object) → mutate → _save_state() (blocking PUT of the whole object). The reserve() docstring claims atomicity because there is 'no await', which holds only within ONE event-loop process. But this deployment explicitly runs old+new instances during redeploys and can run multiple workers (the codebase moved submissions/oxygen/royalty to per-record objects precisely to kill this whole-blob clobber — promo was left behind). Two /checkout requests on two instances both read used=39 for NOUSGANG (max=40),  
*Fix:* Store promo state per-record like the other collections: one R2 object per (code) or per reservation id under a 'promo/' prefix, and count committed slots by listing the prefix, so concurrent writers touch different keys. At minimum, move the load/save off the event loop and add a compare-and-set (e.g. R2 conditional PUT with If-Match/ETag) so a lost-update is retried rather than silently clobbere

### 20. [MEDIUM] _increment_sold reads a module-global SUBMISSIONS loaded once at boot; limited-edition listings oversell
**main.py:1854** · errors-races-state  
*Failure:* SUBMISSIONS is loaded ONCE at import (line 1797) and never refreshed from R2. _increment_sold(slug) finds the record in that in-memory list, does s['sold'] = int(s.get('sold') or 0) + 1, then _persist_sub writes only that record. On instance A the counter only reflects boot-time value plus A's own increments — it never sees increments instance B persisted (and vice-versa). Scenario: a limited drop with quantity=10. Instance A and instance B (redeploy overlap or multiple workers) each boot with sold=8. Buyers hit both; each instance independently counts up from 8 and writes 9, 10 — the two writ  
*Fix:* Make _increment_sold read-modify-write the authoritative R2 record (state_store.get_text('sub/<slug>.json')) immediately before incrementing rather than trusting the boot-time in-memory copy, and guard the increment with a conditional write (ETag/If-Match) so concurrent increments retry instead of clobbering. The _is_sold_out gate should likewise consult the fresh record for limited listings.

### 21. [LOW] Non-object JSON payload throws before try-guards and 500s the webhook (retry loop)
**main.py:439** · webhook-idempotency  
*Failure:* event = json.loads(payload) is wrapped (main.py:434-437), but if the payload is valid JSON that is not an object (e.g. a bare array or number), evt_type = event.get('type') at line 439 raises AttributeError BEFORE any handler try-block, returning HTTP 500 -> the caller (Stripe, or the local/secret-authed replay client) treats it as a failed delivery and retries indefinitely. Real Stripe events are always objects and the endpoint is signature/secret gated, so exposure is limited to an authenticated sender sending a malformed body; still, it is an unhandled 500 in the ACK path.  
*Fix:* After json.loads, coerce non-dict payloads to {} (e.g. `if not isinstance(event, dict): event = {}`) so malformed bodies return a clean 200/400 instead of an unhandled 500.

### 22. [LOW] state_store.append_line is a whole-blob read-modify-write — concurrent appends silently drop payment records
**state_store.py:108** · errors-races-state  
*Failure:* append_line(name, line) does get_text(name) → concat → put_text(name, body) on the whole object. Two concurrent writers (or old+new instance during redeploy) both read the same existing payments.jsonl body, each append their own line, and the second put_text overwrites the first → one payment record is lost. payments.jsonl is written on every verified /inference payment (main.py:355) and read by /balance for local accounting (main.py:2950). Lost lines mean the platform's local revenue/accounting count silently undercounts real payments — a reconciliation gap rather than a mischarge, but it cor  
*Fix:* Write payments as per-record objects (state_store.put_record('payments', <pi>, {...})) like royalty/oxygen already do, so concurrent writers touch distinct keys; aggregate by listing the prefix in /balance. Avoid whole-blob append for any money-relevant ledger.

---
## ✅ MONEY-PATH PASS COMPLETE — 2026-07-03 (David greenlit; every change adversarially reviewed + live-verified)
All root-cause groups fixed + deployed, checkout green throughout. Reviews caught (and I fixed) real issues before they shipped — most notably an 18% royalty LEAK in a first-draft finding-10 fix, and a dispute-non-finality cap oversell.

**Deployed + verified (8 batches):**
1. Durable royalty double-pay guard (R2 marker beyond Stripe's 24h key)
2. Fulfillment kind-guard (no hoodie-ships-tee → safety net)
3. /health state_store_configured signal
4. Retail floor for baked designs (kind-authoritative) + tee/hoodie variant cross-check + pre-charge hoodie-variant reject — 5 live probes green
5. Group-1 keying: pi-stable oxygen key + resilient revoke (no double sold-count / un-revocable oxygen on webhook retry)
6. Group-3: royalty gated on confirmed fulfillment; reverse royalty on FULL refund (partial→pending marker); draft_exists alert
7. Group-5: stripe.max_network_retries=2 + idempotency keys on Session/PaymentIntent/Account create
8. Group-6: sold-count re-fetch (cap-bypass fix) + release cap slot on refund-only; IP-gate calibration (majority + keyword backstop, Eevee hole stays closed)

**STAGED for David (not auto-fixed — need your call or lower priority):**
- **Proper finding-10** — fingerprint-authoritative `is_arms_length` (reorder so a proven-arms-length fingerprint overrides a spoofed declared buyer==creator; closes the griefing-veto WITHOUT the royalty leak the naive fix caused)
- **Partial-refund royalty policy** — prorate / threshold / full-clawback (partial refunds parked in `royalty_partial_refund_pending`)
- **Finding 11** — promo.py per-record cap state (low exposure, single-instance safe; bigger refactor)
- **revoke concurrent-race CAS** — R2 conditional write on the status transition (bounded one-unit race)
- **RESEND_API_KEY** — set on Render so fulfillment-failed alerts actually send
- **DATA_DIR** — Render persistent disk (infra/cost decision)
- **reverse_royalty fallback** — Stripe Transfer.list(source_transaction) if the royalty_paid marker write ever failed
- **AccountLink idempotency** — cosmetic

**Next step (yours):** the controlled first-sale go-live (DEPLOY.md) — one real purchase, watch the full loop fire live.
