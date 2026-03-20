import { notFound } from "next/navigation";
import { experiments } from "@/lib/data";
import { ExperimentDetail } from "./experiment-detail";

export function generateStaticParams() {
  return experiments.map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const experiment = experiments.find((e) => e.slug === slug);
    if (!experiment) return { title: "Not Found - Edgeless Labs" };
    return {
      title: `${experiment.title} - Lab - Edgeless Labs`,
      description: experiment.description,
      openGraph: {
        title: `${experiment.title} - Lab - Edgeless Labs`,
        description: experiment.description,
        url: `https://edgelesslab.com/lab/${experiment.slug}`,
      },
      alternates: {
        canonical: `https://edgelesslab.com/lab/${experiment.slug}`,
      },
    };
  });
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);
  if (!experiment) notFound();
  return <ExperimentDetail experiment={experiment} />;
}
