"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const POSTHOG\_KEY = process.env.NEXT\_PUBLIC\_POSTHOG\_KEY;
const POSTHOG\_HOST = process.env.NEXT\_PUBLIC\_POSTHOG\_HOST \|\| "https://us.i.posthog.com";

let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();

 // Dynamically import posthog-js on first user interaction or after LCP
 useEffect(() => {
 async function initPostHog() {
 if (initialized) return;
 initialized = true;

 // Wait for LCP window to pass
 await new Promise((r) => requestIdleCallback ? requestIdleCallback(r) : setTimeout(r, 2000));

 const { default: ph } = await import("posthog-js");

 if (!POSTHOG\_KEY) return;

 const options: Parameters\[1\] & { web\_vitals?: boolean } = {
 api\_host: POSTHOG\_HOST,
 person\_profiles: "identified\_only",
 capture\_pageview: false,
 capture\_pageleave: true,
 autocapture: true,
 capture\_performance: false,
 web\_vitals: false,
 };
 ph.init(POSTHOG\_KEY, options);

 // Capture initial pageview after lazy init
 const url = window.origin + (pathname \|\| location.pathname);
 ph.capture("$pageview", { $current\_url: url });
 }

 // Defer until interaction (guarantees LCP isn't blocked)
 const onInteraction = () => {
 window.removeEventListener("pointerdown", onInteraction);
 window.removeEventListener("keydown", onInteraction);
 initPostHog();
 };
 window.addEventListener("pointerdown", onInteraction, { once: true });
 window.addEventListener("keydown", onInteraction, { once: true });

 // Fallback: init after 8 seconds even without interaction
 const fallback = setTimeout(() => {
 window.removeEventListener("pointerdown", onInteraction);
 window.removeEventListener("keydown", onInteraction);
 initPostHog();
 }, 8000);

 return () => clearTimeout(fallback);
 }, \[pathname\]);

 return children;
}