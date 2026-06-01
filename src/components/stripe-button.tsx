"use client";

import { trackCTA, trackPurchase } from "@/lib/analytics";
import { ArrowUpRight } from "lucide-react";

interface StripeButtonProps {
  href: string;
  price: string;
  productName: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  icon?: boolean;
}

export function StripeButton({
  href,
  price,
  productName,
  children,
  className,
  style,
  icon = true,
}: StripeButtonProps) {
  const isFree = price === "Free";
  const label = isFree ? "Get it free" : `Buy now \u2014 ${price}`;

  const handleClick = () => {
    trackCTA("stripe_checkout", href);
    trackPurchase(productName, price);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "flex items-center gap-1 text-sm font-medium hover:text-white transition-colors mt-auto pt-2"
      }
      style={style ?? { color: "var(--text-secondary)" }}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      {children ?? label}
      {icon && <ArrowUpRight size={14} />}
    </a>
  );
}
