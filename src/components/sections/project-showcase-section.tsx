"use client";

import dynamic from "next/dynamic";

interface ProjectShowcaseProps {
  projects: Array<{
    title: string;
    description: string;
    tags: string[];
    snippet: string;
    href: string;
    span: string;
  }>;
  capabilities: Array<{
    label: string;
    snippet: string;
  }>;
}

const ProjectShowcase = dynamic(
  () =>
    import("@/components/home-client").then((m) => {
      const Component: React.FC<ProjectShowcaseProps> = ({
        projects,
        capabilities,
      }) => (
        <>
          <m.FeaturedGrid projects={projects} />
          <m.CapabilitiesGrid capabilities={capabilities} />
        </>
      );
      return { default: Component };
    }),
  { ssr: false }
);

export default ProjectShowcase;
