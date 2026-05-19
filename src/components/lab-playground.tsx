"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RefreshCw, Download } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function LabPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [params, setParams] = useState({
    particleCount: 150,
    flowScale: 0.003,
    speed: 2,
    hueShift: 0.5,
    decay: 0.99,
  });

  // Flow field function
  const getFlowAngle = (x: number, y: number, time: number) => {
    const scale = params.flowScale;
    return (
      Math.sin(x * scale + time * 0.0005) * Math.cos(y * scale) * Math.PI * 2 +
      Math.sin((x + y) * scale * 0.5 + time * 0.0003) * Math.PI
    );
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.min(400, rect.width * 0.6);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < params.particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: 0,
          vy: 0,
          life: Math.random() * 100 + 50,
          maxLife: 150,
          hue: (i / params.particleCount) * 60 + 180, // Blue to cyan range
        });
      }
    };
    initParticles();

    let time = 0;
    const animate = () => {
      if (!isPlaying) return;

      // Fade effect
      ctx.fillStyle = "rgba(10, 10, 15, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time++;

      particlesRef.current.forEach((p) => {
        // Get flow field angle
        const angle = getFlowAngle(p.x, p.y, time);

        // Update velocity based on flow field
        p.vx += Math.cos(angle) * 0.3;
        p.vy += Math.sin(angle) * 0.3;

        // Apply speed and decay
        const speed = params.speed;
        p.vx *= params.decay;
        p.vy *= params.decay;
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Age particle
        p.life--;
        if (p.life <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.vx = 0;
          p.vy = 0;
          p.life = p.maxLife;
          p.hue = (p.hue + params.hueShift) % 360;
        }

        // Draw particle
        const alpha = Math.min(1, p.life / 30);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.8})`;
        ctx.fill();

        // Draw trail
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `hsla(${p.hue}, 70%, 50%, ${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, params]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `edgeless-flow-field-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "rgba(10, 10, 15, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Flow Field Playground
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Interactive generative system • {params.particleCount} particles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--grid-line)]"
            style={{ color: "var(--text-secondary)" }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--grid-line)]"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Reset"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg transition-colors hover:bg-[var(--grid-line)]"
            style={{ color: "var(--accent)" }}
            aria-label="Download"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full" style={{ background: "rgba(10, 10, 15, 1)" }}>
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ minHeight: "300px" }}
        />
      </div>

      {/* Controls */}
      <div
        className="px-5 py-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      >
        <div>
          <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
            Particles
          </label>
          <input
            type="range"
            min="50"
            max="300"
            value={params.particleCount}
            onChange={(e) => setParams({ ...params, particleCount: parseInt(e.target.value) })}
            className="w-full accent-cyan-500"
          />
          <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
            {params.particleCount}
          </span>
        </div>
        <div>
          <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
            Flow Scale
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={params.flowScale * 1000}
            onChange={(e) => setParams({ ...params, flowScale: parseInt(e.target.value) / 1000 })}
            className="w-full accent-cyan-500"
          />
          <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
            {(params.flowScale * 1000).toFixed(0)}
          </span>
        </div>
        <div>
          <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
            Speed
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={params.speed}
            onChange={(e) => setParams({ ...params, speed: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500"
          />
          <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
            {params.speed}x
          </span>
        </div>
        <div>
          <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
            Decay
          </label>
          <input
            type="range"
            min="90"
            max="99"
            value={params.decay * 100}
            onChange={(e) => setParams({ ...params, decay: parseInt(e.target.value) / 100 })}
            className="w-full accent-cyan-500"
          />
          <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
            {params.decay.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
