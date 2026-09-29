import test from "node:test";
import assert from "node:assert/strict";
import worker, { createWorker, createRateLimiter } from "./worker.js";
const origin = "https://edgelesslab.com";
const env = {
  POSTHOG_PROJECT_API_KEY: "offline-test-project-key",
  ALLOWED_ORIGINS: origin,
  POSTHOG_HOST: "https://analytics.example.invalid",
};
function request(body, options = {}) {
  return new Request(
    "https://worker.example.invalid/?e=" +
      encodeURIComponent(options.event || "service_cta_clicked"),
    {
      method: "POST",
      headers: {
        Origin: options.origin ?? origin,
        "CF-Connecting-IP": "192.0.2.10",
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}
const valid = {
  anonymous_id: "audit-anonymous-12345",
  cta_name: "private_ai_consult",
  destination: "mailto:david@edgelesslab.com",
  page_url: origin + "/services/private-ai-systems/",
  path: "/services/private-ai-systems/",
};
async function run(
  req,
  fn = () => new Response('{"status":1}', { status: 200 }),
  vars = env,
) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(args);
    return fn(...args);
  };
  try {
    const response = await createWorker().fetch(req, vars, {});
    return { response, body: await response.json(), calls };
  } finally {
    globalThis.fetch = original;
  }
}
test("malformed, null, array, number payloads return 400 with no upstream request", async () => {
  for (const body of ["{", "null", "[]", "42"]) {
    const r = await run(request(body));
    assert.equal(r.response.status, 400, body);
    assert.equal(r.calls.length, 0);
  }
});
test("oversized byte body and declared size rejected before forwarding", async () => {
  for (const req of [
    request(JSON.stringify({ ...valid, extra: "a".repeat(18000) })),
    request(valid, { headers: { "Content-Length": "999999" } }),
  ]) {
    const r = await run(req);
    assert.equal(r.response.status, 413);
    assert.equal(r.calls.length, 0);
  }
});
test("untrusted, missing, or null origins rejected; CORS reflects only allowed origin", async () => {
  for (const bad of ["https://attacker.invalid", "", "null"]) {
    const r = await run(request(valid, { origin: bad }));
    assert.equal(r.response.status, 403);
    assert.equal(r.calls.length, 0);
    assert.equal(r.response.headers.get("Access-Control-Allow-Origin"), null);
  }
});
test("newsletter deliberately unavailable and unknown events rejected without forwarding", async () => {
  for (const [event, status] of [
    ["newsletter_signup", 503],
    ["$identify", 400],
    ["invented_event", 400],
  ]) {
    const r = await run(request(valid, { event }));
    assert.equal(r.response.status, status);
    assert.equal(r.calls.length, 0);
  }
});
test("missing or malformed stable identity is rejected; IP cannot create person identity", async () => {
  for (const body of [
    { ...valid, anonymous_id: undefined },
    { ...valid, anonymous_id: "person@example.invalid" },
    { ...valid, anonymous_id: 42 },
  ]) {
    const r = await run(
      request(body, { headers: { "CF-Connecting-IP": "192.0.2.1" } }),
    );
    assert.equal(r.response.status, 400);
    assert.equal(r.calls.length, 0);
  }
});
test("valid service CTA forwards allowed fields with stable ID and no IP/PII/reserved profile mutation", async () => {
  const r = await run(
    request(
      {
        ...valid,
        email: "never-store@example.invalid",
        $set: { email: "bad" },
        timestamp: "1900",
        api_key: "forged",
        product_name: undefined,
      },
      { headers: { "CF-Connecting-IP": "192.0.2.1" } },
    ),
  );
  assert.equal(r.response.status, 202);
  assert.equal(r.calls.length, 1);
  const payload = JSON.parse(r.calls[0][1].body);
  assert.equal(payload.api_key, env.POSTHOG_PROJECT_API_KEY);
  assert.equal(payload.distinct_id, valid.anonymous_id);
  assert.equal(payload.event, "service_cta_clicked");
  assert.equal(payload.properties.cta_name, valid.cta_name);
  for (const key of [
    "$ip",
    "email",
    "$set",
    "timestamp",
    "api_key",
    "anonymous_id",
    "distinct_id",
  ])
    assert.equal(payload.properties[key], undefined, key);
  assert.equal(r.response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(r.response.headers.get("Vary"), "Origin");
});
test("valid purchase preserves product/price and actual upstream acknowledgment", async () => {
  const r = await run(
    request(
      {
        anonymous_id: valid.anonymous_id,
        product_name: "A guide",
        price: "$10",
        page_url: origin + "/products/guide/",
      },
      { event: "purchase_initiated" },
    ),
  );
  assert.equal(r.response.status, 202);
  assert.equal(r.body.upstreamStatus, 200);
  assert.equal(
    JSON.parse(r.calls[0][1].body).properties.product_name,
    "A guide",
  );
});
test("missing event-specific field or invalid property type rejected", async () => {
  for (const req of [
    request({ ...valid, cta_name: undefined }),
    request({ ...valid, cta_name: { x: 1 } }),
    request(
      { anonymous_id: valid.anonymous_id },
      { event: "purchase_initiated" },
    ),
    request({ ...valid, page_url: "https://attacker.invalid/" }),
  ]) {
    const r = await run(req);
    assert.equal(r.response.status, 400);
    assert.equal(r.calls.length, 0);
  }
});
test("upstream failure/network rejection returns controlled 502 rather than false success", async () => {
  for (const fn of [
    () => new Response("no", { status: 500 }),
    () => Promise.reject(new Error("offline network failure")),
  ]) {
    const r = await run(request(valid), fn);
    assert.equal(r.response.status, 502);
    assert.equal(r.body.ok, false);
    assert.equal(r.calls.length, 1);
  }
});
test("health read and allowed preflight available, other methods denied", async () => {
  const health = await worker.fetch(
    new Request("https://worker.example.invalid/health"),
    env,
    {},
  );
  assert.equal(health.status, 200);
  const options = await worker.fetch(
    new Request("https://worker.example.invalid/", {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
    env,
    {},
  );
  assert.equal(options.status, 204);
  const get = await worker.fetch(
    new Request("https://worker.example.invalid/"),
    env,
    {},
  );
  assert.equal(get.status, 405);
});
test("missing upstream configuration fails closed", async () => {
  const r = await run(request(valid), undefined, { ALLOWED_ORIGINS: origin });
  assert.equal(r.response.status, 503);
  assert.equal(r.calls.length, 0);
});
test("upstream HTTP 200 must also acknowledge PostHog status 1", async () => {
  for (const body of ["{}", '{"status":0}', "not JSON"]) {
    const r = await run(
      request(valid),
      () => new Response(body, { status: 200 }),
    );
    assert.equal(r.response.status, 502);
    assert.equal(r.body.ok, false);
  }
});
test("current PostHog Ok acknowledgment accepted and forwarded events remain anonymous", async () => {
  const r = await run(
    request({ ...valid, $process_person_profile: true }),
    () => new Response('{"status":"Ok"}', { status: 200 }),
  );
  assert.equal(r.response.status, 202);
  assert.equal(
    JSON.parse(r.calls[0][1].body).properties.$process_person_profile,
    false,
  );
});

test("31st POST is limited before parsing, independent callers work, window resets", async () => {
  let now = 0;
  const instance = createWorker({ now: () => now });
  const original = globalThis.fetch;
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards++;
    return new Response('{"status":1}', { status: 200 });
  };
  try {
    for (let i = 0; i < 30; i++)
      assert.equal((await instance.fetch(request(valid), env)).status, 202);
    const denied = await instance.fetch(request("{"), env);
    assert.equal(denied.status, 429);
    assert.equal(denied.headers.get("Retry-After"), "60");
    assert.equal(forwards, 30);
    const other = await instance.fetch(
      request(valid, { headers: { "CF-Connecting-IP": "192.0.2.11" } }),
      env,
    );
    assert.equal(other.status, 202);
    now = 60000;
    assert.equal((await instance.fetch(request(valid), env)).status, 202);
  } finally {
    globalThis.fetch = original;
  }
});
test("malformed POSTs count; health and OPTIONS do not consume quota", async () => {
  const instance = createWorker({ rateLimit: 2 });
  for (let i = 0; i < 4; i++) {
    assert.equal(
      (
        await instance.fetch(
          new Request("https://worker.example.invalid/health"),
          env,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await instance.fetch(
          new Request("https://worker.example.invalid/", {
            method: "OPTIONS",
            headers: { Origin: origin },
          }),
          env,
        )
      ).status,
      204,
    );
  }
  for (let i = 0; i < 2; i++)
    assert.equal((await instance.fetch(request("{"), env)).status, 400);
  assert.equal((await instance.fetch(request("{"), env)).status, 429);
});
test("missing trusted CF client address fails closed, spoofable forwarded header ignored", async () => {
  const req = request(valid, {
    headers: { "CF-Connecting-IP": "", "X-Forwarded-For": "192.0.2.1" },
  });
  const r = await run(req);
  assert.equal(r.response.status, 400);
  assert.equal(r.calls.length, 0);
});
test("rate-limit memory is bounded with expiry and LRU eviction", () => {
  let now = 0;
  const limiter = createRateLimiter({
    now: () => now,
    maxRateEntries: 2,
    rateLimit: 1,
  });
  assert.equal(limiter.check("a").allowed, true);
  assert.equal(limiter.check("b").allowed, true);
  assert.equal(limiter.check("a").allowed, false);
  limiter.check("c");
  assert.equal(limiter.size(), 2);
  assert.equal(limiter.check("b").allowed, true);
  assert.equal(limiter.size(), 2);
  now = 60000;
  limiter.check("d");
  assert.equal(limiter.size(), 1);
});
