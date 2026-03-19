"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  glowColor?: string;
}

export function GlowingCard({
  children,
  className = "",
  href,
  glowColor = "var(--accent)",
}: GlowingCardProps) {
  const content = (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl border p-8 transition-colors ${className}`}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Glow effect on hover */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}15, transparent 40%)`,
        }}
      />
      {/* Top border glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}40, transparent)`,
        }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}
