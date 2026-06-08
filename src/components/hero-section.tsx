"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { trackCTA } from "@/lib/analytics";
import { useDeferredMount } from "@/hooks/use-deferred-mount";

const GenerativeHeroBackground = dynamic(
  () => import("@/components/ui/generative-hero-bg").then(m => m.GenerativeHeroBackground),
  { ssr: false, loading: () => null }
);

const GenerativeAscii = dynamic(
  () => import("@/components/generative-ascii").then(m => m.GenerativeAscii),
  { ssr: false, loading: () => null }
);

const KineticPreText = dynamic(
  () => import("@/components/ui/kinetic-pretext").then(m => m.KineticPreText),
  { ssr: false }
);

const HERO_SUBTITLE =
  "One developer shipping autonomous agents, MCP servers, and generative art. 5 free lead magnets, 17 premium toolkits. Everything open source.";

export function HeroSection() {
  const deferredAscii = useDeferredMount(2000);
  const deferredKinetic = useDeferredMount(2000);
  return (
    <section className="relative flex min-h-[92svh] items-center px-6 pb-16 pt-28 md:min-h-screen md:items-end md:pb-24 md:pt-32">
      <GenerativeHeroBackground />
      <div className="relative max-w-[1280px] w-full mx-auto grid grid-cols-1 gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        {/* Left column: headline + supporting copy */}
        <div className="min-w-0">
          <div className="animate-fade-in-up">
            <div
              className="inline-flex items-center gap-2.5 mb-8 px-3 py-1.5 rounded-full border"
              style={{
                borderColor: "rgba(52, 211, 153, 0.25)",
                background: "rgba(52, 211, 153, 0.06)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
                  style={{ background: "var(--green)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "var(--green)" }}
                />
              </span>
              <span
                className="text-[11px] font-mono uppercase tracking-[0.14em]"
                style={{ color: "var(--green)" }}
              >
                Shipping daily &middot; Live now
              </span>
            </div>
          </div>

          <h1
            className="text-[clamp(3rem,8vw,7.5rem)] font-bold leading-[0.88] tracking-[-0.04em]"
            style={{ color: "var(--text-primary)" }}
          >
            <span className="inline-block">Built solo</span>
            <br />
            <span style={{ color: "var(--accent)" }}>
              <span className="inline-block animate-char-reveal">Shipped</span>
            </span>{" "}
            <span className="inline-block animate-char-reveal" style={{ animationDelay: "0.45s" }}>open</span>
          </h1>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <div className="mt-8 max-w-xl">
              {deferredKinetic ? (
                <KineticPreText
                  text={HERO_SUBTITLE}
                  font='300 18px "Geist"'
                  lineHeight={28}
                  cursorRadius={36}
                  cursorColor="var(--accent)"
                  className="text-lg font-light"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
                />
              ) : (
                <p className="text-lg font-light" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {HERO_SUBTITLE}
                </p>
              )}
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.85s" }}>
            <div
              className="mt-8 flex items-center gap-2.5 max-w-xl text-[12px] font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span
                className="px-2 py-0.5 rounded uppercase tracking-[0.12em]"
                style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
              >
                Now
              </span>
              <span>
                Shipping{" "}
                <Link
                  href="/products/launch-toolkit"
                  className="underline-offset-2 hover:underline transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Digital Product Launch Toolkit
                </Link>
                {" "}&middot; 7 products in 7 days
              </span>
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium text-white rounded-full transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{ background: "var(--accent)" }}
                onClick={() => trackCTA("hero_view_products", "/products")}
              >
                Free products <ArrowRight size={15} />
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 h-11 px-6 text-sm font-medium rounded-full border transition-all hover:brightness-110 hover:scale-[1.02]"
                style={{
                  color: "var(--text-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
                onClick={() => trackCTA("hero_view_projects", "/projects")}
              >
                See what&rsquo;s running <ArrowRight size={15} />
              </Link>
              <a
                href="https://github.com/edgeless-ai"
                className="text-sm font-medium flex items-center gap-1.5 transition-colors hover:text-white"
                style={{ color: "var(--text-secondary)" }}
              >
                GitHub <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Right column: generative ASCII art piece — unique each visit, deferred */}
        <div className="animate-fade-in-up lg:min-h-[600px]" style={{ animationDelay: "0.5s" }}>
          <div className="hidden lg:block">
            {deferredAscii && <GenerativeAscii />}
          </div>
        </div>
      </div>
    </section>
  );
}
