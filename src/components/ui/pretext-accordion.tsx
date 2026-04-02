"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { usePreText } from "@/hooks/use-pretext";

interface PreTextAccordionProps {
  /** Text items to show when expanded. */
  items: string[];
  /** Font for measuring item heights. */
  font: string;
  /** Line height for measurement. */
  lineHeight: number;
  /** Available width for text. */
  containerWidth: number;
  /** Whether the accordion is expanded. */
  expanded: boolean;
  /** Padding inside the expanded region. */
  paddingY?: number;
  /** Gap between items. */
  itemGap?: number;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

/**
 * Expand/collapse container whose target height is pre-calculated by PreText.
 *
 * Unlike DOM-measured accordions that cause layout thrashing, this component
 * knows the expanded height before the transition starts. The CSS max-height
 * transition runs against a pre-calculated value, producing zero layout shift.
 *
 * Inspired by the PreText accordion demo.
 */
export function PreTextAccordion({
  items,
  font,
  lineHeight,
  containerWidth,
  expanded,
  paddingY = 12,
  itemGap = 8,
  className,
  style,
  children,
}: PreTextAccordionProps) {
  const { ready, prepare, layout } = usePreText("Geist");
  const [expandedHeight, setExpandedHeight] = useState(0);

  const measure = useCallback(() => {
    if (!ready || !prepare || !layout || containerWidth <= 0) return;

    let totalHeight = paddingY * 2;
    for (let i = 0; i < items.length; i++) {
      const prepared = prepare(items[i]!, font);
      if (!prepared) continue;
      const result = layout(prepared, containerWidth, lineHeight);
      if (result) totalHeight += result.height;
      if (i < items.length - 1) totalHeight += itemGap;
    }

    setExpandedHeight(totalHeight);
  }, [ready, prepare, layout, items, font, lineHeight, containerWidth, paddingY, itemGap]);

  useEffect(() => {
    measure();
  }, [measure]);

  return (
    <div
      className={className}
      style={{
        ...style,
        maxHeight: expanded ? `${expandedHeight}px` : "0px",
        overflow: "hidden",
        transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ padding: `${paddingY}px 0` }}>
        {children ??
          items.map((item, i) => (
            <div
              key={i}
              style={{
                font,
                lineHeight: `${lineHeight}px`,
                marginBottom: i < items.length - 1 ? `${itemGap}px` : 0,
              }}
            >
              {item}
            </div>
          ))}
      </div>
    </div>
  );
}
