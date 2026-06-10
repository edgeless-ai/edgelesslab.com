import Link from 'next/link';

interface Node {
  label: string;
  sublabel: string;
  color: string;
}

interface Experiment {
  title: string;
  category: string;
  href?: string;
  external?: boolean;
  description: string;
  stack: string[];
  status: string;
}

export default function TechShowcase({ nodes, experiments }: { nodes: Node[]; experiments: Experiment[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Stack
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nodes.map((node) => (
            <div
              key={node.label}
              className="p-4 rounded-xl border"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {node.label}
              </div>
              <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {node.sublabel}
              </div>
              <div className="mt-2 h-1 rounded-full" style={{ background: node.color }} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Experiments
        </div>
        <div className="grid grid-cols-1 gap-3">
          {experiments.map((exp) => (
            <Link
              key={exp.title}
              href={exp.href ?? `/lab/${exp.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="block p-4 rounded-xl border transition-colors hover:border-[var(--border-focus)]"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {exp.title}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                  {exp.category}
                </span>
              </div>
              <p className="text-[12px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                {exp.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {exp.stack?.slice(0, 3).map((tech) => (
                  <span
                    key={tech}
                    className="text-[11px] px-2 py-1 rounded-full border"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
