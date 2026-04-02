"use client";

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePreText } from "@/hooks/use-pretext";

export interface RichFlowSegment {
  text: string;
  font: string;
  lineHeight: number;
  style?: CSSProperties;
}

interface PreTextRichFlowProps {
  segments: RichFlowSegment[];
  className?: string;
  style?: CSSProperties;
}

interface RenderedFragment {
  text: string;
  width: number;
  style?: CSSProperties;
  font: string;
}

interface RenderedLine {
  fragments: RenderedFragment[];
  y: number;
  lineHeight: number;
}

const LINE_START = { segmentIndex: 0, graphemeIndex: 0 };
const UNBOUNDED = 100_000;

/**
 * Mixed-font inline text stream measured by PreText.
 *
 * Each segment can have a different font (e.g. Geist Mono for tool names,
 * Geist for descriptions). layoutNextLine measures each segment with its
 * own font, and the component manages the remaining-width budget across
 * segments on the same line.
 *
 * Lines are absolutely positioned -- no DOM measurement.
 * SSR fallback: inline spans with natural browser flow.
 */
export function PreTextRichFlow({
  segments,
  className,
  style,
}: PreTextRichFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { ready, prepareWithSegments, layoutNextLine } = usePreText("Geist");

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const lines = useMemo(() => {
    if (!ready || !prepareWithSegments || !layoutNextLine || containerWidth <= 0) {
      return null;
    }

    // Prepare each segment with its own font
    const prepared = segments.map((seg) => ({
      prepared: prepareWithSegments(seg.text, seg.font),
      segment: seg,
    }));

    // Check all preparations succeeded
    if (prepared.some((p) => !p.prepared)) return null;

    const result: RenderedLine[] = [];
    const maxLineHeight = Math.max(...segments.map((s) => s.lineHeight));
    let currentY = 0;
    let currentFragments: RenderedFragment[] = [];
    let remainingWidth = containerWidth;

    for (const { prepared: prep, segment } of prepared) {
      if (!prep) continue;

      // Get full unbounded width of this segment
      const fullLine = layoutNextLine(prep, LINE_START, UNBOUNDED);
      if (!fullLine) continue;

      if (fullLine.width <= remainingWidth) {
        // Fits on current line entirely
        currentFragments.push({
          text: fullLine.text,
          width: fullLine.width,
          style: segment.style,
          font: segment.font,
        });
        remainingWidth -= fullLine.width;
      } else {
        // Need to break this segment across lines
        let cursor = LINE_START;

        while (true) {
          const line = layoutNextLine(prep, cursor, Math.max(1, remainingWidth));
          if (!line) break;

          currentFragments.push({
            text: line.text,
            width: line.width,
            style: segment.style,
            font: segment.font,
          });

          // Check if we've consumed the entire segment
          const isComplete =
            line.end.segmentIndex >= prep.segments.length ||
            (line.end.segmentIndex === prep.segments.length - 1 &&
              line.end.graphemeIndex >= prep.segments[prep.segments.length - 1].length);

          if (isComplete) {
            remainingWidth -= line.width;
            break;
          }

          // Emit current line and start a new one
          result.push({
            fragments: currentFragments,
            y: currentY,
            lineHeight: maxLineHeight,
          });
          currentY += maxLineHeight;
          currentFragments = [];
          remainingWidth = containerWidth;
          cursor = line.end;
        }
      }
    }

    // Emit final line
    if (currentFragments.length > 0) {
      result.push({
        fragments: currentFragments,
        y: currentY,
        lineHeight: maxLineHeight,
      });
      currentY += maxLineHeight;
    }

    return { lines: result, totalHeight: currentY };
  }, [ready, prepareWithSegments, layoutNextLine, segments, containerWidth]);

  // SSR / loading fallback: natural inline flow
  if (!lines) {
    return (
      <div ref={containerRef} className={className} style={{ ...style, whiteSpace: "pre-wrap" }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ ...seg.style, font: seg.font }}>
            {seg.text}
          </span>
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
        height: `${lines.totalHeight}px`,
      }}
    >
      {lines.lines.map((line, li) => (
        <div
          key={li}
          style={{
            position: "absolute",
            top: `${line.y}px`,
            left: 0,
            height: `${line.lineHeight}px`,
            lineHeight: `${line.lineHeight}px`,
            whiteSpace: "pre",
          }}
        >
          {line.fragments.map((frag, fi) => (
            <span
              key={fi}
              style={{
                ...frag.style,
                font: frag.font,
              }}
            >
              {frag.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
