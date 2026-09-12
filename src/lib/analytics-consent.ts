import type posthog from "posthog-js";

export type AnalyticsConsent = "accepted" | "rejected" | null;
export const CONSENT_STORAGE_KEY = "edgeless.analytics-consent.v1";
export const ANALYTICS_ID_KEY = "edgeless.analytics-id.v1";
export const CONSENT_CHANGED_EVENT = "edgeless:analytics-consent";
export const CONSENT_SETTINGS_EVENT = "edgeless:analytics-settings";

let sessionChoice: AnalyticsConsent = null;
let observedChoice: AnalyticsConsent | undefined;
let storageUnavailable = false;
let sessionId: string | null = null;
let generation = 0;
let sdk: typeof posthog | null = null;
let pending: Promise<typeof posthog | null> | null = null;
let transport: AbortController | null = null;
let retired = false;

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  if (storageUnavailable) return sessionChoice;
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "rejected" ? stored : null;
  } catch {
    // When storage is blocked, an explicit choice applies only to this page.
    return sessionChoice;
  }
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === "accepted" && !retired;
}

export function getConsentedAnonymousId() {
  if (!hasAnalyticsConsent()) return null;
  try {
    const stored = window.localStorage.getItem(ANALYTICS_ID_KEY);
    if (stored) return stored;
  } catch { /* A blocked store uses the page session below. */ }
  sessionId ??= crypto.randomUUID();
  try { window.localStorage.setItem(ANALYTICS_ID_KEY, sessionId); } catch { /* Session-only identifier. */ }
  return sessionId;
}

function clearAnalyticsStorage() {
  if (typeof window === "undefined") return;
  sessionId = null;
  const isAnalyticsKey = (key: string) => key === ANALYTICS_ID_KEY || /^(?:ph_|__ph_opt_in_out_)/.test(key);
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key && isAnalyticsKey(key)) storage.removeItem(key);
      }
    } catch { /* Storage can be disabled by the browser. */ }
  }
  const domains = [""];
  const labels = window.location.hostname.split(".");
  for (let index = 0; index < labels.length - 1; index++) {
    const domain = labels.slice(index).join(".");
    domains.push(`; domain=${domain}`, `; domain=.${domain}`);
  }
  const segments = window.location.pathname.split("/").filter(Boolean);
  const paths = ["/", ...segments.map((_, index) => `/${segments.slice(0, index + 1).join("/")}`)];
  for (const cookie of document.cookie.split(";")) {
    const key = cookie.split("=")[0].trim();
    if (!isAnalyticsKey(key)) continue;
    for (const domain of domains) for (const path of paths) {
      document.cookie = `${key}=; Max-Age=0; path=${path}${domain}; SameSite=Lax`;
    }
  }
}

/** Returns true when the UI must reload to retire a previously loaded SDK. */
export function reconcileAnalyticsConsent(choice = getAnalyticsConsent()) {
  if (observedChoice !== choice) {
    observedChoice = choice;
    generation++;
    if (!sdk) pending = null;
  }
  if (choice === "accepted") return retired;
  if (sdk && !retired) {
    retired = true;
    // Keep this signal aborted for retry/unload paths. Reaccepting requires a
    // fresh page and must never reactivate a previous consent session's queue.
    transport?.abort();
    sdk.opt_out_capturing();
    sdk.set_config({ disable_persistence: true, autocapture: false, capture_pageleave: false });
    sdk.stopSessionRecording();
  }
  clearAnalyticsStorage();
  return retired;
}

export function setAnalyticsConsent(choice: Exclude<AnalyticsConsent, null>) {
  generation++;
  sessionChoice = choice;
  if (!sdk) pending = null;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    storageUnavailable = false;
  } catch { storageUnavailable = true; }
  const needsReload = reconcileAnalyticsConsent(choice);
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  return needsReload;
}

async function ensureAnalytics() {
  if (!hasAnalyticsConsent() || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (sdk) return sdk;
  if (pending) return pending;
  const startedAt = generation;
  const loading = (async () => {
    const { default: ph } = await import("posthog-js");
    if (!hasAnalyticsConsent() || startedAt !== generation) return null;
    transport = new AbortController();
    // The installed SDK passes fetch_options through to fetch, including retries.
    // disable_beacon prevents an unabortable fallback on navigation.
    const fetchOptions = { cache: "no-store" as RequestCache, signal: transport.signal, keepalive: false };
    ph.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_conversations: true,
      disable_product_tours: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      opt_out_persistence_by_default: true,
      request_batching: false,
      api_transport: "fetch",
      disable_beacon: true,
      fetch_options: fetchOptions,
      before_send: (event) => hasAnalyticsConsent() ? event : null,
    });
    sdk = ph;
    ph.opt_in_capturing({ captureEventName: false });
    return ph;
  })().catch(() => null);
  pending = loading;
  const result = await loading;
  if (pending === loading) pending = null;
  return result;
}

export async function captureConsentedEvent(event: string, properties?: Record<string, unknown>) {
  reconcileAnalyticsConsent();
  if (!hasAnalyticsConsent()) return;
  const startedAt = generation;
  const ph = await ensureAnalytics();
  if (ph && hasAnalyticsConsent() && startedAt === generation) ph.capture(event, properties);
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event(CONSENT_SETTINGS_EVENT));
}
