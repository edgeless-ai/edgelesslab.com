// Bounded analytics-only collector. Newsletter remains disabled until a
// subscription provider and its delivery path have been independently verified.
const MAX_BODY_BYTES = 16 * 1024;
const EVENTS = new Set(["service_cta_clicked", "purchase_initiated"]);
const FIELDS = new Set([
  "cta_name",
  "destination",
  "page_url",
  "path",
  "product_name",
  "price",
]);
function allowedOrigins(env) {
  return new Set(
    (env.ALLOWED_ORIGINS || "https://edgelesslab.com")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "*"),
  );
}
function cors(request, env) {
  const origin = request.headers.get("Origin");
  return {
    Vary: "Origin",
    ...(allowedOrigins(env).has(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        }
      : {}),
  };
}
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
async function readBoundedBody(request) {
  const declared = request.headers.get("Content-Length");
  if (declared && Number(declared) > MAX_BODY_BYTES)
    throw Object.assign(new Error("request body too large"), { status: 413 });
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks = [];
  let count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.byteLength;
      if (count > MAX_BODY_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error("request body too large"), {
          status: 413,
        });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
function validatePayload(payload, event, origins) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload))
    return "body must be a JSON object";
  const id = payload.distinct_id ?? payload.anonymous_id;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(id))
    return "stable anonymous identity required";
  for (const key of FIELDS)
    if (
      payload[key] !== undefined &&
      (typeof payload[key] !== "string" || payload[key].length > 2048)
    )
      return "invalid event properties";
  const required =
    event === "service_cta_clicked" ? "cta_name" : "product_name";
  if (!payload[required]?.trim()) return `${required} is required`;
  if (payload.page_url !== undefined) {
    try {
      if (!origins.has(new URL(payload.page_url).origin))
        return "invalid page URL";
    } catch {
      return "invalid page URL";
    }
  }
  return null;
}
// Per-isolate abuse brake only: Cloudflare can run multiple isolates and restart
// them. Entries expire and are bounded; no visitor IP is logged or persisted.
export function createRateLimiter({
  now = Date.now,
  rateLimit = 30,
  rateWindowMs = 60000,
  maxRateEntries = 2048,
} = {}) {
  const entries = new Map();
  return {
    size: () => entries.size,
    check(client) {
      const time = now();
      for (const [key, entry] of entries)
        if (time >= entry.resetAt) entries.delete(key);
      let entry = entries.get(client);
      if (entry)
        entries.delete(client); // Reinsert as most recently used.
      else {
        if (entries.size >= maxRateEntries)
          entries.delete(entries.keys().next().value);
        entry = { count: 0, resetAt: time + rateWindowMs };
      }
      entry.count += 1;
      entries.set(client, entry);
      return {
        allowed: entry.count <= rateLimit,
        retryAfter: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)),
      };
    },
  };
}
export function createWorker(options = {}) {
  const limiter = createRateLimiter(options);
  return {
    async fetch(request, env) {
      const headers = cors(request, env);
      const url = new URL(request.url);
      if (url.pathname === "/health" && request.method === "GET")
        return json({ ok: true, service: "edgeless-ingest" }, 200, headers);
      if (!["POST", "OPTIONS"].includes(request.method))
        return json({ ok: false, error: "method not allowed" }, 405, headers);
      if (request.method === "POST") {
        // This header is populated/overwritten by Cloudflare at the public edge.
        // Never accept X-Forwarded-For as an alternate, spoofable identity.
        const client = request.headers.get("CF-Connecting-IP");
        if (!client || client.length > 64 || !/^[0-9a-fA-F:.]+$/.test(client))
          return json(
            { ok: false, error: "trusted client identity unavailable" },
            400,
            headers,
          );
        const limit = limiter.check(client);
        if (!limit.allowed)
          return json({ ok: false, error: "too many requests" }, 429, {
            ...headers,
            "Retry-After": String(limit.retryAfter),
          });
      }
      const origins = allowedOrigins(env);
      if (!origins.has(request.headers.get("Origin")))
        return json({ ok: false, error: "origin not allowed" }, 403, headers);
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      let payload;
      try {
        payload = await readBoundedBody(request);
      } catch (error) {
        const status = error.status === 413 ? 413 : 400;
        return json(
          {
            ok: false,
            error:
              status === 413 ? "request body too large" : "invalid JSON body",
          },
          status,
          headers,
        );
      }
      if (
        payload === null ||
        typeof payload !== "object" ||
        Array.isArray(payload)
      )
        return json(
          { ok: false, error: "body must be a JSON object" },
          400,
          headers,
        );
      const event = url.searchParams.get("e") || payload.event;
      if (event === "newsletter_signup")
        return json(
          { ok: false, error: "newsletter signup is currently unavailable" },
          503,
          headers,
        );
      if (!EVENTS.has(event))
        return json({ ok: false, error: "unsupported event" }, 400, headers);
      const invalid = validatePayload(payload, event, origins);
      if (invalid) return json({ ok: false, error: invalid }, 400, headers);
      if (!env.POSTHOG_PROJECT_API_KEY)
        return json(
          { ok: false, error: "analytics unavailable" },
          503,
          headers,
        );
      const properties = {
        source: "edgeless-worker",
        $process_person_profile: false,
      };
      for (const key of FIELDS)
        if (payload[key] !== undefined) properties[key] = payload[key];
      if (payload.page_url) properties.$current_url = payload.page_url;
      // Never derive visitor identity from the IP, forward the IP, or accept
      // person-mutating data from this public endpoint. Browser IDs are created
      // and attached only after explicit analytics consent in the site client.
      const body = {
        api_key: env.POSTHOG_PROJECT_API_KEY,
        event,
        distinct_id: payload.distinct_id ?? payload.anonymous_id,
        properties,
      };
      try {
        const upstream = await fetch(
          `${(env.POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "")}/capture/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!upstream.ok)
          return json(
            { ok: false, error: "analytics upstream rejected request" },
            502,
            headers,
          );
        const acknowledgment = await upstream.json();
        if (acknowledgment?.status !== 1 && acknowledgment?.status !== "Ok")
          return json(
            {
              ok: false,
              error: "analytics upstream did not acknowledge event",
            },
            502,
            headers,
          );
        return json(
          {
            ok: true,
            status: 202,
            upstreamStatus: upstream.status,
            accepted: true,
          },
          202,
          headers,
        );
      } catch {
        return json(
          { ok: false, error: "analytics upstream unavailable" },
          502,
          headers,
        );
      }
    },
  };
}
const worker = createWorker();
export default worker;
