# Stripe Integration Setup Guide

Native Stripe checkout is now integrated into edgelesslab.com. This guide covers the remaining setup steps.

## What Was Built

1. **Product Catalog** (`data/products.json`)
   - 3 products: Multi-Agent Blueprint ($39), KB Loop Kit ($29), Hermes Guide ($19)
   - Configurable Stripe Price IDs for pre-made products

2. **Store Page** (`content/store/`)
   - `/store/` - Product listing with buy buttons
   - `/checkout/success/` - Post-purchase confirmation
   - `/checkout/cancel/` - Checkout cancelled page

3. **Stripe Checkout**
   - Client-side JavaScript (`static/js/stripe-checkout.js`)
   - Serverless functions (`netlify/functions/`)
   - Product card & buy button shortcodes

4. **Security**
   - CSP updated for Stripe domains
   - Webhook signature verification

## Remaining Setup Steps

### 1. Stripe Account Setup

```bash
# Create products in Stripe Dashboard
# Get your API keys from: https://dashboard.stripe.com/apikeys

# Test keys (for development)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Live keys (for production)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### 2. Create Products in Stripe

Option A: Use pre-made Price IDs (recommended)
1. Go to Stripe Dashboard → Products → Create Product
2. Create each product with pricing
3. Copy the Price ID (starts with `price_`)
4. Update `data/products.json` with the Price IDs

Option B: Dynamic pricing (already works)
- The serverless function creates prices dynamically
- No pre-configuration needed
- Slightly slower checkout experience

### 3. Configure Environment Variables

For **Netlify**:
```bash
# Set in Site Settings → Environment Variables
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Email delivery (Resend recommended)
RESEND_API_KEY=re_...
```

For **local development**:
```bash
# Create .env file in project root
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Configure Webhook Endpoint

In Stripe Dashboard:
1. Go to Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://edgelesslab.com/.netlify/functions/stripe-webhook`
3. Select events: `checkout.session.completed`
4. Copy the webhook signing secret
5. Set as `STRIPE_WEBHOOK_SECRET` environment variable

### 5. Test the Flow

```bash
# 1. Start Hugo dev server
hugo server -D

# 2. Start Netlify CLI for functions
netlify dev

# 3. Visit http://localhost:8888/store/

# 4. Click "Buy Now" - should redirect to Stripe test checkout

# 5. Use test card: 4242 4242 4242 4242, any future date, any CVC
```

### 6. Configure Hugo Params

Add to `hugo.toml`:
```toml
[params]
  stripePublishableKey = "pk_live_..."  # Or pk_test_ for dev
  stripeCheckoutEndpoint = "/.netlify/functions/create-checkout"
```

### 7. Delivery Setup

For digital product delivery, configure:

**Option A: Email delivery** (recommended)
1. Sign up for Resend (resend.com) - free tier: 3,000 emails/month
2. Add `RESEND_API_KEY` to environment variables
3. Uncomment email code in `stripe-webhook.mjs`

**Option B: Delivery page** (simple)
1. Create protected delivery pages
2. Use session-based access control

**Option C: Download link in success page**
- Update `/checkout/success/` to check session_id
- Verify payment via Stripe API
- Show download buttons

### 8. Gumroad Fallback

The integration falls back to Gumroad if Stripe fails. Update the fallback URLs in:
- `static/js/stripe-checkout.js` (function `getGumroadUrl`)
- Or remove fallback once Stripe is fully working

## Files Changed/Created

```
edgelesslab/
├── data/products.json              # Product catalog
├── content/store/_index.md        # Store page
├── content/checkout/
│   ├── success.md                    # Success page
│   └── cancel.md                     # Cancel page
├── static/js/stripe-checkout.js   # Client-side checkout
├── netlify/functions/
│   ├── create-checkout.mjs          # Checkout session creation
│   └── stripe-webhook.mjs           # Payment webhooks
├── layouts/shortcodes/
│   ├── buy-button.html              # Buy button shortcode
│   └── product-card.html            # Product card shortcode
├── themes/edgeless/assets/css/main.css  # Product styles added
├── themes/edgeless/layouts/_default/baseof.html  # CSP + script loading
└── hugo.toml                       # Store menu item added
```

## Verification Checklist

- [ ] Stripe products created with correct pricing
- [ ] Price IDs added to `data/products.json`
- [ ] Environment variables set in Netlify
- [ ] Webhook endpoint configured in Stripe dashboard
- [ ] Test checkout completes successfully
- [ ] Success/cancel pages render correctly
- [ ] Email delivery working (if configured)

## Next Steps for Full Automation

1. **Digital delivery automation**: Currently logs to console. Add email provider.
2. **License key generation**: For software products
3. **Customer portal**: Allow customers to view past purchases
4. **Subscription products**: Extend for recurring billing

## Support

- Stripe docs: https://stripe.com/docs/payments/checkout
- Test cards: https://stripe.com/docs/testing#cards
- Webhook testing: https://stripe.com/docs/webhooks/test
