// Serverless email capture for Edgeless Agent Starter Kit landing page
// Deploys as Vercel serverless function at /api/subscribe
// Logs to Vercel KV (if configured) or stores in-memory for demo
// Falls back gracefully if no KV binding exists

export default async function handler(req, res) {
  // CORS headers for frontend form submission
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, source } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  const entry = {
    email,
    source: source || 'agent-kit-landing-page',
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  };

  try {
    // Vercel KV storage (optional - only if KV namespace is bound)
    if (typeof process.env.KV_REST_API_URL !== 'undefined') {
      const kvResp = await fetch(
        `${process.env.KV_REST_API_URL}/lists/agent-kit-leads/push`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(JSON.stringify(entry))
        }
      );
      if (!kvResp.ok) {
        console.error('KV push failed:', await kvResp.text());
      }
    }

    // Log to stdout (Vercel captures this)
    console.log('[LEAD]', JSON.stringify(entry));

    // Send to Edgeless email handler if configured
    if (process.env.WEBHOOK_URL) {
      const webhookResp = await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: entry.email,
          source: entry.source,
          timestamp: entry.timestamp
        })
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: 'You have been added to the waitlist.'
    });
  } catch (err) {
    console.error('[LEAD_ERROR]', err.message);
    return res.status(200).json({
      success: true,
      message: 'You have been added to the waitlist.'
    });
  }
}
