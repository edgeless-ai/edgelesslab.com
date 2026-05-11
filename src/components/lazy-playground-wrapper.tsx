"use client";

import { lazy, Suspense, useState } from "react";
import { ChevronDown, Play } from "lucide-react";

// Lazy load the heavy canvas components
const LabPlayground = lazy(() => import("@/components/lab-playground").then(m => ({ default: m.LabPlayground })));
const AttractorPlayground = lazy(() => import("@/components/attractor-playground").then(m => ({ default: m.AttractorPlayground })));
const ASCIIArtGenerator = lazy(() => import("@/components/ascii-art-generator").then(m => ({ default: m.ASCIIArtGenerator })));

function PlaygroundLoader({ label }: { label: string }) {
  return (
    <div 
      className="flex items-center justify-center h-[320px] rounded-lg border border-dashed"
      style={{ 
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)"
      }}
    >
      <div className="text-center">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-2"
          style={{ background: "var(--accent-ghost)", color: "var(--accent)" }}
        >
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading {label}...
        </div>
      </div>
    </div>
  );
}

function PlaygroundPlaceholder({ 
  label, 
  description,
  onActivate 
}: { 
  label: string; 
  description: string;
  onActivate: () => void;
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center h-[320px] rounded-lg border border-dashed cursor-pointer transition-colors hover:border-solid group"
      style={{ 
        background: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)"
      }}
      onClick={onActivate}
    >
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
        style={{ background: "var(--accent-ghost)" }}
      >
        <Play className="w-5 h-5" style={{ color: "var(--accent)" }} />
      </div>
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <span className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
        {description}
      </span>
    </div>
  );
}

export function LazyLabPlayground() {
  const [isActive, setIsActive] = useState(false);

  if (!isActive) {
    return (
      <PlaygroundPlaceholder 
        label="Flow Field Playground"
        description="Click to load interactive canvas"
        onActivate={() => setIsActive(true)}
      />
    );
  }

  return (
    <Suspense fallback={<PlaygroundLoader label="Flow Field" />}>
      <LabPlayground />
    </Suspense>
  );
}

export function LazyAttractorPlayground() {
  const [isActive, setIsActive] = useState(false);

  if (!isActive) {
    return (
      <PlaygroundPlaceholder 
        label="Strange Attractor Visualizer"
        description="Click to load interactive canvas"
        onActivate={() => setIsActive(true)}
      />
    );
  }

  return (
    <Suspense fallback={<PlaygroundLoader label="Attractor" />}>
      <AttractorPlayground />
    </Suspense>
  );
}

export function LazyASCIIArtGenerator() {
  const [isActive, setIsActive] = useState(false);

  if (!isActive) {
    return (
      <PlaygroundPlaceholder 
        label="ASCII Art Generator"
        description="Click to load generative text patterns"
        onActivate={() => setIsActive(true)}
      />
    );
  }

  return (
    <Suspense fallback={<PlaygroundLoader label="ASCII Generator" />}>
      <ASCIIArtGenerator />
    </Suspense>
  );
}