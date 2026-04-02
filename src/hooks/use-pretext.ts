"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type PreTextModule = typeof import("@chenglou/pretext");

const FONT_CHECK_TIMEOUT = 3000;
const DEFAULT_FONT_FAMILY = "Geist";

/**
 * Hook that lazily loads PreText and waits for the specified font to be ready.
 *
 * SSR-safe: `ready` is always false on the server. PreText is dynamically
 * imported so it never enters the SSR bundle.
 *
 * All returned functions are either callable (when ready) or null.
 * Calling prepare/prepareWithSegments when not ready returns null.
 */
export function usePreText(fontFamily = DEFAULT_FONT_FAMILY) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const moduleRef = useRef<PreTextModule | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof document === "undefined") return;

      // Wait for the named font to be available for Canvas measurement
      try {
        await Promise.race([
          document.fonts.ready.then(() => {
            const check = `16px "${fontFamily}"`;
            if (document.fonts.check(check)) return;
            return document.fonts.load(check);
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Font timeout")), FONT_CHECK_TIMEOUT)
          ),
        ]);
      } catch {
        console.warn(`[PreText] Font "${fontFamily}" not confirmed loaded, proceeding with fallback`);
      }

      // Dynamic import -- keeps PreText out of the SSR bundle
      let mod: PreTextModule;
      try {
        mod = await import("@chenglou/pretext");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        return;
      }
      if (cancelled) return;

      moduleRef.current = mod;
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  // Wrap all functions in useCallback so they have stable identity.
  // They read moduleRef at call time, so they work correctly even
  // when captured in closures before `ready` flips.

  const prepare = useCallback(
    (text: string, font: string) =>
      moduleRef.current ? moduleRef.current.prepare(text, font) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  const prepareWithSegments = useCallback(
    (text: string, font: string) =>
      moduleRef.current ? moduleRef.current.prepareWithSegments(text, font) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  const layout = useCallback(
    (...args: Parameters<PreTextModule["layout"]>) =>
      moduleRef.current ? moduleRef.current.layout(...args) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  const layoutWithLines = useCallback(
    (...args: Parameters<PreTextModule["layoutWithLines"]>) =>
      moduleRef.current ? moduleRef.current.layoutWithLines(...args) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  const layoutNextLine = useCallback(
    (...args: Parameters<PreTextModule["layoutNextLine"]>) =>
      moduleRef.current ? moduleRef.current.layoutNextLine(...args) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  const walkLineRanges = useCallback(
    (...args: Parameters<PreTextModule["walkLineRanges"]>) =>
      moduleRef.current ? moduleRef.current.walkLineRanges(...args) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready]
  );

  return {
    ready,
    error,
    prepare,
    prepareWithSegments,
    layout: ready ? layout : null,
    layoutWithLines: ready ? layoutWithLines : null,
    layoutNextLine: ready ? layoutNextLine : null,
    walkLineRanges: ready ? walkLineRanges : null,
  };
}
