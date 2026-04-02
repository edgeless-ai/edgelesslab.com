"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import { usePreText } from "@/hooks/use-pretext";

interface StaggerRevealProps {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  /** Delay between each line revealing, in ms. Default 60. */
  staggerMs?: number;
  /** Max translateX distance for the widest line. Default 24. */
  maxSlide?: number;
}

interface MeasuredLine {
  text: string;
  width: number;
}

/**
 * Text that reveals line-by-line on scroll. Each line slides in from a
 * distance proportional to its measured width -- wider lines travel further.
 *
 * Uses PreText's layoutWithLines for exact line measurement. The animation
 * is driven by IntersectionObserver + JS timeouts, not CSS animation-delay,
 * because we need per-line geometry data that CSS doesn't have.
 *
 * Respects prefers-reduced-motion: skips translateX, fades in simultaneously.
 */
export function StaggerReveal({
  text,
  font = '300 18px "Geist"',
  lineHeight = 30,
  className,
  style,
  staggerMs = 60,
  maxSlide = 24,
}: StaggerRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, prepareWithSegments, layoutWithLines } = usePreText("Geist");
  const [lines, setLines] = useState<MeasuredLine[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const hasTriggered = useRef(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Measure lines
  const measure = useCallback(() => {
    if (
      !ready ||
      !prepareWithSegments ||
      !layoutWithLines ||
      !containerRef.current
    )
      return;

    const width = containerRef.current.clientWidth;
    if (width <= 0) return;

    const prepared = prepareWithSegments(text, font);
    if (!prepared) return;

    const result = layoutWithLines(prepared, width, lineHeight);
    if (!result) return;

    setLines(
      result.lines.map((line) => ({
        text: line.text,
        width: line.width,
      }))
    );
  }, [ready, text, font, lineHeight, prepareWithSegments, layoutWithLines]);

  useEffect(() => {
    measure();
    if (!containerRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  // IntersectionObserver for scroll trigger
  useEffect(() => {
    if (!containerRef.current || !lines) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          setRevealed(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lines]);

  // Fallback: plain text until PreText is ready
  if (!lines) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ ...style, lineHeight: `${lineHeight}px` }}
      >
        {text}
      </div>
    );
  }

  const maxWidth = Math.max(...lines.map((l) => l.width), 1);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        position: "relative",
        height: `${lines.length * lineHeight}px`,
        overflow: "hidden",
      }}
    >
      {lines.map((line, i) => {
        const normalizedWidth = line.width / maxWidth;
        const slideDistance = normalizedWidth * maxSlide;
        const delay = i * staggerMs;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${i * lineHeight}px`,
              left: 0,
              height: `${lineHeight}px`,
              font,
              lineHeight: `${lineHeight}px`,
              whiteSpace: "pre",
              opacity: revealed ? 1 : 0,
              transform:
                revealed || reducedMotion
                  ? "translateX(0)"
                  : `translateX(${-slideDistance}px)`,
              transition: reducedMotion
                ? `opacity 0.3s ease ${delay}ms`
                : `opacity 0.4s ease ${delay}ms, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
