"use client";

import dynamic from "next/dynamic";
import {
  homepageProjects,
  homepageExperiments,
  homepageStackNodes,
  homepageCapabilities,
} from "@/lib/homepage-data";

const RecentActivity = dynamic(
  () => import("@/components/sections/recent-activity-section").then((m) => m.RecentActivity),
  { ssr: false, loading: () => null }
);

const ProjectShowcaseSection = dynamic(
  () => import("@/components/sections/project-showcase-section").then((m) => m.default),
  { ssr: false, loading: () => null }
);

const TechShowcaseSection = dynamic(
  () => import("@/components/sections/tech-showcase-section").then((m) => m.default),
  { ssr: false, loading: () => null }
);

const CTASection = dynamic(
  () => import("@/components/sections/cta-section").then((m) => m.default),
  { ssr: false, loading: () => null }
);

const SubscribeSection = dynamic(
  () => import("@/components/sections/subscribe-section").then((m) => m.SubscribeSection),
  { ssr: false, loading: () => null }
);

const ScrollReveal = dynamic(
  () => import("@/components/ui/scroll-reveal").then((m) => m.ScrollReveal),
  { ssr: false, loading: () => null }
);

const featured = homepageProjects;
const capabilities = homepageCapabilities;
const homepageExperimentsList = homepageExperiments;
const stackNodes = homepageStackNodes;

export function BelowTheFold() {
  return (
    <>
      {/* Recent Activity */}
      <section className="px-6 py-16 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="max-w-[920px] mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>
              Recent activity
            </h2>
          </div>
          <RecentActivity />
        </div>
      </section>

      {/* Featured Projects */}
      <section className="px-6 py-20">
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-10" style={{ color: "var(--text-tertiary)" }}>
              Featured
            </h2>
            <ProjectShowcaseSection projects={featured} capabilities={capabilities} />
          </div>
        </ScrollReveal>
      </section>

      {/* Stack */}
      <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-10" style={{ color: "var(--text-tertiary)" }}>
              Stack
            </h2>
            <TechShowcaseSection nodes={stackNodes} experiments={homepageExperimentsList} />
          </div>
        </ScrollReveal>
      </section>

      {/* Products */}
      <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
        <ScrollReveal>
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-sm font-mono uppercase tracking-[0.15em] mb-10" style={{ color: "var(--text-tertiary)" }}>
              Products
            </h2>
            <CTASection />
          </div>
        </ScrollReveal>
      </section>

      {/* Subscribe */}
      <SubscribeSection />
    </>
  );
}
