"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import { useShrinkWrap } from "@/hooks/use-shrink-wrap";

interface PreTextBalancedProps {
  text: string;
  font: string;
  lineHeight: number;
  className?: string;
  style?: CSSProperties;
  as?: "p" | "div" | "span";
}

/**
 * Renders text at the tightest possible width that preserves line count.
 *
 * CSS text-wrap: balance is a browser heuristic. This uses PreText's exact
 * measurement to find the mathematically optimal balanced width. The result
 * has no wasted trailing whitespace on any line.
 *
 * Progressive enhancement: renders at full width until PreText calculates
 * the balanced width, then narrows in a single imperceptible frame.
 */
export function PreTextBalanced({
  text,
  font,
  lineHeight,
  className,
  style,
  as: Tag = "p",
}: PreTextBalancedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const balancedWidth = useShrinkWrap(text, font, lineHeight, containerWidth);

  return (
    <div ref={containerRef}>
      <Tag
        className={className}
        style={{
          ...style,
          lineHeight: `${lineHeight}px`,
          ...(balancedWidth ? { maxWidth: `${balancedWidth}px` } : {}),
        }}
      >
        {text}
      </Tag>
    </div>
  );
}
