"use client";

import { ArrowUpRight } from "lucide-react";
import { trackCTA } from "@/lib/analytics";
import { FREE_KIT_URL } from "@/lib/free-kit";

export function FreeKitButton() {
  return <a href={FREE_KIT_URL} onClick={() => trackCTA("free_kit_checkout", FREE_KIT_URL)} className="inline-flex min-h-12 items-center gap-3 border px-6 py-3 font-mono text-sm uppercase tracking-wider" style={{ color: "var(--green)", borderColor: "var(--green)", background: "rgba(52, 211, 153, 0.06)" }}>Get the free kit <ArrowUpRight size={16} aria-hidden="true" /></a>;
}
