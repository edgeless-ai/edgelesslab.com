"use client";

import {
  useRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePreText } from "@/hooks/use-pretext";
import type { Obstacle } from "@/components/ui/pretext-block";

interface KineticPreTextProps {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
  /** Radius of the cursor-following obstacle */
  cursorRadius?: number;
  /** Color of the cursor glow */
  cursorColor?: string;
}

/**
 * Interactive PreText renderer: text reflows around the user's cursor
 * in real-time. Hover over the text and a glowing orb appears, parting
 * the text like water. Direct DOM manipulation, no React re-renders.
 */
export function KineticPreText({
  text,
  font = '300 18px "Geist"',
  lineHeight = 30,
  className,
  style,
  fallback,
  cursorRadius = 36,
  cursorColor = "var(--accent)",
}: KineticPreTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    ready,
    prepareWithSegments,
    layoutNextLine,
  } = usePreText("Geist");

  useEffect(() => {
    if (!ready || !prepareWithSegments || !layoutNextLine || !containerRef.current) return;

    const container = containerRef.current;
    const doLayoutNextLine = layoutNextLine;
    const preparedResult = prepareWithSegments(text, font);
    if (!preparedResult) return;
    const prepared = preparedResult;

    // ── State ──
    let cursorActive = false;
    let cursorX = 0;
    let cursorY = 0;
    let rafId = 0;
    let baseHeight = 0; // height without obstacles

    // ── DOM setup ──
    while (container.firstChild) container.removeChild(container.firstChild);

    const linePool: HTMLDivElement[] = [];
    const orbEl = document.createElement("div");
    orbEl.style.cssText = `
      position: absolute; border-radius: 50%; pointer-events: none;
      width: ${cursorRadius * 2}px; height: ${cursorRadius * 2}px;
      background: ${cursorColor}; filter: blur(16px);
      mix-blend-mode: screen; opacity: 0;
      transition: opacity 0.25s ease;
      z-index: 1;
    `;
    container.appendChild(orbEl);

    function ensurePool(count: number) {
      while (linePool.length < count) {
        const el = document.createElement("div");
        el.style.cssText = `
          position: absolute; white-space: pre; pointer-events: none;
          font: ${font}; line-height: ${lineHeight}px; height: ${lineHeight}px;
          left: 0; top: 0;
        `;
        container.appendChild(el);
        linePool.push(el);
      }
      for (let i = count; i < linePool.length; i++) {
        linePool[i]!.style.display = "none";
      }
    }

    function layoutText(obstacle: Obstacle | null): Array<{ text: string; y: number; indent: number }> {
      const maxWidth = container.clientWidth;
      if (maxWidth === 0) return [];

      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      const lines: Array<{ text: string; y: number; indent: number }> = [];
      let safety = 0;

      while (safety++ < 500) {
        let availableWidth = maxWidth;
        let indent = 0;

        if (obstacle && y + lineHeight > obstacle.y && y < obstacle.y + obstacle.height) {
          // Obstacle is in this line's band
          const obsLeft = obstacle.x;
          const obsRight = obstacle.x + obstacle.width;

          if (obsLeft <= 0) {
            // Left-side: indent text
            indent = Math.max(0, obsRight + 12);
            availableWidth = maxWidth - indent;
          } else if (obsRight >= maxWidth) {
            // Right-side: shorten line
            availableWidth = Math.max(60, obsLeft - 12);
          } else {
            // Middle: use the larger side
            const leftSpace = obsLeft - 12;
            const rightSpace = maxWidth - obsRight - 12;
            if (leftSpace >= rightSpace) {
              availableWidth = Math.max(60, leftSpace);
            } else {
              indent = obsRight + 12;
              availableWidth = Math.max(60, rightSpace);
            }
          }
        }

        availableWidth = Math.max(availableWidth, 60);

        const prevSeg = cursor.segmentIndex;
        const prevGr = cursor.graphemeIndex;
        const line = doLayoutNextLine(prepared, cursor, availableWidth);
        if (!line) break;

        lines.push({ text: line.text.trimEnd(), y, indent });
        cursor = line.end;
        y += lineHeight;

        if (cursor.segmentIndex === prevSeg && cursor.graphemeIndex === prevGr) break;
      }

      return lines;
    }

    function projectLines(lines: Array<{ text: string; y: number; indent: number }>) {
      ensurePool(lines.length);
      for (let i = 0; i < lines.length; i++) {
        const el = linePool[i]!;
        const ld = lines[i]!;
        el.style.display = "block";
        if (el.textContent !== ld.text) el.textContent = ld.text;
        el.style.transform = `translate(${ld.indent}px, ${ld.y}px)`;
        el.style.opacity = "1";
      }
      const h = lines.length * lineHeight;
      if (h > 0) container.style.height = `${Math.max(h, baseHeight)}px`;
    }

    // ── Initial layout (no obstacles) ──
    const initialLines = layoutText(null);
    baseHeight = initialLines.length * lineHeight;
    projectLines(initialLines);

    // ── Reveal animation ──
    for (let i = 0; i < linePool.length; i++) {
      linePool[i]!.style.opacity = "0";
      linePool[i]!.style.transition = "opacity 0.4s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
    }
    requestAnimationFrame(() => {
      const stagger = 80; // ms between each line
      for (let i = 0; i < initialLines.length; i++) {
        setTimeout(() => {
          if (linePool[i]) linePool[i]!.style.opacity = "1";
        }, i * stagger);
      }
    });

    // ── Interaction handlers ──
    function onPointerEnter() {
      cursorActive = true;
      orbEl.style.opacity = "0.15";
      startLoop();
    }

    function onPointerMove(e: PointerEvent) {
      const rect = container.getBoundingClientRect();
      cursorX = e.clientX - rect.left;
      cursorY = e.clientY - rect.top;

      // Update orb visual immediately (no RAF needed for position)
      orbEl.style.transform = `translate(${cursorX - cursorRadius}px, ${cursorY - cursorRadius}px)`;

      if (!cursorActive) {
        cursorActive = true;
        orbEl.style.opacity = "0.15";
        startLoop();
      }
    }

    function onPointerLeave() {
      cursorActive = false;
      orbEl.style.opacity = "0";
      // Reflow back to normal after a short delay for the visual fade
      setTimeout(() => {
        if (!cursorActive) {
          const lines = layoutText(null);
          projectLines(lines);
        }
      }, 300);
    }

    function startLoop() {
      if (rafId) return;
      loop();
    }

    function loop() {
      if (!cursorActive) {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(loop);

      // Build obstacle from cursor position
      const pad = 14;
      const obstacle: Obstacle = {
        x: cursorX - cursorRadius - pad,
        y: cursorY - cursorRadius - pad,
        width: (cursorRadius + pad) * 2,
        height: (cursorRadius + pad) * 2,
      };

      const lines = layoutText(obstacle);
      projectLines(lines);
    }

    container.style.cursor = "crosshair";
    container.addEventListener("pointerenter", onPointerEnter);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("pointerenter", onPointerEnter);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [ready, text, font, lineHeight, prepareWithSegments, layoutNextLine, cursorRadius, cursorColor]);

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
        position: "relative",
        overflow: "visible",
      }}
    />
  );
}
