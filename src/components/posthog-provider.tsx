"use client";

import { useEffect, Suspense, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";


function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY || !window.posthog) return;
    if (pathname) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) url += "?" + search;
      window.posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

function PostHogScript() {
  useEffect(() => {
    if (!POSTHOG_KEY || typeof window === "undefined") return;
    if (window.posthog) return;

    // Load PostHog via script tag to keep it out of the JS bundle
    const script = document.createElement("script");
    script.src = `${POSTHOG_HOST}/static/array.js`;
    script.async = true;
    script.onload = () => {
      if (window.posthog) {
        window.posthog.init(POSTHOG_KEY!, {
          api_host: POSTHOG_HOST,
          person_profiles: "identified_only",
          capture_pageview: false,
          capture_pageleave: true,
          autocapture: true,
          scroll_depth: true,
          capture_performance: true,
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {mounted && POSTHOG_KEY && (
        <>
          <PostHogScript />
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
        </>
      )}
      {children}
    </>
  );
}
