"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Download, RefreshCw, Upload, Type, Grid3X3, Shapes } from "lucide-react";

interface ASCIISettings {
  density: string;
  fontSize: number;
  invert: boolean;
  color: string;
  mode: "text" | "shapes" | "mixed";
}

const DENSITY_CHARS = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  detailed: " .'`^,:\"/;=-_~+<>i!lI?]|}{1)(\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  minimal: " ▪▫●◯◼◻",
  edges: " |/\\-",
};

export function ASCIIArtGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ascii, setAscii] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<ASCIISettings>({
    density: "detailed",
    fontSize: 8,
    invert: false,
    color: "#00d4ff",
    mode: "text",
  });

  const generateDemoPattern = useCallback(() => {
    const width = 80;
    const height = 40;
    const chars = DENSITY_CHARS[settings.density as keyof typeof DENSITY_CHARS] || DENSITY_CHARS.detailed;
    let result = "";
    
    for (let y = 0; y < height; y++) {
      let row = "";
      for (let x = 0; x < width; x++) {
        // Generate patterns based on mode
        let value = 0;
        const nx = x / width;
        const ny = y / height;
        
        switch (settings.mode) {
          case "text":
            // Wave interference pattern
            value = Math.sin(nx * 10 + Date.now() * 0.001) * Math.cos(ny * 8) * 0.5 + 0.5;
            break;
          case "shapes":
            // Circle pattern
            const cx = nx - 0.5;
            const cy = ny - 0.5;
            const dist = Math.sqrt(cx * cx + cy * cy);
            value = Math.sin(dist * 20) * 0.5 + 0.5;
            break;
          case "mixed":
            // Combined pattern
            const wave = Math.sin(nx * 15) * Math.cos(ny * 12);
            const circle = Math.sin(Math.sqrt((nx-0.5)**2 + (ny-0.5)**2) * 25);
            value = (wave + circle) * 0.25 + 0.5;
            break;
        }
        
        // Apply invert
        if (settings.invert) value = 1 - value;
        
        // Map to character
        const charIndex = Math.floor(value * (chars.length - 1));
        row += chars[Math.max(0, Math.min(charIndex, chars.length - 1))];
      }
      result += row + "\n";
    }
    
    setAscii(result);
  }, [settings]);

  const imageToASCII = useCallback((img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale down for ASCII resolution
    const maxWidth = 100;
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const chars = DENSITY_CHARS[settings.density as keyof typeof DENSITY_CHARS] || DENSITY_CHARS.detailed;
    let result = "";
    
    for (let y = 0; y < canvas.height; y += 2) { // Skip every other row for aspect ratio
      let row = "";
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Convert to grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        let value = gray / 255;
        
        if (settings.invert) value = 1 - value;
        
        const charIndex = Math.floor(value * (chars.length - 1));
        row += chars[Math.max(0, Math.min(charIndex, chars.length - 1))];
      }
      result += row + "\n";
    }
    
    setAscii(result);
  }, [settings]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        imageToASCII(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const downloadASCII = () => {
    const blob = new Blob([ascii], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ascii-art-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ascii);
  };

  // Generate demo pattern on mount and when settings change
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!image) {
        generateDemoPattern();
      } else {
        imageToASCII(image);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [settings, image, generateDemoPattern, imageToASCII]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)]">
        {/* Density Preset */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <Type size={12} />
            Charset
          </label>
          <select
            value={settings.density}
            onChange={(e) => setSettings({ ...settings, density: e.target.value })}
            className="w-full px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded text-sm font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="detailed">Detailed</option>
            <option value="standard">Standard</option>
            <option value="blocks">Blocks</option>
            <option value="minimal">Minimal</option>
            <option value="edges">Edges</option>
          </select>
        </div>

        {/* Mode */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <Shapes size={12} />
            Pattern
          </label>
          <select
            value={settings.mode}
            onChange={(e) => setSettings({ ...settings, mode: e.target.value as ASCIISettings["mode"] })}
            className="w-full px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded text-sm font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="text">Waves</option>
            <option value="shapes">Circles</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
            <Grid3X3 size={12} />
            Size
          </label>
          <input
            type="range"
            min="4"
            max="16"
            step="1"
            value={settings.fontSize}
            onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
            className="w-full accent-[var(--accent-cyan)]"
          />
          <div className="text-xs font-mono text-[var(--text-muted)] text-center">
            {settings.fontSize}px
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
            Accent
          </label>
          <div className="flex gap-2">
            {["#00d4ff", "#a855f7", "#22c55e", "#f59e0b", "#ef4444"].map((color) => (
              <button
                key={color}
                onClick={() => setSettings({ ...settings, color })}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  settings.color === color ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="col-span-2 md:col-span-4 flex items-center gap-4 pt-2 border-t border-[var(--border-default)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.invert}
              onChange={(e) => setSettings({ ...settings, invert: e.target.checked })}
              className="accent-[var(--accent-cyan)]"
            />
            <span className="text-sm font-mono text-[var(--text-default)]">Invert</span>
          </label>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded text-xs font-mono hover:border-[var(--accent-cyan)] transition-colors"
          >
            <Upload size={12} />
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {image && (
            <button
              onClick={() => { setImage(null); generateDemoPattern(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-default)] transition-colors"
            >
              <RefreshCw size={12} />
              Reset to Pattern
            </button>
          )}
        </div>
      </div>

      {/* ASCII Output */}
      <div className="relative bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg overflow-hidden">
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded text-xs font-mono hover:border-[var(--accent-cyan)] transition-colors"
          >
            Copy
          </button>
          <button
            onClick={downloadASCII}
            className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded text-xs font-mono hover:border-[var(--accent-cyan)] transition-colors"
          >
            <Download size={12} />
            .txt
          </button>
        </div>
        
        <pre
          className="p-4 pt-10 overflow-auto font-mono leading-none whitespace-pre"
          style={{
            fontSize: `${settings.fontSize}px`,
            color: settings.color,
            minHeight: "300px",
            maxHeight: "500px",
          }}
        >
          {ascii}
        </pre>
      </div>

      {/* Info */}
      <p className="text-xs font-mono text-[var(--text-muted)]">
        {image ? `Processing: ${image.naturalWidth}×${image.naturalHeight}` : "Generative pattern mode — upload an image or adjust settings above"}
      </p>
    </div>
  );
}
