/**
 * Flow Viz CORS Proxy — Cloudflare Worker
 *
 * Proxies Polymarket Gamma API with CORS headers so the browser
 * can fetch market data directly. Deployed to flow-api.edgelesslab.com.
 *
 * Routes:
 *   /health          → { status: "ok" }
 *   /markets?...     → gamma-api.polymarket.com/markets?...
 *   /events?...      → gamma-api.polymarket.com/events?...
 *   /prices?...      → gamma-api.polymarket.com/prices?...
 *
 * Created: 2026-04-16 (flow-viz Polymarket live data)
 */

const UPSTREAM = 'https://gamma-api.polymarket.com';
const ALLOWED_ORIGINS = [
  'https://edgelesslab.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', upstream: UPSTREAM }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // Proxy allowed paths
    const allowedPaths = ['/markets', '/events', '/prices', '/search'];
    const matchedPath = allowedPaths.find(p => url.pathname.startsWith(p));

    if (!matchedPath) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // Forward to upstream
    const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;

    try {
      const resp = await fetch(upstreamUrl, {
        headers: {
          'User-Agent': 'FlowViz/1.0 (edgelesslab.com)',
          'Accept': 'application/json',
        },
      });

      const body = await resp.text();

      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=30',
          ...corsHeaders(origin),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
