"use client";

import Script from "next/script";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { trackOutboundLink, trackPurchaseInitiated } from "@/lib/analytics";

function parsePriceCents(price: string): number {
  const normalized = price.trim().toLowerCase();
  if (normalized === "free") return 0;
  const num = Number(price.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

/**
 * Loads Gumroad's overlay script exactly where it is used.
 * Keep it off pages that don't need checkout to avoid performance regressions.
 */
export function GumroadScript() {
  return (
    <Script
      src="https://gumroad.com/js/gumroad.js"
      strategy="lazyOnload"
    />
  );
}

export function GumroadOverlayLink({
  href,
  productName,
  price,
  provider = "gumroad",
  className,
  style,
  children,
  stopPropagation,
}: {
  href: string;
  productName: string;
  price: string;
  provider?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  stopPropagation?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // Gumroad overlay triggers on this attribute (see Gumroad widgets docs)
      data-gumroad-overlay-checkout
      className={className}
      style={style}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        trackPurchaseInitiated(productName, parsePriceCents(price), provider);
        trackOutboundLink(href, `gumroad:${productName}`);
      }}
    >
      {children}
    </a>
  );
}

export function GumroadBuyCTA({
  href,
  productName,
  price,
  label,
  stopPropagation,
}: {
  href: string;
  productName: string;
  price: string;
  label: string;
  stopPropagation?: boolean;
}) {
  return (
    <GumroadOverlayLink
      href={href}
      productName={productName}
      price={price}
      stopPropagation={stopPropagation}
      className="inline-flex items-center gap-1 text-sm font-medium hover:text-white transition-colors"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
      <ArrowUpRight size={14} />
    </GumroadOverlayLink>
  );
}
