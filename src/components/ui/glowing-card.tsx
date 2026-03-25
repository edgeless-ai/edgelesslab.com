import type { ReactNode } from "react";
import Link from "next/link";

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
    <div
      className={`group relative overflow-hidden rounded-2xl border p-8 transition-all duration-200 hover:scale-[1.01] ${className}`}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}10, transparent 40%)`,
        }}
      />
      {/* Top border glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}30, transparent)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );

  if (href) {
    const isInternal = href.startsWith("/");
    if (isInternal) {
      return <Link href={href}>{content}</Link>;
    }
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
