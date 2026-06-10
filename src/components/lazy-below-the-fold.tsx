"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const BelowTheFold = dynamic(
  () => import("@/components/below-the-fold").then((m) => m.BelowTheFold),
  { ssr: false, loading: () => <div style={{ minHeight: "500px" }} /> }
);

export function LazyBelowTheFold() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);

    const fallback = setTimeout(() => setIsVisible(true), 5000);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? <BelowTheFold /> : <div style={{ minHeight: "500px" }} />}
    </div>
  );
}
