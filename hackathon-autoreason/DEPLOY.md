# Edgeless — Go-Live Runbook (real-money storefront)

Goal: public storefront where real customers buy real merch, paying via **our** Stripe,
POD provider invisible, designer-agents earning arms-length royalties.

**Two halves:** a static frontend (Cloudflare Pages) + a FastAPI backend (cloud host).
Everything is built and verified in **test mode**. Going live needs the steps below —
the ones marked 🔴 require **you** (I'm barred from creating accounts or entering
financial credentials); ✅ are already done in code.

---

## 0. What's already done (✅)
- Backend is container-ready: `Dockerfile` + `.dockerignore` (repo root), `mpp-earn-svc/requirements.txt` pinned. Binds `0.0.0.0:$PORT`.
- `ART_DIR`, `CORS_ORIGINS`, `STORE_BASE_URL`, `STRIPE_WEBHOOK_SIGNING_SECRET` are all env-driven.
- Human checkout: `POST /checkout` → hosted Stripe Checkout (customer enters card; we never see it). Fulfillment + royalty fire on the `checkout.session.completed` webhook — same path as agent `/pay`.
- Webhook now verifies the Stripe **signature** when `STRIPE_WEBHOOK_SIGNING_SECRET` is set.
- Frontend Buy buttons flip to real Checkout when `window.__REALMONEY__ = true` (see `merch-demo/public/config.js`).
- Printify test-route safety: in test mode, sticker/poster/embroidery orders **simulate** (no billable POD order). Real orders only fire in live mode.

---

## 1. 🔴 Deploy the backend (Render — recommended)
Render builds the Docker image itself; you don't need local Docker.

1. Push this repo (or just `hackathon-autoreason/`) to a GitHub repo you own. The `Dockerfile` is at the root of `hackathon-autoreason/`.
2. render.com → **New → Web Service** → connect that repo.
3. Settings: **Runtime = Docker**, **Root Directory = `hackathon-autoreason`** (so it finds the Dockerfile), Instance type Starter is fine.
4. Add **Environment variables** (Render dashboard → Environment):
   - `STRIPE_SECRET_KEY` = your **live** key `sk_live_…` (step 2)
   - `STRIPE_WEBHOOK_SIGNING_SECRET` = `whsec_…` (step 3)
   - `STORE_BASE_URL` = your Pages URL, e.g. `https://edgeless.pages.dev`
   - `CORS_ORIGINS` = same Pages URL
   - `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`
   - `PRINTIFY_API_KEY`
   - `NVIDIA_NIM_API_KEY` (the `nvapi-…` key)
   - `CLOUDFLARE_API_TOKEN` (R2 art hosting)
   - `WEBHOOK_SECRET` = any random string (extra guard)
5. Deploy. Note the service URL, e.g. `https://edgeless-earn.onrender.com`.
6. Smoke test: `curl https://<your-backend>/health` → `{"status":"ok","stripe_mode":"live", …}`.

> Railway/Fly work the same way (Docker + env vars). Render is the least-friction for this.

---

## 2. 🔴 Stripe — switch to live
1. Stripe Dashboard → toggle **off** "Test mode".
2. Developers → API keys → copy the **live** secret key `sk_live_…` → set as `STRIPE_SECRET_KEY` (step 1.4).
3. Connect → confirm Connect is enabled in **live** mode (it was enabled in test on `acct_…1m217JNjiu`; live may need the same one-time enable + business details).

> The backend already refuses to over-charge: live agent `/pay` is clamped to `HARD_CEILING_CENTS`. Human Checkout charges the real shelf price.

## 3. 🔴 Stripe — webhook
1. Stripe Dashboard (live) → Developers → **Webhooks → Add endpoint**.
2. URL = `https://<your-backend>/webhooks/stripe`. Events (enable ALL — the last three are required for oxygen-revocation, else refunded/disputed/fraudulent sales stay permanently counted as legitimate demand): **`checkout.session.completed`**, **`charge.refunded`**, **`charge.dispute.created`**, **`radar.early_fraud_warning.created`**.
3. Copy the **Signing secret** `whsec_…` → set as `STRIPE_WEBHOOK_SIGNING_SECRET` (step 1.4), redeploy.

## 4. 🔴 POD payment methods (so orders actually fulfill)
Real orders cost us the POD base price; both providers must have a card on file or they hold the order (this is exactly the "payment failed" hold you saw).
- **Printful**: Dashboard → Billing → add a payment method / enable auto-charge.
- **Printify**: Dashboard → Settings → Payment → add a card. (Approval mode: keep **manual** at first so you approve each live order while testing.)

---

## 5. 🔴 Deploy the frontend (Cloudflare Pages)
The built site is in `merch-demo/dist/`. I can run this deploy for you once the backend URL exists (I have the CF token); or:
1. `cd merch-demo && npm run build`
2. `npx wrangler pages deploy dist --project-name edgeless`
3. Edit `dist/config.js` **on the deployed site** (or before deploy):
   - `window.__MPPEARN__ = "https://<your-backend>"`
   - `window.__REALMONEY__ = false`  ← keep false until step 6 passes

---

## 6. Go-live sequence (do NOT skip)
1. Deploy everything with `__REALMONEY__ = false`. Confirm browse/customize/editor all work against the live backend (test-mode-style, no charge).
2. Set `__REALMONEY__ = true`. Do **ONE** real purchase yourself (cheapest item). Verify:
   - Stripe live payment succeeds,
   - `checkout.session.completed` webhook fulfills (Printful draft / Printify order created),
   - the creator-agent royalty transfer appears in Stripe,
   - the POD order is accepted (not "payment failed").
3. Only after that one order is clean: open it up.

---

## Rollback
- Set `window.__REALMONEY__ = false` in `config.js` → instantly back to no-real-money (no rebuild).
- Or set backend `STRIPE_SECRET_KEY` back to `sk_test_…` → all POD orders simulate again.
