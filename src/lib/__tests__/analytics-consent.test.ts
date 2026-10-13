import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(), capture: vi.fn(), opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(), set_config: vi.fn(), stopSessionRecording: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: sdk }));

const KEY = "edgeless.analytics-consent.v2";
function storage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
// Independent cookie jar: setters apply attributes, getters return only name=value.
// Raw overrides exercise duplicate scopes and malformed browser-visible values.
let cookies: Map<string, string>;
let writes: string[];
let raw: string | null;
let blockedCookies: boolean;
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_consent_test_public_key");
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_MODE", "");
  cookies = new Map(); writes = []; raw = null; blockedCookies = false;
  const events = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: storage(), sessionStorage: storage(),
    location: { origin: "https://edgelesslab.com", pathname: "/products/test/", hostname: "edgelesslab.com", protocol: "https:", reload: vi.fn() },
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  vi.stubGlobal("document", {
    get cookie() { return raw ?? [...cookies].map(([k, v]) => `${k}=${v}`).join("; "); },
    set cookie(value: string) {
      writes.push(value);
      if (blockedCookies) return;
      const [pair, ...attrs] = value.split(";");
      const index = pair.indexOf("=");
      const key = pair.slice(0, index), val = pair.slice(index + 1);
      if (attrs.some((attr) => attr.trim().toLowerCase() === "max-age=0")) cookies.delete(key);
      else cookies.set(key, val);
    },
  });
  window.localStorage.setItem("theme", "dark");
  vi.stubGlobal("navigator", { sendBeacon: vi.fn(() => true) });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function exerciseAll() {
  const consent = await import("../analytics-consent");
  const analytics = await import("../analytics");
  await consent.captureConsentedEvent("$pageview");
  analytics.trackCTA("buy"); analytics.trackPurchase("test", "$1");
  analytics.trackServiceCTA("book", "https://cal.com/test");
  await Promise.resolve();
}
function expectNoTransport() {
  expect(sdk.init).not.toHaveBeenCalled(); expect(sdk.capture).not.toHaveBeenCalled();
  expect(navigator.sendBeacon).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
}

