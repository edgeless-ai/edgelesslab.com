const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

// PostHog reserved / person-mutating keys a client must not be allowed to set.
// Letting these through lets a forged request backdate events (timestamp),
// mutate the person profile ($set / $set_once / $unset), or override routing
// fields (api_key / distinct_id / event / lib).
const RESERVED_KEYS = new Set([
  "timestamp",
  "$set",
  "$set_once",
  "$unset",
  "lib",
  "api_key",
  "distinct_id",
  "event",
]);

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  let allowOrigin;
  if (allowed.includes("*")) {
    // Explicit wildcard: echo the caller's origin. (This Worker does not use
    // credentialed requests, so echoing is safe and keeps caches keyed by
    // Origin via the `Vary` header below.)
    allowOrigin = origin || "*";
  } else if (allowed.includes(origin)) {
    allowOrigin = origin;
  } else {
    allowOrigin = "https://edgelesslab.com";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    // The allowed origin is computed per-request; without Vary a shared cache
    // could serve one origin's ACAO header to another (cache poisoning).
    "Vary": "Origin",
  };
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

// Parse the request body as JSON. Throws on malformed JSON so the caller can
// return a controlled 400 instead of an uncaught rejection (CF error 1101).
async function readPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

function normalizeEventName(value) {
  return String(value || "site_event")
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .slice(0, 80);
}

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    undefined
  );
}

async function handleIngest(request, env, ctx) {
  const cors = corsHeaders(request, env);

  if (!env.POSTHOG_PROJECT_API_KEY) {
    return json(
      { ok: false, error: "POSTHOG_PROJECT_API_KEY is not configured" },
      { status: 501, headers: cors },
    );
  }

  const url = new URL(request.url);

  let payload;
  try {
    payload = await readPayload(request);
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, { status: 400, headers: cors });
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ ok: false, error: "body must be a JSON object" }, { status: 400, headers: cors });
  }

  const event = normalizeEventName(url.searchParams.get("e") || payload.event);

  // distinct_id must be STABLE per client. Never mint a random UUID as a
  // fallback: a fresh id on every event creates a brand-new PostHog "person"
  // each time, which inflates billable MTUs and breaks funnel/retention
  // analysis. Require a client-supplied stable id, or fall back to the
  // (stable-per-client) source IP; reject if neither is available.
  const distinctId = payload.distinct_id || payload.anonymous_id || clientIp(request);
  if (!distinctId) {
    return json(
      { ok: false, error: "distinct_id or anonymous_id is required" },
      { status: 400, headers: cors },
    );
  }

  // Strip PostHog reserved / person-mutating keys before spreading client props.
  const safeProps = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!RESERVED_KEYS.has(key)) safeProps[key] = value;
  }

  const body = {
    api_key: env.POSTHOG_PROJECT_API_KEY,
    event,
    distinct_id: distinctId,
    properties: {
      ...safeProps,
      $current_url: payload.page_url,
      $ip: clientIp(request),
      user_agent: request.headers.get("User-Agent") || undefined,
      source: "edgeless-worker",
    },
  };

  const host = (env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/$/, "");

  // Fire-and-forget: don't make the visitor's beacon wait on the third-party
  // RTT to PostHog. `.catch` keeps an upstream/network failure from surfacing
  // as an unhandled rejection (bare 500 / CF 1101); `ctx.waitUntil` lets the
  // POST finish after the response is returned.
  const forward = fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(forward);
  }

  return json({ ok: true, status: 202 }, { status: 202, headers: cors });
}

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return json(
        { ok: true, service: "edgeless-ingest" },
        { headers: { ...cors, "Cache-Control": "no-store" } },
      );
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method not allowed" }, { status: 405, headers: cors });
    }

    return handleIngest(request, env, ctx);
  },
};

export default worker;
