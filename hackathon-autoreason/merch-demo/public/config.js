// Edgeless storefront — deploy-time config.
// This file is NOT bundled, so you can edit it directly on the static host
// (Cloudflare Pages) after deploy without rebuilding.

// Backend (FastAPI MPP Earn Service) base URL — set to your cloud host URL.
window.__MPPEARN__ = "https://api.edgelesslab.com";

// Real-money mode:
//   false → human "Buy" uses the in-page agent test-card flow (demo).
//   true  → human "Buy" redirects to hosted Stripe Checkout (customer enters card).
// Flip to true ONLY after one real test order has fulfilled end-to-end.
window.__REALMONEY__ = true;

// Privy app id (public, safe to ship) — verified creator sign-in (email/Google/X/wallet).
// Editable on the host without a rebuild. main.jsx falls back to this same id if unset.
window.__PRIVY_APP_ID__ = "cmqx7iycu00670ckyssxzhkx0";

// --- Analytics (optional) -------------------------------------------------
// Set a key to turn a provider ON. Empty → nothing loads (no third-party requests).
// All public, safe to ship. index.html reads these and injects the snippet.
//
// Google Analytics 4 — Admin → Data Streams → your web stream → "Measurement ID".
window.__GA_ID__ = "";            // e.g. "G-XXXXXXXXXX"
// PostHog — Project Settings → "Project API Key" (starts with phc_). Host is the
// region shown there: US = https://us.i.posthog.com, EU = https://eu.i.posthog.com.
// Edgeless Lab project (356459, US cloud) — same project as edgelesslab.com, so the
// shop's traffic shows up alongside the marketing site. phc_ is the public capture key.
window.__POSTHOG_KEY__ = "phc_CLeyVhnlSuon9ppmHK7X2CsENY7xDIejLsnG7MJpHSI";
window.__POSTHOG_HOST__ = "https://us.i.posthog.com";
