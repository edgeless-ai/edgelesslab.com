const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : "https://edgelesslab.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
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

async function readPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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

async function forwardToPostHog(request, env) {
  if (!env.POSTHOG_PROJECT_API_KEY) {
    return json(
      { ok: false, error: "POSTHOG_PROJECT_API_KEY is not configured" },
      { status: 501, headers: corsHeaders(request, env) },
    );
  }

  const url = new URL(request.url);
  const payload = await readPayload(request);
  const event = normalizeEventName(url.searchParams.get("e") || payload.event);
  const distinctId =
    payload.distinct_id ||
    payload.anonymous_id ||
    clientIp(request) ||
    crypto.randomUUID();

  const body = {
    api_key: env.POSTHOG_PROJECT_API_KEY,
    event,
    distinct_id: distinctId,
    properties: {
      ...payload,
      $current_url: payload.page_url,
      $ip: clientIp(request),
      user_agent: request.headers.get("User-Agent") || undefined,
      source: "edgeless-worker",
    },
  };

  const host = (env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/$/, "");
  const response = await fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return json(
    { ok: response.ok, status: response.status },
    { status: response.ok ? 202 : 502, headers: corsHeaders(request, env) },
  );
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "edgeless-ingest" });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method not allowed" }, { status: 405 });
    }

    return forwardToPostHog(request, env);
  },
};

export default worker;
