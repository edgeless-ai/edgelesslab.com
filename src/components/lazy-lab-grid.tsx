"use client";

import dynamic from "next/dynamic";
import type { Experiment } from "@/components/lab-grid";

const LabGrid = dynamic(() => import("@/components/lab-grid").then(m => m.LabGrid), { ssr: false });

export function LazyLabGrid({ experiments }: { experiments: Experiment[] }) {
  return <LabGrid experiments={experiments} />;
}
