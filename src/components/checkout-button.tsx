"use client";

import { ArrowUpRight } from "lucide-react";
import { trackPurchaseInitiated } from "@/lib/analytics";

interface CheckoutButtonProps {
  gumroadId?: string;
  href: string;
  price: string;
  priceCents?: number;
  productName: string;
  label?: string;
  variant?: "primary" | "secondary";
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Checkout button that opens Gumroad overlay when `gumroadId` is provided,
 * otherwise falls back to an external link.
 *
 * Tracks `purchase_initiated` in PostHog for funnel analysis.
 */
export function CheckoutButton({
  gumroadId,
  href,
  price,
  priceCents,
  productName,
  label,
  variant = "primary",
  onClick,
}: CheckoutButtonProps) {
  const isFree = price === "Free";
  const displayLabel = label ?? (isFree ? "Get it free" : `Buy now — ${price}`);
  const gumroadUrl = gumroadId
    ? `https://edgelessai.gumroad.com/l/${gumroadId}?wanted=true`
    : null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackPurchaseInitiated(productName, priceCents ?? 0, "gumroad");
    onClick?.(e);
  };

  const isPrimary = variant === "primary";

  return (
    <a
      href={gumroadUrl ?? href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        isPrimary
          ? "inline-flex items-center gap-2 px-5 py-3 rounded-md font-medium transition-colors hover:opacity-90"
          : "inline-flex items-center gap-1 text-sm font-medium hover:text-white transition-colors mt-auto pt-2"
      }
      style={
        isPrimary
          ? { background: "var(--accent)", color: "var(--bg-base)" }
          : { color: "var(--text-secondary)" }
      }
      onClick={handleClick}
    >
      {displayLabel}
      <ArrowUpRight size={16} />
    </a>
  );
}
