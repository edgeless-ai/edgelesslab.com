"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CONSENT_CHANGED_EVENT, CONSENT_SETTINGS_EVENT, CONSENT_STORAGE_KEY, getAnalyticsConsent, setAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics-consent";

export function AnalyticsConsentPanel() {
  const [choice, setChoice] = useState<AnalyticsConsent>(null);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function sync() { setChoice(getAnalyticsConsent()); setReady(true); }
    function open() {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setSettings(true);
    }
    function onStorage(event: StorageEvent) {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) sync();
    }
    sync();
    window.addEventListener(CONSENT_SETTINGS_EVENT, open);
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_SETTINGS_EVENT, open);
      window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  useEffect(() => { if (settings) title.current?.focus(); }, [settings]);

  function close() { setSettings(false); opener.current?.focus(); }
  function choose(value: Exclude<AnalyticsConsent, null>) {
    const needsReload = setAnalyticsConsent(value);
    close();
    if (needsReload) window.location.reload();
  }

  if (!ready || (choice !== null && !settings)) return null;
  const buttonClass = "min-h-11 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4";
  return (
    <aside
      aria-labelledby="analytics-consent-title"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-h-[80vh] max-w-2xl overflow-y-auto rounded-xl border p-5 shadow-xl sm:p-6"
      style={{ background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border-focus)" }}
      onKeyDown={(event) => { if (event.key === "Escape" && settings) close(); }}
    >
      <h2 id="analytics-consent-title" ref={title} tabIndex={-1} className="text-base font-semibold">Analytics &amp; cookies</h2>
      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        Optional analytics help us understand page visits and link clicks. You can accept or reject analytics. Your choice is saved on this device and can be changed in Analytics settings.
      </p>
      {settings && <p className="mt-2 text-sm">Analytics are {choice === "accepted" ? "on" : "off"}.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass} style={{ borderColor: "var(--border-focus)" }} onClick={() => choose("rejected")}>
          {choice === "accepted" ? "Revoke analytics consent" : "Reject analytics"}
        </button>
        <button type="button" className={buttonClass} style={{ borderColor: "var(--border-focus)" }} onClick={() => choose("accepted")}>Accept analytics</button>
        <Link href="/privacy" className="text-sm underline underline-offset-4">Privacy policy</Link>
        {settings && <button type="button" className="min-h-11 px-2 text-sm underline underline-offset-4" onClick={close}>Close settings</button>}
      </div>
    </aside>
  );
}
