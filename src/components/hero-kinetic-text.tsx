"use client";

import dynamic from "next/dynamic";

const KineticPreText = dynamic(
  () => import("@/components/ui/kinetic-pretext").then(m => m.KineticPreText),
  { ssr: false, loading: () => <p style={{ lineHeight: 1.55 }}>{HERO_SUBTITLE}</p> }
);

const HERO_SUBTITLE =
  "One developer shipping autonomous agents, MCP servers, and generative art. 18 products, all free. Everything open source.";

export function HeroKineticText() {
  return (
    <KineticPreText
      text={HERO_SUBTITLE}
      font='300 18px "Geist"'
      lineHeight={28}
      cursorRadius={36}
      cursorColor="var(--accent)"
      className="text-lg font-light"
      style={{ color: "var(--text-secondary)" }}
      fallback={
        <p style={{ lineHeight: 1.55 }}>{HERO_SUBTITLE}</p>
      }
    />
  );
}
