import { notFound } from "next/navigation";
import { projects } from "@/lib/data";
import { ProjectDetail } from "./project-detail";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const project = projects.find((p) => p.slug === slug);
    if (!project) return { title: "Not Found - Edgeless Labs" };
    return {
      title: `${project.title} - Edgeless Labs`,
      description: project.description,
    };
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
