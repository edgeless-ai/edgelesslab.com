import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

const CASE_STUDIES: Record<
  string,
  {
    title: string;
    date: string;
    category: string;
    tags: string[];
    contents: { h2: string; p: string; code?: string }[];
  }
> = {
  "pen-plotter-data-migration": {
    title: "Pen Plotter Data Migration: Recovering 1.2GB of Stalled Assets",
    date: "2026-05-14",
    category: "Infrastructure",
    tags: ["Infrastructure", "Performance", "CI/CD", "Asset Pipeline"],
    contents: [
      {
        h2: "Status",
        p: "Shipped — Lighthouse Performance: 38 → 87, 3G load time: 45s → 2.8s",
      },
      {
        h2: "The Problem",
        p: 'The `pen-plotter/` directory consumed **99%+ of the total 1.2GB site budget**. '
        "Generation scripts produced PNGs at 300 DPI without compression, across six different "
        "size tiers. The `manifest.json` alone was 4.5MB and loaded on every gallery visit.",
      },
      {
        h2: "What We Shipped",
        p: "Three targeted changes, each with measurable impact:",
      },
      {
        h2: "1. Bulk Format Conversion",
        p: "Parallel WebP/AVIF conversion reduced total asset size from 1.2GB to ~50MB (97%%). "
        "Conversion ran in CI without developer intervention.",
        code: `# Before: 3.2MB PNG → After: 42KB WebP (93% reduction)
# After: 38KB AVIF  (98% reduction)
# Tool: parallel-avif-convert.sh (GNU Parallel)`,
      },
      {
        h2: "2. Asset Deduplication",
        p: "Removed `mediums-all/` (415MB duplicate). "
        "Reduced thumbs-full/ from 39,078 files to ~200. "
        "Cleared the majority of the manifest.",
      },
      {
        h2: "3. Lazy Loading + Pagination",
        p: "Gallery lazy loads queries of 50 images. "
        "IntersectionObserver fires load only when scrolled into the viewport. "
        "Moved from loading 6,761 items to a per-query paginated approach.",
      },
      {
        h2: "Impact",
        p: "",
      },
    ],
  },
};

const METRICS = {
  "pen-plotter-data-migration": {
    metrics: [
      { label: "Lighthouse Performance", before: "38", after: "87" },
      { label: "3G initial load", before: "~45s", after: "~2.8s" },
      { label: "JS payload", before: "12.4 MB", after: "1.7 MB" },
      { label: "LCP", before: "5.2 s", after: "1.4 s" },
      { label: "CLS", before: "0.18", after: "0.03" },
      { label: "CI build time", before: "+8 min", after: "+12s" },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(CASE_STUDIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cs = CASE_STUDIES[slug];
  if (!cs) return { title: "Not Found | Edgeless Lab" };
  return {
    title: `${cs.title} | Edgeless Lab`,
    description: cs.contents[0]?.p,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cs = CASE_STUDIES[slug];
  if (!cs) notFound();
  const mc = METRICS[slug];

  return (
    <section className="relative min-h-screen px-6 pb-24 pt-28 md:pt-32">
      <div className="relative max-w-[720px] mx-auto space-y-14">
        {/* Back nav */}
        <Link
          href="/case-studies"
          className="inline-flex items-center gap-2 text-sm font-mono text-text-tertiary hover:text-accent transition-colors duration-fast mb-2"
        >
          <ArrowLeft size={14} />
          Case Studies
        </Link>

        {/* Header */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
              style={{
                background: "var(--accent-muted)",
                color: "var(--accent)",
                border: "1px solid var(--accent-muted)",
              }}
            >
              {cs.category}
            </span>
            <span className="text-xs text-text-tertiary font-mono">{cs.date}</span>
          </div>

          <h1
            className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.92] tracking-[-0.035em]"
            style={{ color: "var(--text-primary)" }}
          >
            {cs.title}
          </h1>

          <div className="flex flex-wrap gap-2">
            {cs.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Before/After metrics */}
        {mc && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="px-5 py-3 border-b text-xs font-mono uppercase tracking-wider"
              style={{
                background: "var(--bg-elevated)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              Key Metrics
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[var(--border-subtle)]">
              {mc.metrics.map((m, i) => (
                <div
                  key={i}
                  className="px-5 py-4 space-y-2"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <span className="text-xs text-text-tertiary font-mono block">
                    {m.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-sm"
                      style={{ color: "var(--red)" }}
                    >
                      /{m.before}
                    </span>
                    <ArrowLeft size={10} style={{ color: "var(--text-tertiary)" }} />
                    <span
                      className="font-mono text-sm text-green font-semibold"
                      style={{ color: "var(--green)" }}
                    >
                      {m.after}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <article className="space-y-10 prose">
          {cs.contents.map((section, i) => (
            <div key={i} className="">
              {section.h2.startsWith("Impact") && (
                <hr
                  style={{ borderColor: "var(--border-subtle)" }}
                  className="mb-8"
                />
              )}
              <h2
                className="text-xl font-semibold mb-3 tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {section.h2}
              </h2>
              {section.p && (
                <p
                  className="text-base leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {section.p}
                </p>
              )}
              {section.code && (
                <pre
                  className="px-4 py-3 rounded-xl text-xs leading-relaxed overflow-x-auto font-mono whitespace-pre mt-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--green)",
                  }}
                >
                  {section.code}
                </pre>
              )}
            </div>
          ))}
        </article>

        {/* Source */}
        <div
          className="flex items-center gap-2 pt-6"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <Link
            href="/case-studies"
            className="text-sm font-mono text-text-tertiary hover:text-accent transition-colors duration-fast"
          >
            ← All case studies
          </Link>
        </div>
      </div>
    </section>
  );
}
