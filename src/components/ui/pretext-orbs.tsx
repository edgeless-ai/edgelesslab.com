"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { usePreText } from "@/hooks/use-pretext";

/**
 * Animated orbs that text reflows around in real time.
 *
 * Inspired by chenglou.me/pretext/editorial-engine/ --
 * Orbs bounce and collide with physics. Text reflows every frame
 * around circular obstacles using layoutNextLine with width budgets.
 * Zero DOM reads in the render loop.
 */

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  dragging: boolean;
}

interface PreTextOrbsProps {
  text: string;
  font?: string;
  lineHeight?: number;
  orbCount?: number;
  orbRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  textColor?: string;
}

export function PreTextOrbs({
  text,
  font = '300 14px "Geist"',
  lineHeight = 24,
  orbCount = 3,
  orbRadius = 40,
  className,
  style,
  textColor = "var(--text-secondary)",
}: PreTextOrbsProps) {
  const { ready, prepareWithSegments, layoutNextLine } = usePreText("Geist");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const animRef = useRef<number>(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragOrbRef = useRef<number>(-1);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Initialize orbs
  useEffect(() => {
    if (containerSize.width === 0) return;
    const w = containerSize.width;
    const h = containerSize.height || 300;

    const colors = [
      "rgba(129,140,248,0.12)", // accent
      "rgba(34,197,94,0.10)",   // green
      "rgba(129,140,248,0.08)", // lighter accent
    ];

    orbsRef.current = Array.from({ length: orbCount }, (_, i) => ({
      x: w * (0.25 + Math.random() * 0.5),
      y: h * (0.25 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      radius: orbRadius + Math.random() * 15,
      color: colors[i % colors.length],
      dragging: false,
    }));
  }, [containerSize.width, containerSize.height, orbCount, orbRadius]);

  // Observe container width only -- height is fixed
  const FIXED_HEIGHT = 280;
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height: FIXED_HEIGHT });
      }
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [ready]);

  // Physics + render loop
  useEffect(() => {
    if (!ready || !prepareWithSegments || !layoutNextLine) return;
    if (containerSize.width === 0) return;

    const prepared = prepareWithSegments(text, font);
    if (!prepared) return;

    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    if (!canvas || !textLayer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = containerSize.width;
    const dpr = window.devicePixelRatio || 1;

    const tick = () => {
      const orbs = orbsRef.current;

      // Physics: bounce off walls, collide with each other
      for (const orb of orbs) {
        if (orb.dragging) continue;

        orb.x += orb.vx;
        orb.y += orb.vy;

        // Wall bounce
        if (orb.x - orb.radius < 0) { orb.x = orb.radius; orb.vx *= -0.8; }
        if (orb.x + orb.radius > w) { orb.x = w - orb.radius; orb.vx *= -0.8; }
        if (orb.y - orb.radius < 0) { orb.y = orb.radius; orb.vy *= -0.8; }

        // Slow drift
        orb.vx *= 0.999;
        orb.vy *= 0.999;

        // Minimum velocity
        const speed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
        if (speed < 0.3) {
          orb.vx += (Math.random() - 0.5) * 0.2;
          orb.vy += (Math.random() - 0.5) * 0.2;
        }
      }

      // Orb-orb collision
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const a = orbs[i], b = orbs[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            const overlap = (minDist - dist) / 2;
            if (!a.dragging) { a.x -= nx * overlap; a.y -= ny * overlap; }
            if (!b.dragging) { b.x += nx * overlap; b.y += ny * overlap; }
            // Swap velocities along collision normal
            const relV = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (!a.dragging) { a.vx += relV * nx * 0.5; a.vy += relV * ny * 0.5; }
            if (!b.dragging) { b.vx -= relV * nx * 0.5; b.vy -= relV * ny * 0.5; }
          }
        }
      }

      // --- Text layout around orbs ---
      // Use layoutNextLine with obstacle-aware width budgets
      const lines: Array<{ x: number; y: number; text: string }> = [];
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      const padding = 8;
      const maxSegIdx = prepared.segments.length;
      let safetyLimit = 200;

      while ((cursor.segmentIndex < maxSegIdx || cursor.graphemeIndex > 0) && y < FIXED_HEIGHT && safetyLimit-- > 0) {
        let availStart = 0;
        let availWidth = w;

        for (const orb of orbs) {
          const orbTop = orb.y - orb.radius;
          const orbBottom = orb.y + orb.radius;

          if (y + lineHeight > orbTop && y < orbBottom) {
            const dy = y + lineHeight / 2 - orb.y;
            const halfChord = Math.sqrt(Math.max(0, orb.radius * orb.radius - dy * dy));
            const orbLeft = orb.x - halfChord - padding;
            const orbRight = orb.x + halfChord + padding;

            const leftSpace = Math.max(0, orbLeft);
            const rightSpace = Math.max(0, w - orbRight);

            if (leftSpace >= rightSpace && leftSpace > 60) {
              availWidth = leftSpace;
              availStart = 0;
            } else if (rightSpace > 60) {
              availStart = orbRight;
              availWidth = rightSpace;
            } else {
              y += lineHeight;
              continue;
            }
          }
        }

        if (availWidth < 40) {
          y += lineHeight;
          continue;
        }

        const result = layoutNextLine(prepared, cursor, availWidth);
        if (!result) break;

        // Check if cursor advanced
        if (result.end.segmentIndex === cursor.segmentIndex && result.end.graphemeIndex === cursor.graphemeIndex) {
          break;
        }

        if (result.text.trim()) {
          lines.push({ x: availStart, y, text: result.text });
        }

        cursor = result.end;
        y += lineHeight;
      }

      const totalHeight = FIXED_HEIGHT;

      // --- Render orbs on canvas ---
      canvas.width = w * dpr;
      canvas.height = totalHeight * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${totalHeight}px`;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, totalHeight);

      for (const orb of orbs) {
        // Glow
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, orb.color.replace(/[\d.]+\)$/, "0.15)"));
        grad.addColorStop(0.7, orb.color);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.strokeStyle = orb.color.replace(/[\d.]+\)$/, "0.3)");
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // --- Render text as DOM ---
      textLayer.innerHTML = "";
      textLayer.style.height = `${totalHeight}px`;
      for (const line of lines) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${line.x}px`;
        div.style.top = `${line.y}px`;
        div.style.font = font;
        div.style.color = textColor;
        div.style.whiteSpace = "nowrap";
        div.style.lineHeight = `${lineHeight}px`;
        div.textContent = line.text;
        textLayer.appendChild(div);
      }

      // Bottom bound for orbs
      for (const orb of orbs) {
        if (orb.y + orb.radius > FIXED_HEIGHT - 10) {
          orb.y = FIXED_HEIGHT - orb.radius - 10;
          orb.vy *= -0.8;
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [ready, prepareWithSegments, layoutNextLine, containerSize.width, text, font, lineHeight, textColor]);

  // Drag handling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < orbsRef.current.length; i++) {
      const orb = orbsRef.current[i];
      const dx = mx - orb.x, dy = my - orb.y;
      if (dx * dx + dy * dy < orb.radius * orb.radius) {
        dragOrbRef.current = i;
        dragOffsetRef.current = { x: dx, y: dy };
        orb.dragging = true;
        orb.vx = 0;
        orb.vy = 0;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragOrbRef.current < 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const orb = orbsRef.current[dragOrbRef.current];
    if (!orb) return;
    orb.x = e.clientX - rect.left - dragOffsetRef.current.x;
    orb.y = e.clientY - rect.top - dragOffsetRef.current.y;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragOrbRef.current >= 0) {
      const orb = orbsRef.current[dragOrbRef.current];
      if (orb) orb.dragging = false;
    }
    dragOrbRef.current = -1;
  }, []);

  // SSR fallback
  if (!ready) {
    return (
      <div className={className} style={style}>
        <p style={{ color: textColor, font, lineHeight: `${lineHeight}px` }}>{text}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, position: "relative", height: FIXED_HEIGHT, overflow: "hidden", cursor: "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }}
      />
      <div
        ref={textLayerRef}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 1, pointerEvents: "none" }}
      />
    </div>
  );
}
