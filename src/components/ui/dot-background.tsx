"use client";

import { motion } from "framer-motion";

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
      {/* Primary gradient orb — indigo */}
      <motion.div
        className="absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-30 blur-[150px]"
        style={{ background: "var(--accent)" }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.28, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Secondary orb — green, offset */}
      <motion.div
        className="absolute top-1/3 right-0 h-[400px] w-[500px] translate-x-1/4 rounded-full opacity-20 blur-[130px]"
        style={{ background: "var(--green)" }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.1, 0.18, 0.1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  );
}
