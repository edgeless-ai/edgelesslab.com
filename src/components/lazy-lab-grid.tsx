"use client";

import dynamic from "next/dynamic";

const LabGrid = dynamic(() => import("@/components/lab-grid").then(m => m.LabGrid), { ssr: false });

export function LazyLabGrid({ experiments }: { experiments: any[] }) {
  return <LabGrid experiments={experiments} />;
}
