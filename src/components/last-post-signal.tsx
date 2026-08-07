'use client';

import { lastPostAge } from "@/lib/now-signals";

export function LastPostSignal() {
  return <span>{lastPostAge("Last blog post")}</span>;
}
