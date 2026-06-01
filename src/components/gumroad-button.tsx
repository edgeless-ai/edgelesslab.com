"use client";

import Script from "next/script";
import { trackCTA, trackPurchase } from "@/lib/analytics";
import { ArrowUpRight } from "lucide-react";

interface GumroadButtonProps {
  href: string;
  price: string;
  productName: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  icon?: boolean;
}

export function GumroadButton({
  href,
  price,
  productName,
  children,
  className,
  style,
  icon = true,
}: GumroadButtonProps) {
  const isFree = price === "Free";
  const label = isFree ? "Get it free" : `Buy now — ${price}`;

  const handleClick = () => {
    trackCTA("gumroad_checkout", href);
    trackPurchase(productName, price);
  };

  return (
    <>
      <Script
        src="https://gumroad.com/js/gumroad.js"
        strategy="lazyOnload"
      />
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
    </>
  );
}
