"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { trackCTA } from "@/lib/analytics";
import { AnimatedText, AnimatedFadeIn } from "@/components/ui/animated-text";
import { GenerativeAscii } from "@/components/generative-ascii";
import { KineticPreText } from "@/components/ui/kinetic-pretext";

const HERO_SUBTITLE =
  "One developer shipping autonomous agents, MCP servers, and generative art. 18 products, all free. Everything open source.";

/**
 * SwarmParticle - Individual particle in the hero swarm effect
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  pulse: number;
}

function useSwarmParticles(count: number = 50) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 1 + Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.4,
      pulse: Math.random() * Math.PI * 2,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    let frame = 0;
    const animate = () => {
      frame++;
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      const mouse = mouseRef.current;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((p, i) => {
        // Gentle drift
        p.x += p.vx;
        p.y += p.vy;

        // Mouse attraction (subtle)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0) {
          p.vx += (dx / dist) * 0.01;
          p.vy += (dy / dist) * 0.01;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap around
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulse opacity
        p.pulse += 0.02;
        const pulseOpacity = p.opacity * (0.8 + 0.2 * Math.sin(p.pulse));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${pulseOpacity})`;
        ctx.fill();

        // Draw connections to nearby particles (every 3rd frame for performance)
        if (frame % 3 === 0 && i % 2 === 0) {
          particlesRef.current.slice(i + 1).forEach((p2) => {
            const dx2 = p.x - p2.x;
            const dy2 = p.y - p2.y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (dist2 < 100) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(129, 140, 248, ${0.1 * (1 - dist2 / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [count]);

  return canvasRef;
}

/**
 * FloatingSwarmIcon - Animated hexagon with swarm identity
 */
