"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from "react";

interface MasonryItem {
  key: string;
  height: number;
  element: ReactNode;
}

interface PreTextMasonryProps {
  items: MasonryItem[];
  gap?: number;
  className?: string;
  style?: CSSProperties;
  /** Responsive column breakpoints. Default: 3@1024, 2@640, 1@0 */
  breakpoints?: Array<{ minWidth: number; columns: number }>;
}

interface PlacedItem {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  element: ReactNode;
}

/**
 * Masonry layout powered by PreText-measured heights.
 *
 * Unlike CSS columns or grid, this uses the shortest-column algorithm with
 * pre-calculated heights. Cards are absolutely positioned -- no DOM
 * measurement, no layout thrashing. Heights come from PreText's prepare()
 * + layout() which run in ~0.002ms for 12 cards.
 *
 * SSR fallback: renders a CSS grid (auto rows) until JS hydrates and
 * switches to absolute positioning. The transition is imperceptible
 * because card content is identical.
 *
 * Inspired by the PreText masonry demo.
 */
export function PreTextMasonry({
  items,
  gap = 16,
  className,
  style,
  breakpoints = [
    { minWidth: 1024, columns: 3 },
    { minWidth: 640, columns: 2 },
    { minWidth: 0, columns: 1 },
  ],
}: PreTextMasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const columns = useMemo(() => {
    const sorted = [...breakpoints].sort((a, b) => b.minWidth - a.minWidth);
    for (const bp of sorted) {
      if (containerWidth >= bp.minWidth) return bp.columns;
    }
    return 1;
  }, [containerWidth, breakpoints]);

  const { placed, totalHeight } = useMemo(() => {
    if (containerWidth <= 0 || items.length === 0) {
      return { placed: [] as PlacedItem[], totalHeight: 0 };
    }

    const colWidth = (containerWidth - gap * (columns - 1)) / columns;
    const colHeights = new Array(columns).fill(0);
    const result: PlacedItem[] = [];

    for (const item of items) {
      // Find shortest column
      let shortest = 0;
      for (let c = 1; c < columns; c++) {
        if (colHeights[c] < colHeights[shortest]) shortest = c;
      }

      result.push({
        key: item.key,
        x: shortest * (colWidth + gap),
        y: colHeights[shortest],
        width: colWidth,
        height: item.height,
        element: item.element,
      });

      colHeights[shortest] += item.height + gap;
    }

    const maxHeight = Math.max(...colHeights) - gap;
    return { placed: result, totalHeight: Math.max(0, maxHeight) };
  }, [items, containerWidth, columns, gap]);

  // SSR fallback: CSS grid
  if (!hydrated || containerWidth === 0) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(300px, 1fr))`,
          gap: `${gap}px`,
        }}
      >
        {items.map((item) => (
          <div key={item.key}>{item.element}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        position: "relative",
        height: `${totalHeight}px`,
      }}
    >
      {placed.map((item) => (
        <div
          key={item.key}
          style={{
            position: "absolute",
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${item.width}px`,
            transition:
              "top 0.35s cubic-bezier(0.16, 1, 0.3, 1), left 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {item.element}
        </div>
      ))}
    </div>
  );
}
