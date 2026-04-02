"use client";

import { StaggerReveal } from "@/components/ui/pretext-stagger-reveal";

const SUBTITLE =
  "Developer tools built from production agent infrastructure. Every template comes from a system running 24/7.";

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
