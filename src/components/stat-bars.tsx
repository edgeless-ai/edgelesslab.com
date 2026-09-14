"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

export type Stat = {
  /** Big number, e.g. "98" or "12+". */
  value: string;
  /** Mono caption under the bar. */
  label: string;
  /** Bar height as a fraction of the track, 0..1. */
  ratio: number;
  tone?: "accent" | "malachite" | "ink" | "oxide";
};

type StatBarsProps = {
  stats: Stat[];
  /** "paper" retones the tracks/labels for a warm field-sheet ground. */
  surface?: "dark" | "paper";
  className?: string;
};

const TONE_VAR: Record<NonNullable<Stat["tone"]>, string> = {
  accent: "var(--accent)",
  malachite: "var(--malachite)",
  ink: "var(--ink)",
  oxide: "var(--oxide)",
};

/**
 * Vertical bar chart with diagonal-hatch fills. Each fill's final height is set
 * in CSS (so the resting state is always correct); it grows via a CSS scaleY
 * transition toggled when the chart scrolls into view. Reduced-motion shows the
 * final state immediately.
 */
export function StatBars({ stats, surface = "dark", className }: StatBarsProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <div
      ref={ref}
      className={`stat-bars${visible ? " is-visible" : ""}${surface === "paper" ? " stat-bars--paper" : ""}${className ? ` ${className}` : ""}`}
    >
      {stats.map((stat, index) => {
        const color = TONE_VAR[stat.tone ?? "accent"];
        const height = `${Math.max(6, Math.min(100, stat.ratio * 100))}%`;
        return (
          <div key={stat.label} className="stat-bars__col">
            <div className="stat-bars__value">{stat.value}</div>
            <div className="stat-bars__track">
              <div
                className="stat-bars__fill"
                style={{
                  height,
                  transitionDelay: `${index * 0.08}s`,
                  ["--hatch" as string]: color,
                }}
              />
            </div>
            <div className="stat-bars__label lab-metadata">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
