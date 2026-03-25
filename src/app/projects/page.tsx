import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectsHeader, ProjectsGrid } from "@/components/projects-client";
import { projects } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Projects in Production",
  description: "Agents, APIs, and pipelines built in the open. Every project runs in production.",
  path: "/projects",
  keywords: ["AI agent projects", "MCP servers", "developer tools", "production systems"],
});

export default function ProjectsPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      {/* Page header */}
      <section className="relative px-6 pt-40 pb-16">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute top-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-20 blur-[140px]"
            style={{ background: "var(--accent)" }}
          />
        </div>

        <div className="relative max-w-[1280px] mx-auto">
          <ProjectsHeader />
        </div>
      </section>

      <div
        className="mx-6 max-w-[1280px] lg:mx-auto border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      />

      {/* Projects grid */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1280px] mx-auto">
          <ProjectsGrid projects={projects} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
