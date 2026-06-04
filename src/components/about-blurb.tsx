"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useShrinkWrap } from "@/hooks/use-shrink-wrap";

const ABOUT_TEXT =
  "One person shipping agents, MCP servers, generative art, and developer tools. In production, in the open, since day one. No pitch decks. No vaporware.";
const ABOUT_FONT = '300 28px "Geist"';
const ABOUT_LINE_HEIGHT = 42;

export function AboutBlurb() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  const balancedWidth = useShrinkWrap(ABOUT_TEXT, ABOUT_FONT, ABOUT_LINE_HEIGHT, containerWidth);

  return (
    <div className="max-w-2xl" ref={containerRef}>
      <p
        className="text-2xl sm:text-3xl font-light leading-[1.5]"
        style={{
          color: "var(--text-secondary)",
          animation: "fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both",
          ...(balancedWidth ? { maxWidth: `${balancedWidth}px` } : {}),
        }}
      >
        <span style={{ color: "var(--text-primary)" }}>One person</span> shipping
        agents, MCP servers, generative art, and developer tools. In production,
        in the open, since day one.{" "}
        <span style={{ color: "var(--text-primary)" }}>No pitch decks. No vaporware.</span>
      </p>
      <div
        className="mt-8"
        style={{ animation: "fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.2s both" }}
      >
        <Link
          href="/about"
          className="text-sm font-medium flex items-center gap-1.5 transition-colors hover:text-white"
          style={{ color: "var(--accent)" }}
        >
          About the lab <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
