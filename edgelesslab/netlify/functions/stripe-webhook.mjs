/**
 * Netlify Function: Stripe Webhook Handler
 * 
 * Handles Stripe checkout completion and sends delivery emails
 * POST /.netlify/functions/stripe-webhook
 * 
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - RESEND_API_KEY (for email)
 */

import Stripe from 'stripe';

// Delivery configuration
const DELIVERY_URLS = {
  'multi-agent-blueprint': 'https://edgelesslab.com/delivery/multi-agent-blueprint/',
  'kb-loop-kit': 'https://edgelesslab.com/delivery/kb-loop-kit/',
  'hermes-deployment-guide': 'https://edgelesslab.com/delivery/hermes-deployment-guide/',
};

export const handler = async (event, context) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration missing' }),
    };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const signature = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Handle checkout completion
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const productId = session.metadata?.product_id;
    const customerEmail = session.customer_details?.email;

    if (productId && customerEmail) {
      await handleDelivery(productId, customerEmail, session);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};

async function handleDelivery(productId, email, session) {
  const deliveryUrl = DELIVERY_URLS[productId];
  
  if (!deliveryUrl) {
    console.warn(`No delivery URL configured for product: ${productId}`);
    return;
  }

  // TODO: Send email via Resend, SendGrid, or other provider
  // For now, log the delivery (email provider setup required)
  console.log(`[Delivery] Product: ${productId}, Email: ${email}, URL: ${deliveryUrl}`);
  
  // Example Resend integration (requires RESEND_API_KEY):
  /*
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Edgeless Lab <support@edgelesslab.com>',
      to: email,
      subject: 'Your purchase is ready',
      html: `
        <h1>Thank you for your purchase!</h1>
        <p>Your product is ready for download:</p>
        <a href="${deliveryUrl}" style="padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Download Now</a>
        <p>Questions? Reply to this email.</p>
      `,
    }),
  });
  */
}
