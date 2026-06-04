"use client";

import { useState, useEffect } from "react";

/**
 * Defer component mount until the browser is idle (or after a timeout fallback).
 * Use this for heavy below-the-fold / decorative components that should not
 * block the main thread during initial paint / LCP.
 */
export function useDeferredMount(timeout = 2000): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const activate = () => {
      if (!cancelled) setMounted(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(activate, { timeout });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    } else {
      const t = setTimeout(activate, timeout);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [timeout]);

  return mounted;
}
