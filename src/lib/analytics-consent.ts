import type posthog from "posthog-js";

export type AnalyticsConsent = "accepted" | "rejected" | null;
export const CONSENT_STORAGE_KEY = "edgeless.analytics-consent.v2";
export const ANALYTICS_ID_KEY = "edgeless.analytics-id.v1";
export const UTM_STORAGE_KEY = "edgeless.analytics-utm.v1";
export const CONSENT_CHANGED_EVENT = "edgeless:analytics-consent";
export const CONSENT_SETTINGS_EVENT = "edgeless:analytics-settings";

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type UtmParams = Partial<Record<(typeof UTM_PARAMS)[number], string>>;

/** Read UTM parameters from the current URL and persist them in sessionStorage. */
export function captureUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    // Return cached value if already captured this session
    const cached = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as UtmParams;
      if (parsed && Object.keys(parsed).length > 0) return parsed;
    }
  } catch { /* session storage unavailable */ }

  const params: UtmParams = {};
  try {
    const url = new URL(window.location.href);
    for (const key of UTM_PARAMS) {
      const val = url.searchParams.get(key);
      if (val) params[key] = val;
    }
  } catch { /* invalid URL */ }

  // Cache in sessionStorage so subsequent navigations retain the original referrer
  if (Object.keys(params).length > 0) {
    try {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(params));
    } catch { /* session storage unavailable */ }
  }
  return params;
}

/** Return the cached UTM params for the current session (no re-read from URL). */
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const cached = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (cached) return JSON.parse(cached) as UtmParams;
  } catch { /* session storage unavailable */ }
  return {};
}

const LEGACY_CONSENT_KEYS = ["edgeless.analytics-consent.v1", "edgeless.analytics-consent", "edgeless-analytics-consent", "analytics-consent"];
let observedChoice: AnalyticsConsent | undefined;
let failedChoiceWrite = false;
let sessionId: string | null = null;
let generation = 0;
let sdk: typeof posthog | null = null;
let pending: Promise<typeof posthog | null> | null = null;
let transport: AbortController | null = null;
let retired = false;
/** Read raw values exactly; ambiguous duplicate scopes fail closed and rejection wins. */
function rawCookie(name: string): string | null {
  try {
    const values = document.cookie.split(";").map((part) => part.trim())
      .filter((part) => part.startsWith(name + "="))
      .map((part) => part.slice(name.length + 1));
    if (values.includes("rejected")) return "rejected";
    return values.length === 1 ? values[0] : values.length ? "invalid" : null;
  } catch { return "invalid"; }
}

