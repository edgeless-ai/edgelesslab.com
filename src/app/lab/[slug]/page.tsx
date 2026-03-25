import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { experiments } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";
import { ExperimentDetail } from "./experiment-detail";

const NOT_FOUND_METADATA: Metadata = {
  title: {
    absolute: "Not Found | Edgeless Labs",
  },
};

export function generateStaticParams() {
  return experiments.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);
  if (!experiment) return NOT_FOUND_METADATA;

  return createPageMetadata({
    title: `${experiment.title} Lab Experiment`,
    description: experiment.description,
    path: `/lab/${experiment.slug}`,
    keywords: [experiment.category, "lab experiments", "Edgeless Labs"],
  });
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);
  if (!experiment) notFound();
  return <ExperimentDetail experiment={experiment} />;
}
