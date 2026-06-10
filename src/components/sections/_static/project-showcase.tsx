import Link from 'next/link';

interface Project {
  title: string;
  description: string;
  tags: string[];
  snippet: string;
  href: string;
  span: string;
}

interface Capabilities {
  label: string;
  snippet: string;
}

export default function ProjectShowcase({ projects, capabilities }: { projects: Project[]; capabilities: Capabilities[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-[auto_auto]">
      {projects.map((project, i) => (
        <div key={project.title} className={project.span}>
          <div
            className="h-full p-6 rounded-xl border transition-colors hover:border-[var(--border-focus)]"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <Link href={project.href} className="block">
              <div
                style={{
                  animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s both`,
                }}
              >
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {project.title}
                </h3>
                <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-1 rounded-full border"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        </div>
      ))}
      <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {capabilities.map((cap) => (
          <div
            key={cap.label}
            className="p-4 rounded-xl border"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <div className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {cap.label}
            </div>
            <pre className="text-[12px] font-mono whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
              {cap.snippet}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
