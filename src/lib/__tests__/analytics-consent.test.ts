import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(), capture: vi.fn(), opt_out_capturing: vi.fn(),
  opt_in_capturing: vi.fn(), set_config: vi.fn(), stopSessionRecording: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: sdk }));

function storage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_consent_test_public_key");
  const events = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: storage(), sessionStorage: storage(),
    location: { href: "https://edgelesslab.com/products/test/?email=private#fragment", origin: "https://edgelesslab.com", pathname: "/products/test/", hostname: "edgelesslab.com", reload: vi.fn() },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("navigator", { sendBeacon: vi.fn(() => true) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("optional analytics consent", () => {
  test("no choice, invalid choice and rejection send no events or beacons", async () => {
    const consent = await import("../analytics-consent");
    const analytics = await import("../analytics");
    for (const value of [null, "yes", "rejected"]) {
      if (value) window.localStorage.setItem(consent.CONSENT_STORAGE_KEY, value);
      else window.localStorage.removeItem(consent.CONSENT_STORAGE_KEY);
      await consent.captureConsentedEvent("$pageview");
      analytics.trackCTA("buy");
      analytics.trackPurchase("test", "$1");
      analytics.trackServiceCTA("book", "https://cal.com/test");
    }
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(1);
  });

  test("accept persists and initializes only once for events and route changes", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    await Promise.all([
      consent.captureConsentedEvent("$pageview", { $current_url: "/" }),
      consent.captureConsentedEvent("$pageview", { $current_url: "/about/" }),
    ]);
    expect(window.localStorage.getItem(consent.CONSENT_STORAGE_KEY)).toBe("accepted");
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.capture.mock.calls.map(([name]) => name)).toEqual(["$pageview", "$pageview"]);
    expect(sdk.init.mock.calls[0][1]).toMatchObject({
      capture_pageview: false, request_batching: false, api_transport: "fetch",
      disable_beacon: true, disable_session_recording: true, disable_surveys: true,
      disable_external_dependency_loading: true,
    });
  });

  test("revocation during SDK loading drops the pending event and initialization", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    const pending = consent.captureConsentedEvent("should_not_send");
    consent.setAnalyticsConsent("rejected");
    await pending;
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
  });

  test("revocation aborts SDK transports, removes identifiers and never resumes old queues", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    await consent.captureConsentedEvent("allowed");
    const signal = sdk.init.mock.calls[0][1].fetch_options.signal as AbortSignal;
    const beforeSend = sdk.init.mock.calls[0][1].before_send;
    window.localStorage.setItem("ph_project_posthog", "identifier");
    window.sessionStorage.setItem("ph_project_posthog", "identifier");
    window.localStorage.setItem("theme", "dark");
    expect(consent.setAnalyticsConsent("rejected")).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(sdk.opt_out_capturing).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("ph_project_posthog")).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.getItem("theme")).toBe("dark");
    expect(beforeSend({ event: "queued" })).toBeNull();
    await consent.captureConsentedEvent("rejected");
    // The settings UI reloads after revocation. A stale JS instance must stay blocked even before that reload.
    consent.setAnalyticsConsent("accepted");
    await consent.captureConsentedEvent("old_queue");
    expect(beforeSend({ event: "old_queue" })).toBeNull();
    expect(sdk.capture).toHaveBeenCalledTimes(1);
  });

  test("reject then accept without loading an SDK starts normally", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("rejected");
    expect(consent.setAnalyticsConsent("accepted")).toBe(false);
    await consent.captureConsentedEvent("accepted_later");
    expect(sdk.capture).toHaveBeenCalledWith("accepted_later", undefined);
  });

  test("stale persisted PostHog identifiers are removed before any new choice", async () => {
    const consent = await import("../analytics-consent");
    window.localStorage.setItem("ph_project_posthog", "old");
    window.sessionStorage.setItem("ph_project_posthog", "old");
    consent.reconcileAnalyticsConsent();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(sdk.init).not.toHaveBeenCalled();
  });

  test("stored acceptance survives a fresh module session", async () => {
    const consent = await import("../analytics-consent");
    window.localStorage.setItem(consent.CONSENT_STORAGE_KEY, "accepted");
    await consent.captureConsentedEvent("return_visit");
    expect(sdk.capture).toHaveBeenCalledWith("return_visit", undefined);
  });

  test("cross-tab rejection aborts the active SDK before another event", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    await consent.captureConsentedEvent("allowed");
    window.localStorage.setItem(consent.CONSENT_STORAGE_KEY, "rejected");
    expect(consent.reconcileAnalyticsConsent()).toBe(true);
    await consent.captureConsentedEvent("blocked");
    expect(sdk.capture).toHaveBeenCalledTimes(1);
    expect(sdk.init.mock.calls[0][1].fetch_options.signal.aborted).toBe(true);
  });

  test("blocked localStorage fails closed until an explicit session choice", async () => {
    const consent = await import("../analytics-consent");
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => { throw Error("blocked"); });
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw Error("blocked"); });
    await consent.captureConsentedEvent("blocked");
    expect(sdk.init).not.toHaveBeenCalled();
    consent.setAnalyticsConsent("accepted");
    await consent.captureConsentedEvent("explicit");
    expect(sdk.capture).toHaveBeenCalledWith("explicit", undefined);
  });

  test("rapid cross-tab reject/reaccept invalidates a still-loading event", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    const pending = consent.captureConsentedEvent("old_session");
    // Storage may already hold acceptance by the time the rejection event arrives.
    consent.reconcileAnalyticsConsent("rejected");
    consent.reconcileAnalyticsConsent("accepted");
    await pending;
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    await consent.captureConsentedEvent("new_session");
    expect(sdk.capture).toHaveBeenCalledWith("new_session", undefined);
  });

  test("a failed storage write cannot leave persisted acceptance in effect", async () => {
    const consent = await import("../analytics-consent");
    consent.setAnalyticsConsent("accepted");
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => { throw Error("blocked"); });
    consent.setAnalyticsConsent("rejected");
    await consent.captureConsentedEvent("must_not_send");
    expect(sdk.init).not.toHaveBeenCalled();
    expect(consent.hasAnalyticsConsent()).toBe(false);
  });

  test("accepted purchase and service events use existing ingest only after choice", async () => {
    const consent = await import("../analytics-consent");
    const analytics = await import("../analytics");
    consent.setAnalyticsConsent("accepted");
    analytics.trackPurchase("test", "$1");
    analytics.trackServiceCTA("book", "https://cal.com/test");
    expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    expect(vi.mocked(navigator.sendBeacon).mock.calls[0][0]).toContain("e=purchase_initiated");
    expect(vi.mocked(navigator.sendBeacon).mock.calls[1][0]).toContain("e=service_cta_clicked");
    const payloads = vi.mocked(navigator.sendBeacon).mock.calls.map(([, body]) => JSON.parse(body as string));
    expect(payloads[0].anonymous_id).toMatch(/^[a-zA-Z0-9_-]{8,128}$/);
    expect(payloads[1].anonymous_id).toBe(payloads[0].anonymous_id);
    expect(payloads[0].page_url).toBe("https://edgelesslab.com/products/test/");
    consent.setAnalyticsConsent("rejected");
    expect(window.localStorage.getItem(consent.ANALYTICS_ID_KEY)).toBeNull();
  });
});
