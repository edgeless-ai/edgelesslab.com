import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";
import { ProjectDetail } from "./project-detail";

const NOT_FOUND_METADATA: Metadata = {
  title: {
    absolute: "Not Found | Edgeless Labs",
  },
};

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return NOT_FOUND_METADATA;

  return createPageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${project.slug}`,
    keywords: [...project.tags, project.category, "Edgeless Labs"],
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
