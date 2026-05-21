/**
 * Stripe Checkout Integration for Edgeless Lab
 * 
 * Flow:
 * 1. User clicks buy button
 * 2. Create checkout session via backend/cloud function
 * 3. Redirect to Stripe Checkout
 * 4. Return to success/cancel pages
 * 
 * Required: STRIPE_PUBLISHABLE_KEY set in site config
 */

(function() {
  'use strict';

  const STRIPE_PUBLISHABLE_KEY = document.querySelector('meta[name="stripe-publishable-key"]')?.content || '';
  const CHECKOUT_ENDPOINT = document.querySelector('meta[name="stripe-checkout-endpoint"]')?.content || '/.netlify/functions/create-checkout';
  
  // Initialize buy buttons
  function initBuyButtons() {
    const buttons = document.querySelectorAll('.buy-button[data-product-id]');
    
    buttons.forEach(button => {
      button.addEventListener('click', handleBuyClick);
    });
    
    console.log(`[Stripe] Initialized ${buttons.length} buy buttons`);
  }

  // Handle buy button click
  async function handleBuyClick(event) {
    const button = event.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const stripePriceId = button.dataset.stripePriceId;

    if (!productId) {
      console.error('[Stripe] No product ID found');
      return;
    }

    // Disable button during processing
    button.disabled = true;
    button.textContent = 'Loading...';

    try {
      // If we have a direct Stripe Price ID, use it
      if (stripePriceId && stripePriceId.startsWith('price_')) {
        await redirectToStripeCheckout(stripePriceId);
      } else {
        // Otherwise, create dynamic checkout session
        await createCheckoutSession(productId);
      }
    } catch (error) {
      console.error('[Stripe] Checkout error:', error);
      button.textContent = 'Error — Try Again';
      button.disabled = false;
      
      // Fallback: redirect to Gumroad if configured
      const gumroadUrl = getGumroadUrl(productId);
      if (gumroadUrl && confirm('Stripe checkout unavailable. Redirect to Gumroad instead?')) {
        window.location.href = gumroadUrl;
      }
    }
  }

  // Create checkout session via backend
  async function createCheckoutSession(productId) {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: window.location.origin + '/checkout/success/',
        cancel_url: window.location.origin + '/checkout/cancel/',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const { url } = await response.json();
    
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  }

  // Direct redirect using Stripe Price ID (client-only, no backend needed for session creation)
  async function redirectToStripeCheckout(priceId) {
    if (!STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe publishable key not configured');
    }

    // Load Stripe.js if not already loaded
    if (!window.Stripe) {
      await loadStripeJs();
    }

    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    
    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      successUrl: window.location.origin + '/checkout/success/?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: window.location.origin + '/checkout/cancel/',
    });

    if (error) {
      throw error;
    }
  }

  // Load Stripe.js dynamically
  function loadStripeJs() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  // Get Gumroad fallback URL
  function getGumroadUrl(productId) {
    const gumroadUrls = {
      'multi-agent-blueprint': 'https://edgelessai.gumroad.com/l/multi-agent-blueprint',
    };
    return gumroadUrls[productId] || null;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuyButtons);
  } else {
    initBuyButtons();
  }
})();
