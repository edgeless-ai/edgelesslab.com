"use client";

import { StaggerReveal } from "@/components/ui/pretext-stagger-reveal";

const SUBTITLE =
  "Templates, kits, and blueprints extracted from systems running 24/7. Every product is what I actually use, packaged so you can ship it tomorrow.";

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
