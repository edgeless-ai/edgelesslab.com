"use client";

import { useState, useEffect, useRef } from "react";
import { usePreText } from "@/hooks/use-pretext";

interface CardMeasurement {
  text: string;
  font: string;
  lineHeight: number;
}

/**
 * Measures multiple text blocks and returns the maximum height,
 * enabling equal-height card grids without DOM measurement.
 */
export function useCardHeights(
  cards: CardMeasurement[],
  containerRef: React.RefObject<HTMLElement | null>
) {
  const { ready, prepare, layout } = usePreText("Geist");
  const [normalizedHeight, setNormalizedHeight] = useState<number | undefined>();
  const widthRef = useRef<number>(0);

  useEffect(() => {
    if (!ready || !layout || !containerRef.current) return;

    function measure() {
      if (!containerRef.current || !layout) return;

      const containerWidth = containerRef.current.clientWidth;
      const gap = 24;
      // Breakpoints match ProductsGrid: sm:grid-cols-2 (640px) lg:grid-cols-3 (1024px)
      const cols = containerWidth > 1024 ? 3 : containerWidth > 640 ? 2 : 1;
      const cardWidth = (containerWidth - gap * (cols - 1)) / cols - 48;

      if (cardWidth <= 0) return;
      if (Math.abs(cardWidth - widthRef.current) < 2) return;
      widthRef.current = cardWidth;

      const heights = cards.map((card) => {
        const prepared = prepare(card.text, card.font);
        if (!prepared) return 0;
        return layout(prepared, cardWidth, card.lineHeight)?.height ?? 0;
      });

      const max = Math.max(...heights);
      if (max > 0) setNormalizedHeight(max);
    }

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ready, cards, layout, prepare, containerRef]);

  return normalizedHeight;
}
