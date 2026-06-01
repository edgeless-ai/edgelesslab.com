"use client";

/**
 * Animated gradient orb background with grid lines.
 * Pure CSS animation -- no JS tick loop.
 */
// Keyframes moved to globals.css to avoid duplicate <style> injection per mount.
export function DotBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Primary gradient orb -- indigo */}
      <div
        className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-[150px]"
        style={{
          background: "var(--accent)",
          animation: "orbPulse 10s ease-in-out infinite",
        }}
      />
      {/* Secondary orb -- green, offset */}
      <div
        className="absolute top-1/3 right-0 h-[400px] w-[500px] translate-x-1/4 rounded-full blur-[130px]"
        style={{
          background: "var(--green)",
          animation: "orbPulseGreen 12s ease-in-out 3s infinite",
        }}
      />
    </div>
  );
}
