"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const GenerativeHeroBackground = dynamic(
  () => import("@/components/ui/generative-hero-bg").then(m => m.GenerativeHeroBackground),
  { ssr: false, loading: () => null }
);

const GenerativeAscii = dynamic(
  () => import("@/components/generative-ascii").then(m => m.GenerativeAscii),
  { ssr: false, loading: () => null }
);

export function HeroGenerative() {
  const [showGenerative, setShowGenerative] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGenerative(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showGenerative && <GenerativeHeroBackground />}
      <div className="hidden lg:block">
        {showGenerative && <GenerativeAscii />}
      </div>
    </>
  );
}
