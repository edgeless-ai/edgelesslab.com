"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  speed: number;
  phase: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function FeaturedArtifact() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const element = canvas;
    const drawing = context;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const random = seededRandom(23051986);
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let elapsed = 0;

    function reset() {
      const bounds = element.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      element.width = Math.round(width * density);
      element.height = Math.round(height * density);
      drawing.setTransform(density, 0, 0, density, 0, 0);
      drawing.fillStyle = "#0b0c0f";
      drawing.fillRect(0, 0, width, height);

      particles = Array.from({ length: width < 520 ? 46 : 74 }, () => {
        const x = random() * width;
        const y = random() * height;
        return {
          x,
          y,
          previousX: x,
          previousY: y,
          speed: 0.55 + random() * 1.15,
          phase: random() * Math.PI * 2,
        };
      });
    }

    function drawField(time: number) {
      elapsed = time * 0.00032;
      const pointer = pointerRef.current;

      drawing.fillStyle = media.matches
        ? "rgba(11,12,15,1)"
        : "rgba(11,12,15,0.075)";
      drawing.fillRect(0, 0, width, height);

      drawing.lineCap = "round";

      particles.forEach((particle, index) => {
        particle.previousX = particle.x;
        particle.previousY = particle.y;

        const nx = particle.x / Math.max(width, 1);
        const ny = particle.y / Math.max(height, 1);
        const pointerX = (pointer.x * width - particle.x) / Math.max(width, 1);
        const pointerY = (pointer.y * height - particle.y) / Math.max(height, 1);
        const pointerDistance = Math.max(
          0.05,
          Math.hypot(pointerX, pointerY),
        );

        let angle =
          Math.sin(nx * 8.2 + elapsed * 1.6 + particle.phase) * 1.25 +
          Math.cos(ny * 7.4 - elapsed + nx * 3.1) * 1.05;

        if (pointer.active) {
          angle +=
            Math.atan2(pointerY, pointerX) +
            Math.min(2.4, 0.22 / pointerDistance);
        }

        particle.x += Math.cos(angle) * particle.speed;
        particle.y += Math.sin(angle) * particle.speed;

        if (
          particle.x < -12 ||
          particle.x > width + 12 ||
          particle.y < -12 ||
          particle.y > height + 12
        ) {
          particle.x = random() * width;
          particle.y = random() * height;
          particle.previousX = particle.x;
          particle.previousY = particle.y;
        }

        drawing.beginPath();
        drawing.moveTo(particle.previousX, particle.previousY);
        drawing.lineTo(particle.x, particle.y);
        drawing.lineWidth = index % 9 === 0 ? 1.45 : 0.72;
        drawing.strokeStyle =
          index % 11 === 0
            ? "rgba(198,242,78,0.92)"
            : index % 7 === 0
              ? "rgba(122,162,255,0.72)"
              : "rgba(244,239,224,0.34)";
        drawing.stroke();
      });

      if (!media.matches) {
        frameRef.current = requestAnimationFrame(drawField);
      }
    }

    const observer = new ResizeObserver(() => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      reset();
      drawField(performance.now());
    });

    observer.observe(element);
    reset();
    drawField(performance.now());

    const onMotionChange = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      reset();
      drawField(performance.now());
    };
    media.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", onMotionChange);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <figure
      className="crop-frame overflow-hidden border"
      style={{
        background: "#0b0c0f",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="lab-metadata" style={{ color: "var(--text-tertiary)" }}>
          Flow field 023 / live study
        </span>
        <span className="lab-metadata flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <span className="h-2 w-2" style={{ background: "var(--accent)" }} />
          Move pointer
        </span>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A live flow field study. Moving the pointer bends the particle paths."
        className="block h-[430px] w-full touch-none sm:h-[520px]"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
            active: true,
          };
        }}
        onPointerLeave={() => {
          pointerRef.current.active = false;
        }}
      />

      <figcaption
        className="grid gap-px border-t sm:grid-cols-[1fr_auto]"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--border-subtle)",
        }}
      >
        <div className="px-4 py-4" style={{ background: "var(--bg-surface)" }}>
          <div className="lab-metadata mb-2" style={{ color: "var(--accent)" }}>
            Field Note / generative systems
          </div>
          <p className="font-editorial text-2xl">Flow-Field Particle Ecosystem</p>
          <p className="mt-2 max-w-xl text-xs leading-5" style={{ color: "var(--text-secondary)" }}>
            Particle paths reveal a vector field by moving through it. The
            pointer adds a local force without exposing a control panel.
          </p>
        </div>
        <a
          href="/creative-demos/flow-field-particle-ecosystem/"
          className="group flex min-w-44 items-center justify-between gap-4 px-4 py-4 text-sm"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          Open the study
          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </figcaption>
    </figure>
  );
}
