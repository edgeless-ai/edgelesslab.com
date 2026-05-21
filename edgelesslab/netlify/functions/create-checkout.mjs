/**
 * Netlify Function: Create Stripe Checkout Session
 * 
 * POST /.netlify/functions/create-checkout
 * Body: { product_id: string, success_url: string, cancel_url: string }
 * Response: { url: string } - Redirect URL to Stripe Checkout
 */

import Stripe from 'stripe';

// Product catalog - mirrors data/products.json
const PRODUCTS = {
  'multi-agent-blueprint': {
    name: 'Multi-Agent Orchestration Blueprint',
    description: 'Complete dispatch/worker architecture, 3 reference implementations, 9-chapter guide',
    price: 3900, // cents
    stripe_price_id: process.env.STRIPE_PRICE_MULTI_AGENT,
  },
  'kb-loop-kit': {
    name: 'KB Loop Kit',
    description: 'Knowledge base synthesizer with health checks and embeddings pipeline',
    price: 2900,
    stripe_price_id: process.env.STRIPE_PRICE_KB_LOOP,
  },
  'hermes-deployment-guide': {
    name: 'Hermes Deployment Guide',
    description: 'VPS setup, model routing, cron templates, and production gotchas',
    price: 1900,
    stripe_price_id: process.env.STRIPE_PRICE_HERMES_GUIDE,
  },
};

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Validate Stripe key
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Stripe not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { product_id, success_url, cancel_url } = body;

    // Validate product
    const product = PRODUCTS[product_id];
    if (!product) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unknown product: ${product_id}` }),
      };
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    });

    let session;

    // If we have a pre-configured Stripe Price ID, use it
    if (product.stripe_price_id && product.stripe_price_id.startsWith('price_')) {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price: product.stripe_price_id,
            quantity: 1,
          },
        ],
        success_url: success_url || `${event.headers.origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${event.headers.origin}/checkout/cancel/`,
        automatic_tax: { enabled: false },
        metadata: {
          product_id,
          product_name: product.name,
        },
      });
    } else {
      // Dynamic price creation (fallback)
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.price,
            },
            quantity: 1,
          },
        ],
        success_url: success_url || `${event.headers.origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${event.headers.origin}/checkout/cancel/`,
        automatic_tax: { enabled: false },
        metadata: {
          product_id,
          product_name: product.name,
        },
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Checkout failed',
        message: error.message,
      }),
    };
  }
};
