"use client";

import { StaggerReveal } from "@/components/ui/pretext-stagger-reveal";

const SUBTITLE =
  "5 free lead magnets + 17 premium toolkits. Claude Code skills, MCP kits, agent blueprints, and n8n workflows I use daily.";

export function ProductsSubtitle() {
  return (
    <StaggerReveal
      text={SUBTITLE}
      font='300 18px "Geist"'
      lineHeight={30}
      staggerMs={45}
      maxSlide={16}
      style={{ color: "var(--text-secondary)" }}
    />
  );
}