function FloatingSwarmIcon() {
  return (
    <div className="absolute -top-20 -right-20 w-96 h-96 opacity-30 pointer-events-none">
      <svg viewBox="0 0 400 400" className="w-full h-full animate-spin" style={{ animationDuration: "60s" }}>
        <defs>
          <linearGradient id="swarmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(129, 140, 248, 0.3)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.2)" />
            <stop offset="100%" stopColor="rgba(129, 140, 248, 0.1)" />
          </linearGradient>
        </defs>
        {/* Concentric hexagons */}
        {[180, 140, 100, 60].map((size, i) => (
          <polygon
            key={i}
            points={Array.from({ length: 6 }, (_, j) => {
              const angle = (Math.PI / 3) * j - Math.PI / 2;
              const x = 200 + size * Math.cos(angle);
              const y = 200 + size * Math.sin(angle);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="url(#swarmGrad)"
            strokeWidth={0.5 + i * 0.3}
            opacity={0.3 + i * 0.15}
            style={{
              animation: `pulse ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
        {/* Center dot cluster */}
        {Array.from({ length: 7 }, (_, i) => {
          const angle = (Math.PI * 2 * i) / 7;
          const r = 20;
          return (
            <circle
              key={i}
              cx={200 + r * Math.cos(angle)}
              cy={200 + r * Math.sin(angle)}
              r={3}
              fill="rgba(129, 140, 248, 0.6)"
              style={{
                animation: `pulse 2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * HeroSectionEnhanced - Stop-the-scroll hero with swarm motif
 */
export function HeroSectionEnhanced() {
  const swarmCanvasRef = useSwarmParticles(60);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Layer 1: Base gradient background */}
      <div className="absolute inset-0 hero-gradient opacity-60" />

      {/* Layer 2: Animated swarm particles */}
      <canvas
        ref={swarmCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ opacity: 0.8 }}
      />

      {/* Layer 3: Large decorative swarm icon */}
      <FloatingSwarmIcon />

      {/* Layer 4: Radial vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 100%, transparent 0%, var(--color-bg-base) 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-32 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-8 items-center">
          {/* Left: Text content */}
          <div className="space-y-8">
            {/* Status badge with enhanced animation */}
            <AnimatedFadeIn>
              <div
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border w-fit"
                style={{
                  borderColor: "rgba(52, 211, 153, 0.3)",
                  background: "linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(52, 211, 153, 0.05))",
                  boxShadow: "0 0 20px rgba(52, 211, 153, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ background: "var(--color-success)", animationDuration: "2s" }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--color-success)" }}
                  />
                </span>
                <span
                  className="text-xs font-mono uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-success)" }}
                >
                  Shipping daily
                </span>
                <span style={{ color: "var(--color-text-muted)" }}>·</span>
                <span style={{ color: "var(--color-text-tertiary)" }}>Live now</span>
              </div>
            </AnimatedFadeIn>

            {/* Main headline with dramatic sizing */}
            <div className="space-y-2">
              <h1
                className="text-[clamp(2.5rem,10vw,7rem)] font-bold leading-[0.9] tracking-[-0.04em]"
                style={{ color: "var(--color-text-primary)" }}
              >
                <AnimatedText text="Built" delay={0.1} />
                <span style={{ color: "var(--color-text-tertiary)" }}>
                  <AnimatedText text=" solo" delay={0.25} />
                </span>
                <br />
                <span
                  className="relative inline-block"
                  style={{
                    background: "linear-gradient(135deg, var(--color-accent-300), var(--color-accent-500))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  <AnimatedText text="Shipped" delay={0.4} />
                  {/* Glow effect behind text */}
                  <span
                    className="absolute -inset-4 blur-3xl opacity-30 -z-10"
                    style={{
                      background: "linear-gradient(135deg, var(--color-accent), var(--color-success))",
                    }}
                  />
                </span>{" "}
                <AnimatedText text="open" delay={0.55} />
              </h1>

              {/* ASCII signature line */}
              <div
                className="font-mono text-xs tracking-[0.2em] pt-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                <AnimatedText text="█████████████████████  SHIP · LEARN · REPEAT" delay={0.7} />
              </div>
            </div>

            {/* Kinetic subtitle */}
            <AnimatedFadeIn delay={0.8}>
              <div className="max-w-xl">
                <KineticPreText
                  text={HERO_SUBTITLE}
                  font='400 18px "Geist"'
                  lineHeight={28}
                  cursorRadius={40}
                  cursorColor="var(--color-accent)"
                  className="text-lg"
                  style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}
                  fallback={<p style={{ lineHeight: 1.6 }}>{HERO_SUBTITLE}</p>}
                />
              </div>
            </AnimatedFadeIn>

            {/* Now shipping badge */}
            <AnimatedFadeIn delay={0.95}>
              <div
                className="flex items-center gap-3 max-w-xl text-xs font-mono py-2 px-3 rounded-lg w-fit"
                style={{
                  background: "var(--color-accent-subtle)",
                  border: "1px solid var(--color-accent-muted)",
                }}
              >
                <span
                  className="px-2 py-0.5 rounded uppercase tracking-[0.12em] text-[10px]"
                  style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}
                >
                  Now
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  Shipping{" "}
                  <Link
                    href="/products/launch-toolkit"
                    className="underline-offset-2 hover:underline transition-colors hover:text-white"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    Digital Product Launch Toolkit
                  </Link>
                  {" "}· 7 products in 7 days
                </span>
              </div>
            </AnimatedFadeIn>

            {/* CTA buttons */}
            <AnimatedFadeIn delay={1.0}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                <Link
                  href="/products"
                  className="group inline-flex items-center gap-2 h-12 px-7 text-sm font-medium text-white rounded-full transition-all hover:scale-[1.02] relative overflow-hidden"
                  style={{ background: "var(--color-accent)" }}
                  onClick={() => trackCTA("hero_view_products", "/products")}
                >
                  <span className="relative z-10">18 free products</span>
                  <ArrowRight size={16} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(135deg, var(--color-accent-300), var(--color-accent-500))",
                    }}
                  />
                </Link>

                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 h-12 px-7 text-sm font-medium rounded-full border transition-all hover:scale-[1.02] hover:border-[var(--color-accent)]"
                  style={{
                    color: "var(--color-text-secondary)",
                    borderColor: "var(--color-border-subtle)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => trackCTA("hero_view_projects", "/projects")}
                >
                  See what&apos;s running
                  <ArrowRight size={16} />
                </Link>

                <a
                  href="https://github.com/edgeless-ai"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white px-3"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  GitHub
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </AnimatedFadeIn>

            {/* Stats row */}
            <AnimatedFadeIn delay={1.1}>
              <div className="flex items-center gap-8 pt-8 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div>
                  <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    18
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.1em]" style={{ color: "var(--color-text-tertiary)" }}>
                    Products
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    6
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.1em]" style={{ color: "var(--color-text-tertiary)" }}>
                    MCP Servers
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    75+
                  </div>
                  <div className="text-xs font-mono uppercase tracking-[0.1em]" style={{ color: "var(--color-text-tertiary)" }}>
                    AI Skills
                  </div>
                </div>
              </div>
            </AnimatedFadeIn>
          </div>

          {/* Right: Generative ASCII art */}
          <AnimatedFadeIn delay={0.5} className="hidden lg:block">
            <div className="relative">
              {/* Glow behind the card */}
              <div
                className="absolute -inset-8 blur-3xl opacity-40 -z-10"
                style={{
                  background: "radial-gradient(circle at center, var(--color-accent-muted), transparent 70%)",
                }}
              />
              <GenerativeAscii />
            </div>
          </AnimatedFadeIn>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60"
        style={{ animation: "bounce 2s infinite" }}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--color-text-muted)" }}>
          Scroll
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" style={{ color: "var(--color-text-muted)" }} />
        </svg>
      </div>
    </section>
  );
}
