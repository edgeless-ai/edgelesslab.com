import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  HeroSection,
  SubscribeSection,
} from "@/components/home-client";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Suspense } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { LazyAttractorPlayground } from "@/components/lazy-playground-wrapper";
import {
  RecentActivity,
  ProjectShowcaseSection,
  TechShowcaseSection,
  CTASection,
} from "./home-sections";

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-24 rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
      <div className="h-3 w-full rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
      <div className="h-3 w-5/6 rounded border" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} />
    </div>
  );
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[520px]">{children}</div>;
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <main id="main-content">
        {/* Hero */}
        <HeroSection />

        {/* Recent Activity (chronological stream) */}
        <SectionBlock>
          <section className="px-6 py-16 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="max-w-[920px] mx-auto">
              <div className="flex items-baseline justify-between mb-6">
                <h2
                  className="text-sm font-mono uppercase tracking-[0.15em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Recent activity
                </h2>
                <Link
                  href="/blog"
                  className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Full feed <ArrowRight size={13} />
                </Link>
              </div>

              <Suspense fallback={<SectionSkeleton />}>
                <RecentActivity />
              </Suspense>
            </div>
          </section>
        </SectionBlock>

        {/* Playground — embedded interactive generative art you can actually touch */}
        <SectionBlock>
          <section className="px-6 py-20 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="max-w-[1280px] mx-auto">
              <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>
                      Play with it
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[0.95]" style={{ color: "var(--text-primary)" }}>
                    Strange attractors, live
                  </h2>
                  <p className="mt-3 max-w-md text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Chaos you can steer. Change the system, drag the parameters, watch the structure reorganize in real time.
                  </p>
                </div>
                <Link
                  href="/creative"
                  className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  38 more experiments <ArrowRight size={13} />
                </Link>
              </div>
              <Suspense fallback={<SectionSkeleton />}>
                <LazyAttractorPlayground />
              </Suspense>
            </div>
          </section>
        </SectionBlock>

        {/* Featured Projects */}
        <SectionBlock>
          <section className="px-6 py-20">
            <ScrollReveal>
              <div className="max-w-[1280px] mx-auto">
                <div className="flex items-baseline justify-between mb-10">
                  <h2
                    className="text-sm font-mono uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Featured
                  </h2>
                  <Link
                    href="/projects"
                    className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    All projects <ArrowRight size={13} />
                  </Link>
                </div>

                <Suspense fallback={<SectionSkeleton />}>
                  <ProjectShowcaseSection />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Stack */}
        <SectionBlock>
          <section className="px-6 py-20" style={{ background: "var(--bg-base)" }}>
            <ScrollReveal>
              <div className="max-w-[1280px] mx-auto">
                <h2
                  className="text-sm font-mono uppercase tracking-[0.15em] mb-10"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Stack
                </h2>

                <Suspense fallback={<SectionSkeleton />}>
                  <TechShowcaseSection />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Products */}
        <SectionBlock>
          <section className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
            <ScrollReveal>
              <div className="max-w-[1280px] mx-auto">
                <div className="flex items-baseline justify-between mb-10">
                  <h2
                    className="text-sm font-mono uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Products
                  </h2>
                  <Link
                    href="/products"
                    className="text-sm flex items-center gap-1 transition-colors hover:text-white"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    All products <ArrowRight size={13} />
                  </Link>
                </div>

                <Suspense fallback={<SectionSkeleton />}>
                  <CTASection />
                </Suspense>
              </div>
            </ScrollReveal>
          </section>
        </SectionBlock>

        {/* Subscribe */}
        <SubscribeSection />
      </main>

      <Footer />
    </div>
  );
}
