"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RefreshCw, Download } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface AttractorParams {
  a: number;
  b: number;
  c: number;
  d: number;
  scale: number;
  iterations: number;
  color: string;
}

const ATTRACTOR_PRESETS = {
  lorenz: { a: 10, b: 28, c: 8 / 3, d: 0, scale: 8, iterations: 5000, color: "#22d3ee" },
  rossler: { a: 0.2, b: 0.2, c: 5.7, d: 0, scale: 15, iterations: 8000, color: "#a78bfa" },
  aizawa: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, scale: 120, iterations: 6000, color: "#34d399" },
  thomas: { a: 0.1, b: 0.1, c: 0.1, d: 0, scale: 80, iterations: 10000, color: "#f472b6" },
};

export function AttractorPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preset, setPreset] = useState<keyof typeof ATTRACTOR_PRESETS>("lorenz");
  const [params, setParams] = useState<AttractorParams>(ATTRACTOR_PRESETS.lorenz);
  const [isGenerating, setIsGenerating] = useState(false);

  const drawAttractor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear with fade
    ctx.fillStyle = "rgba(10, 10, 15, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setIsGenerating(true);
    setProgress(0);

    let x = 0.1;
    let y = 0;
    let z = 0;
    const dt = 0.01;
    const points: Point[] = [];

    // Generate points
    for (let i = 0; i < params.iterations; i++) {
      let nx, ny, nz;

      switch (preset) {
        case "lorenz":
          nx = x + dt * (params.a * (y - x));
          ny = y + dt * (x * (params.b - z) - y);
          nz = z + dt * (x * y - params.c * z);
          break;
        case "rossler":
          nx = x + dt * (-y - z);
          ny = y + dt * (x + params.a * y);
          nz = z + dt * (params.b + z * (x - params.c));
          break;
        case "aizawa":
          nx = x + dt * ((z - params.b) * x - params.d * y);
          ny = y + dt * (params.d * x + (z - params.b) * y);
          nz = z + dt * (params.c + params.a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + params.c * z) + params.c * z * x * x * x);
          break;
        case "thomas":
          nx = x + dt * (Math.sin(y) - params.a * x);
          ny = y + dt * (Math.sin(z) - params.a * y);
          nz = z + dt * (Math.sin(x) - params.a * z);
          break;
        default:
          nx = x;
          ny = y;
          nz = z;
      }

      x = nx;
      y = ny;
      z = nz;

      // Project to 2D (x, y plane with z affecting color/opacity)
      const px = canvas.width / 2 + x * params.scale;
      const py = canvas.height / 2 + y * params.scale;

      if (i > 100 && px > 0 && px < canvas.width && py > 0 && py < canvas.height) {
        points.push({ x: px, y: py });
      }

      if (i % 100 === 0) {
        setProgress(Math.round((i / params.iterations) * 100));
      }
    }

    // Draw points with trail effect
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < points.length; i++) {
      const alpha = 0.3 + (i / points.length) * 0.7;
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = params.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.stroke();
    }

    setProgress(100);
    setIsGenerating(false);
  }, [params, preset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = Math.min(400, rect.width * 0.6);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Initial draw
    drawAttractor();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [drawAttractor]);

  const handlePresetChange = (newPreset: keyof typeof ATTRACTOR_PRESETS) => {
    setPreset(newPreset);
    setParams(ATTRACTOR_PRESETS[newPreset]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `edgeless-attractor-${preset}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
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
            Strange Attractor Visualizer
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Chaotic dynamical systems • {params.iterations.toLocaleString()} iterations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={drawAttractor}
            disabled={isGenerating}
            className="p-2 rounded-lg transition-colors hover:bg-white/5 disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Regenerate"
          >
            <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
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
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="text-sm font-mono" style={{ color: "var(--accent)" }}>
                Generating... {progress}%
              </div>
              <div className="mt-2 w-32 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.keys(ATTRACTOR_PRESETS).map((key) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key as keyof typeof ATTRACTOR_PRESETS)}
              className="px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all"
              style={{
                background: preset === key ? "var(--accent-muted)" : "transparent",
                color: preset === key ? "var(--accent)" : "var(--text-secondary)",
                border: `1px solid ${preset === key ? "var(--accent)" : "var(--border-subtle)"}`,
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
              Iterations
            </label>
            <input
              type="range"
              min="1000"
              max="20000"
              step="1000"
              value={params.iterations}
              onChange={(e) => setParams({ ...params, iterations: parseInt(e.target.value) })}
              className="w-full accent-cyan-500"
            />
            <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
              {params.iterations.toLocaleString()}
            </span>
          </div>
          <div>
            <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
              Scale
            </label>
            <input
              type="range"
              min="5"
              max="150"
              value={params.scale}
              onChange={(e) => setParams({ ...params, scale: parseInt(e.target.value) })}
              className="w-full accent-cyan-500"
            />
            <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
              {params.scale}x
            </span>
          </div>
          <div>
            <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
              Param A
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={params.a}
              onChange={(e) => setParams({ ...params, a: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500"
            />
            <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
              {params.a.toFixed(1)}
            </span>
          </div>
          <div>
            <label className="text-label font-mono uppercase tracking-wider block mb-2" style={{ color: "var(--text-tertiary)" }}>
              Color
            </label>
            <input
              type="color"
              value={params.color}
              onChange={(e) => setParams({ ...params, color: e.target.value })}
              className="w-full h-6 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