describe("cookie-authoritative opt-in analytics", () => {
  test.each([null, "yes", "rejected", "%61ccepted", "accepted=extra"])("%s sends no optional transport", async (value) => {
    if (value !== null) cookies.set(KEY, value);
    await exerciseAll(); expectNoTransport();
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });
  test.each(["edgeless.analytics-consent.v1", KEY])("legacy %s acceptance never resurrects", async (key) => {
    window.localStorage.setItem(key, "accepted");
    cookies.set("edgeless.analytics-consent.v1", "accepted");
    await exerciseAll(); expectNoTransport(); expect(cookies.has(KEY)).toBe(false);
    expect(window.localStorage.getItem(key)).toBeNull();
  });
  test.each(["edgeless.analytics-consent.v1", KEY])("legacy %s rejection migrates only without a v2 cookie", async (key) => {
    const consent = await import("../analytics-consent");
    window.localStorage.setItem(key, "rejected"); consent.reconcileAnalyticsConsent();
    expect(consent.getAnalyticsConsent()).toBe("rejected");
    cookies.set(KEY, "accepted"); window.localStorage.setItem(key, "rejected");
    consent.reconcileAnalyticsConsent(); expect(consent.getAnalyticsConsent()).toBe("accepted");
    cookies.set(KEY, "invalid"); window.localStorage.setItem(key, "rejected");
    consent.reconcileAnalyticsConsent(); expect(cookies.get(KEY)).toBe("invalid");
  });
  test("legacy cookie rejection migrates even when localStorage is blocked", async () => {
    const consent = await import("../analytics-consent");
    cookies.set("edgeless.analytics-consent.v1", "rejected");
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw Error("blocked"); });
    consent.reconcileAnalyticsConsent(); expect(consent.getAnalyticsConsent()).toBe("rejected");
  });
  test.each([
    ["accepted; edgeless.analytics-consent.v2=rejected", "rejected"],
    ["rejected; edgeless.analytics-consent.v2=accepted", "rejected"],
    ["accepted; edgeless.analytics-consent.v2=accepted", null],
    ["accepted; edgeless.analytics-consent.v2=bad", null],
  ])("duplicate raw %s fails closed", async (value, expected) => {
    const consent = await import("../analytics-consent"); raw = `${KEY}=${value}`;
    expect(consent.getAnalyticsConsent()).toBe(expected); await exerciseAll(); expectNoTransport();
  });
  test.each(["edgelesslab.com", "shop.edgelesslab.com", "a.shop.edgelesslab.com", "localhost", "127.0.0.1", "preview.example.com", "notedgelesslab.com", "edgelesslab.com.evil.test"])("cookie scope on %s", async (host) => {
    window.location.hostname = host;
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("accepted");
    const cookie = writes.find((value) => value.startsWith(`${KEY}=accepted`))!;
    expect(cookie).toContain("Max-Age=15552000; Path=/; SameSite=Lax; Secure");
    if (host === "edgelesslab.com" || host.endsWith(".edgelesslab.com")) expect(cookie).toContain("; Domain=edgelesslab.com");
    else expect(cookie).not.toContain("Domain=");
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(consent.hasAnalyticsConsent()).toBe(true);
  });
  test("HTTP host-only cookie omits Secure", async () => {
    window.location.hostname = "localhost"; window.location.protocol = "http:";
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("rejected");
    expect(writes[0]).toBe(`${KEY}=rejected; Max-Age=15552000; Path=/; SameSite=Lax`);
  });
  test("blocked cookies never permit session or localStorage acceptance", async () => {
    blockedCookies = true;
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("accepted");
    window.localStorage.setItem(KEY, "accepted");
    await exerciseAll(); expectNoTransport(); expect(consent.hasAnalyticsConsent()).toBe(false);
  });
  test("blocked cookie reads fail closed", async () => {
    Object.defineProperty(document, "cookie", { get() { throw Error("blocked"); }, configurable: true });
    await exerciseAll(); expectNoTransport();
  });
  test("blocked storage cannot override a later cookie revocation", async () => {
    const consent = await import("../analytics-consent");
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw Error("blocked"); });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw Error("blocked"); });
    consent.setAnalyticsConsent("accepted"); await consent.captureConsentedEvent("allowed");
    cookies.set(KEY, "rejected"); expect(consent.reconcileAnalyticsConsent()).toBe(true);
    await exerciseAll(); expect(sdk.capture).toHaveBeenCalledTimes(1);
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });
  test("accepted cookie initializes once and survives a fresh module session", async () => {
    cookies.set(KEY, "accepted");
    const consent = await import("../analytics-consent");
    await Promise.all([consent.captureConsentedEvent("one"), consent.captureConsentedEvent("two")]);
    expect(sdk.init).toHaveBeenCalledTimes(1); expect(sdk.capture).toHaveBeenCalledTimes(2);
    expect(sdk.init.mock.calls[0][1]).toMatchObject({ capture_pageview: false, capture_pageleave: false, autocapture: false, request_batching: false, api_transport: "fetch", disable_session_recording: true, disable_external_dependency_loading: true });
    vi.resetModules(); expect((await import("../analytics-consent")).hasAnalyticsConsent()).toBe(true);
  });
  test("revocation during dynamic loading drops initialization and pending capture", async () => {
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("accepted");
    const pending = consent.captureConsentedEvent("pending"); consent.setAnalyticsConsent("rejected");
    await pending; expectNoTransport();
  });
  test("revocation aborts transports, clears identifiers at pathname scopes, retires old queues", async () => {
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("accepted");
    await consent.captureConsentedEvent("allowed");
    const config = sdk.init.mock.calls[0][1];
    for (const store of [window.localStorage, window.sessionStorage]) {
      store.setItem("ph_project_posthog", "old"); store.setItem(consent.ANALYTICS_ID_KEY, "old");
    }
    cookies.set("ph_project_posthog", "old");
    expect(consent.setAnalyticsConsent("rejected")).toBe(true);
    expect(config.fetch_options.signal.aborted).toBe(true); expect(sdk.opt_out_capturing).toHaveBeenCalledOnce();
    expect(sdk.stopSessionRecording).toHaveBeenCalledOnce();
    for (const store of [window.localStorage, window.sessionStorage]) {
      expect(store.getItem("ph_project_posthog")).toBeNull(); expect(store.getItem(consent.ANALYTICS_ID_KEY)).toBeNull();
    }
    expect(cookies.has("ph_project_posthog")).toBe(false);
    expect(writes.some((value) => value.includes("path=/products/test/"))).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");
    consent.setAnalyticsConsent("accepted"); await consent.captureConsentedEvent("stale");
    expect(config.before_send({ event: "queued" })).toBeNull(); expect(sdk.capture).toHaveBeenCalledTimes(1);
  });
  test("no choice clears old identifiers without disturbing unrelated state", async () => {
    const consent = await import("../analytics-consent");
    window.localStorage.setItem("ph_old", "old"); window.sessionStorage.setItem("__ph_opt_in_out_old", "old");
    cookies.set("ph_old", "old"); consent.reconcileAnalyticsConsent();
    expect(window.localStorage.length).toBe(1); expect(window.sessionStorage.length).toBe(0);
    expect(cookies.size).toBe(0); expectNoTransport();
  });
  test("reject then accept before SDK loading is allowed", async () => {
    const consent = await import("../analytics-consent"); consent.setAnalyticsConsent("rejected");
    expect(consent.setAnalyticsConsent("accepted")).toBe(false);
    await consent.captureConsentedEvent("later"); expect(sdk.capture).toHaveBeenCalledWith("later", undefined);
  });
  test("disabled blocks every helper even with authoritative acceptance", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_MODE", "disabled"); cookies.set(KEY, "accepted");
    const consent = await import("../analytics-consent");
    expect(consent.hasAnalyticsConsent()).toBe(false); expect(consent.getConsentedAnonymousId()).toBeNull();
    await exerciseAll(); expectNoTransport();
  });
  test("consented ingest has a stable ID and excludes query/hash from the page URL", async () => {
    const consent = await import("../analytics-consent"); const analytics = await import("../analytics");
    consent.setAnalyticsConsent("accepted"); analytics.trackPurchase("test", "$1"); analytics.trackServiceCTA("book", "https://cal.com/test");
    const payloads = vi.mocked(navigator.sendBeacon).mock.calls.map(([, body]) => JSON.parse(body as string));
    expect(payloads).toHaveLength(2); expect(payloads[0].anonymous_id).toBeTruthy();
    expect(payloads[1].anonymous_id).toBe(payloads[0].anonymous_id);
    expect(payloads[0].page_url).toBe("https://edgelesslab.com/products/test/");
    consent.setAnalyticsConsent("rejected"); expect(window.localStorage.getItem(consent.ANALYTICS_ID_KEY)).toBeNull();
  });
});
