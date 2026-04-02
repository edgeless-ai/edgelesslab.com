"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePreText } from "@/hooks/use-pretext";

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PreTextBlockProps {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  obstacles?: Obstacle[];
  onLayout?: (info: { height: number; lineCount: number }) => void;
  fallback?: ReactNode;
}

export function PreTextBlock({
  text,
  font = '16px "Geist"',
  lineHeight = 28,
  className,
  style,
  obstacles,
  onLayout,
  fallback,
}: PreTextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLayoutRef = useRef(onLayout);
  useEffect(() => {
    onLayoutRef.current = onLayout;
  });

  const { ready, prepareWithSegments, layoutWithLines, layoutNextLine } =
    usePreText("Geist");
  const [lines, setLines] = useState<Array<{ text: string; indent: number }>>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const doLayout = useCallback(() => {
    if (!ready || !containerRef.current || !prepareWithSegments) return;

    const el = containerRef.current;
    const maxWidth = el.clientWidth;
    if (maxWidth === 0) return;

    const prepared = prepareWithSegments(text, font);
    if (!prepared) return;

    if (obstacles?.length && layoutNextLine) {
      const resultLines: Array<{ text: string; indent: number }> = [];
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      let safetyCounter = 0;

      while (safetyCounter++ < 500) {
        let availableWidth = maxWidth;
        let indent = 0;

        for (const obs of obstacles) {
          if (y + lineHeight > obs.y && y < obs.y + obs.height) {
            if (obs.x <= 0) {
              const thisIndent = obs.x + obs.width + 12;
              if (thisIndent > indent) {
                indent = thisIndent;
                availableWidth = maxWidth - indent;
              }
            } else {
              availableWidth = Math.min(availableWidth, obs.x - 12);
            }
          }
        }

        availableWidth = Math.max(availableWidth, 60);

        // Save cursor before advancement for infinite loop detection
        const prevSeg = cursor.segmentIndex;
        const prevGr = cursor.graphemeIndex;

        const line = layoutNextLine(prepared, cursor, availableWidth);
        if (!line) break;

        resultLines.push({ text: line.text.trimEnd(), indent });
        cursor = line.end;
        y += lineHeight;

        // Detect stuck cursor
        if (cursor.segmentIndex === prevSeg && cursor.graphemeIndex === prevGr) break;
      }

      setLines(resultLines);
      setHeight(y);
      onLayoutRef.current?.({ height: y, lineCount: resultLines.length });
    } else if (layoutWithLines) {
      const result = layoutWithLines(prepared, maxWidth, lineHeight);
      if (!result) return;
      const resultLines = result.lines.map((l) => ({
        text: l.text.trimEnd(),
        indent: 0,
      }));
      setLines(resultLines);
      setHeight(result.height);
      onLayoutRef.current?.({
        height: result.height,
        lineCount: result.lines.length,
      });
    }
  }, [
    ready,
    text,
    font,
    lineHeight,
    obstacles,
    prepareWithSegments,
    layoutWithLines,
    layoutNextLine,
  ]);

  useEffect(() => {
    doLayout();
  }, [doLayout]);

  // ResizeObserver -- no `ready` guard needed, doLayout checks it internally
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => doLayout());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [doLayout]);

  if (!ready) {
    return (
      <div ref={containerRef} className={className} style={style}>
        {fallback ?? text}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        height: height !== undefined ? `${height}px` : undefined,
        transition: "height 0.2s ease",
      }}
    >
      {lines.map((line, i) => (
        <span
          key={`${i}-${line.text.slice(0, 8)}`}
          style={{
            display: "block",
            height: `${lineHeight}px`,
            lineHeight: `${lineHeight}px`,
            paddingLeft: line.indent > 0 ? `${line.indent}px` : undefined,
          }}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}
