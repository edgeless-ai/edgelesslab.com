import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ProjectsHeader, ProjectsGrid } from "@/components/projects-client";
import { projects } from "@/lib/data";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Systems",
  description: "Production systems and case studies from Edgeless Lab: constraints, implementations, failures, and outcomes.",
  path: "/projects",
  keywords: ["AI agent projects", "MCP servers", "developer tools", "production systems"],
});

export default function ProjectsPage() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content">
      <section className="relative px-6 pb-16 pt-36 sm:pb-20 sm:pt-44">
        <div className="relative mx-auto max-w-[1280px]">
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
      </main>

      <Footer />
    </div>
  );
}
