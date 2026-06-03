"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import { usePreText } from "@/hooks/use-pretext";

interface PullQuote {
  text: string;
  side: "left" | "right";
  yOffset: number;
  width?: number;
}

interface EditorialBlockProps {
  paragraphs: string[];
  pullQuotes?: PullQuote[];
  font?: string;
  lineHeight?: number;
  quoteFont?: string;
  quoteLineHeight?: number;
  className?: string;
  style?: CSSProperties;
  paragraphGap?: number;
}

export function EditorialBlock({
  paragraphs,
  pullQuotes = [],
  font = '300 18px "Geist"',
  lineHeight = 30,
  quoteFont = '600 24px "Geist"',
  quoteLineHeight = 34,
  className,
  style,
  paragraphGap = 24,
}: EditorialBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    ready,
    prepareWithSegments,
    layoutNextLine,
    layoutWithLines,
  } = usePreText("Geist");
  const [renderedLines, setRenderedLines] = useState<
    Array<{
      text: string;
      y: number;
      indent: number;
      isPullQuote: boolean;
    }>
  >([]);
  const [totalHeight, setTotalHeight] = useState<number>(0);

  const doLayout = useCallback(() => {
    if (!ready || !containerRef.current || !prepareWithSegments || !layoutNextLine || !layoutWithLines) return;

    const maxWidth = containerRef.current.clientWidth;
    if (maxWidth === 0) return;

    // Pull quotes use hardcoded yOffset which overlaps body text.
    // Fix: position pull quotes AFTER body text ends, stacked vertically.
    const allLines: typeof renderedLines = [];
    let y = 0;

    // Lay out body paragraphs first (no obstacle awareness needed)
    for (let pi = 0; pi < paragraphs.length; pi++) {
      if (pi > 0) y += paragraphGap;

      const para = paragraphs[pi];
      const prepared = prepareWithSegments(para, font);
      if (!prepared) continue;

      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let safetyCounter = 0;

      while (safetyCounter++ < 500) {
        const prevSeg = cursor.segmentIndex;
        const prevGr = cursor.graphemeIndex;

        const line = layoutNextLine(prepared, cursor, maxWidth);
        if (!line) break;

        allLines.push({
          text: line.text.trimEnd(),
          y,
          indent: 0,
          isPullQuote: false,
        });

        cursor = line.end;
        y += lineHeight;

        if (cursor.segmentIndex === prevSeg && cursor.graphemeIndex === prevGr) break;
      }
    }

    // Stack pull quotes after body text with gap
    if (pullQuotes.length > 0) {
      y += 16; // gap after body text
    }

    for (const pq of pullQuotes) {
      const qWidth = pq.width ?? Math.min(maxWidth * 0.4, 280);
      const prepared = prepareWithSegments(pq.text, quoteFont);
      if (!prepared) continue;

      const result = layoutWithLines(prepared, qWidth, quoteLineHeight);
      if (!result) continue;

      const qX = pq.side === "right" ? maxWidth - qWidth : 0;
      let qy = y + 16;

      for (const qline of result.lines.map((l) => l.text.trimEnd())) {
        allLines.push({
          text: qline,
          y: qy,
          indent: qX,
          isPullQuote: true,
        });
        qy += quoteLineHeight;
      }

      y = qy + 16; // gap before next quote
    }

    setRenderedLines(allLines);
    setTotalHeight(y);
  }, [
    ready,
    paragraphs,
    pullQuotes,
    font,
    lineHeight,
    quoteFont,
    quoteLineHeight,
    paragraphGap,
    prepareWithSegments,
    layoutNextLine,
    layoutWithLines,
  ]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => doLayout());
    return () => cancelAnimationFrame(frame);
  }, [doLayout]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => doLayout());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [doLayout]);

  if (!ready) {
    return (
      <div ref={containerRef} className={className} style={style}>
        <div
          className="space-y-6 text-lg font-light"
          style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
        >
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
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
        height: totalHeight > 0 ? `${totalHeight}px` : undefined,
      }}
    >
      {renderedLines.map((line, i) => (
        <span
          key={`${line.isPullQuote ? "pq" : "body"}-${line.y}-${i}`}
          style={{
            position: "absolute",
            top: `${line.y}px`,
            left: line.indent > 0 ? `${line.indent}px` : "0",
            right: "0",
            height: `${line.isPullQuote ? quoteLineHeight : lineHeight}px`,
            lineHeight: `${line.isPullQuote ? quoteLineHeight : lineHeight}px`,
            // Use the font shorthand directly to match PreText measurement
            font: line.isPullQuote ? quoteFont : font,
            color: line.isPullQuote
              ? "var(--text-primary)"
              : "var(--text-secondary)",
          }}
        >
          {line.text}
        </span>
      ))}
    </div>
  );
}
