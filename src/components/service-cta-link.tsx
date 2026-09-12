"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackServiceCTA } from "@/lib/analytics";

type ServiceCtaLinkProps = {
  href: string;
  name: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function ServiceCtaLink({
  href,
  name,
  className,
  style,
  children,
}: ServiceCtaLinkProps) {
  function handleClick() {
    trackServiceCTA(name, href);
  }

  return (
    <a href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </a>
  );
}
