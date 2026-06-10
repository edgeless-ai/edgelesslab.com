"use client";

import type { CSSProperties, ReactNode } from "react";
import { trackCTA } from "@/lib/analytics";

const INGEST_URL = process.env.NEXT_PUBLIC_INGEST_URL || "/ingest";

type ServiceCtaLinkProps = {
  href: string;
  name: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

function sendIntent(name: string, href: string) {
  if (typeof navigator === "undefined") return;
  const ingestUrl = `${INGEST_URL}?e=service_cta_clicked`;
  const payload = JSON.stringify({
    cta_name: name,
    destination: href,
    page_url: window.location.href,
    path: window.location.pathname,
    ts: new Date().toISOString(),
  });

  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(ingestUrl, payload);
  } else {
    fetch(ingestUrl, {
      method: "POST",
      body: payload,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  }
}

export function ServiceCtaLink({
  href,
  name,
  className,
  style,
  children,
}: ServiceCtaLinkProps) {
  function handleClick() {
    sendIntent(name, href);
    trackCTA(name, href);
  }

  return (
    <a href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </a>
  );
}