/** The cookie is the only consent authority, never localStorage or in-memory acceptance. */
export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return null;
  const value = rawCookie(CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

/** Migrate rejection only. Even an invalid v2 cookie outranks legacy storage. */
export function migrateLegacyConsent() {
  if (typeof window === "undefined") return;
  if (rawCookie(CONSENT_STORAGE_KEY) === null) {
    let rejected = LEGACY_CONSENT_KEYS.some((key) => rawCookie(key) === "rejected");
    try {
      rejected ||= [...LEGACY_CONSENT_KEYS, CONSENT_STORAGE_KEY].some((key) => window.localStorage.getItem(key) === "rejected");
    } catch { /* Cookie migration still works with blocked storage. */ }
    if (rejected) {
      try { writeSharedConsentCookie("rejected"); } catch { /* Fail closed. */ }
    }
  }
  try {
    for (const key of [...LEGACY_CONSENT_KEYS, CONSENT_STORAGE_KEY]) window.localStorage.removeItem(key);
  } catch { /* Blocked storage cannot authorize analytics. */ }
}

export function hasAnalyticsConsent() {
  return process.env.NEXT_PUBLIC_ANALYTICS_MODE !== "disabled" &&
    getAnalyticsConsent() === "accepted" && !retired && !failedChoiceWrite;
}

/**
 * Returns the anonymous ID from localStorage, creating one if needed.
 * Only returns an ID when consent is accepted.
 */
export function getConsentedAnonymousId() {
  if (!hasAnalyticsConsent()) return null;
  try {
    const stored = window.localStorage.getItem(ANALYTICS_ID_KEY);
    if (stored) return stored;
  } catch { /* session-only below */ }
  sessionId ??= crypto.randomUUID();
  try { window.localStorage.setItem(ANALYTICS_ID_KEY, sessionId); } catch { /* session-only */ }
  return sessionId;
}

/**
 * Clears all PostHog identifiers from localStorage and cookies.
 */
function clearAnalyticsStorage() {
  if (typeof window === "undefined") return;
  sessionId = null;
  const isAnalyticsKey = (key: string) => key === ANALYTICS_ID_KEY || /^(?:ph_|__ph_opt_in_out_)/.test(key);

  // Clear localStorage/sessionStorage
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key && isAnalyticsKey(key)) storage.removeItem(key);
      }
    } catch { /* blocked */ }
  }

  // Clear cookies with shared cookie contract
  const hostname = window.location.hostname;
  const labels = hostname.split(".");
  const domains = [""];
  for (let index = 0; index < labels.length - 1; index++) {
    const domain = labels.slice(index).join(".");
    domains.push(`; domain=${domain}`, `; domain=.${domain}`);
  }
  const paths = ["/"];
  let path = "";
  for (const part of window.location.pathname.split("/").filter(Boolean)) {
    path += "/" + part;
    paths.push(path, path + "/");
  }

  let visibleCookies: string;
  try { visibleCookies = document.cookie; } catch { return; }
  for (const cookie of visibleCookies.split(";")) {
    const key = cookie.split("=")[0].trim();
    if (!isAnalyticsKey(key)) continue;
    for (const domain of domains) {
      for (const path of paths) {
        document.cookie = `${key}=; Max-Age=0; path=${path}${domain}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      }
    }
  }
}

/** Write the shared cookie, removing an obsolete host-only root scope first. */
function writeSharedConsentCookie(choice: Exclude<AnalyticsConsent, null>) {
  const hostname = window.location.hostname;
  const isEdgeless = hostname === "edgelesslab.com" || hostname.endsWith(".edgelesslab.com");
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (isEdgeless) document.cookie = `${CONSENT_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `${CONSENT_STORAGE_KEY}=${choice}; Max-Age=15552000; Path=/; SameSite=Lax${secure}${isEdgeless ? "; Domain=edgelesslab.com" : ""}`;
}

/**
 * Returns true when the UI must reload to retire a previously loaded SDK.
 */
export function reconcileAnalyticsConsent() {
  migrateLegacyConsent();
  const choice = getAnalyticsConsent();
  if (observedChoice !== choice) {
    observedChoice = choice;
    generation++;
    if (!sdk) pending = null;
  }
  if (hasAnalyticsConsent()) return retired;
  if (sdk && !retired) {
    retired = true;
    transport?.abort();
    sdk.opt_out_capturing();
    sdk.set_config({ disable_persistence: true, autocapture: false, capture_pageleave: false });
    sdk.stopSessionRecording();
  }
  clearAnalyticsStorage();
  return retired;
}

/**
 * Sets analytics consent, writes shared cookie, and triggers UI reload if needed.
 */
export function setAnalyticsConsent(choice: Exclude<AnalyticsConsent, null>) {
  generation++;
  if (!sdk) pending = null;
  try {
    writeSharedConsentCookie(choice);
    failedChoiceWrite = getAnalyticsConsent() !== choice;
  } catch { failedChoiceWrite = true; }
  const needsReload = reconcileAnalyticsConsent();
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  return needsReload;
}

async function ensureAnalytics() {
  if (!hasAnalyticsConsent() || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (sdk) return sdk;
  if (pending) return pending;

  const mode = process.env.NEXT_PUBLIC_ANALYTICS_MODE;
  if (mode === "disabled") return null;

  const startedAt = generation;
  const loading = (async () => {
    const { default: ph } = await import("posthog-js");
    if (!hasAnalyticsConsent() || startedAt !== generation) return null;
    transport = new AbortController();
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
      fetch_options: fetchOptions,
      before_send: (event) => hasAnalyticsConsent() ? event : null,
      cross_subdomain_cookie: true,
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
  if (ph && hasAnalyticsConsent() && startedAt === generation) {
    const utm = getUtmParams();
    const merged = Object.keys(utm).length > 0 ? { ...utm, ...properties } : properties;
    ph.capture(event, merged);
  }
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event(CONSENT_SETTINGS_EVENT));
}
