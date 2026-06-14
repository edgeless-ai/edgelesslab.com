"use client";

import type { CSSProperties, ReactNode } from "react";

interface KineticPreTextProps {
  text: string;
  font?: string;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
  cursorRadius?: number;
  cursorColor?: string;
}

/**
 * Lightweight subtitle renderer.
 *
 * Replaces the previous cursor-reactive PreText layout to cut main-thread
 * text measurement and animation overhead on the hero.
 */
export function KineticPreText({
  text,
  className,
  style,
  fallback,
}: KineticPreTextProps) {
  return (
    <div className={className} style={style}>
      {fallback ?? <p>{text}</p>}
    </div>
  );
}
