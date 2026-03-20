"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { JsonLd } from "@/components/json-ld";
import { Footer } from "@/components/footer";
import type { experiments } from "@/lib/data";

type Experiment = (typeof experiments)[number];

export function ExperimentDetail({ experiment }: { experiment: Experiment }) {
  return (
    <div className="flex flex-col min-h-full" style={{ background: "var(--bg-base)" }}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": experiment.title,
        "description": experiment.description,
        "creator": { "@type": "Organization", "name": "Edgeless Labs", "url": "https://edgelesslab.com" },
        "genre": experiment.category,
        "url": `https://edgelesslab.com/lab/${experiment.slug}`,
      }} />
      <Nav />

      <section className="px-6 pt-32 pb-16">
        <div className="max-w-[768px] mx-auto">
          <motion.a
            href="/lab"
            className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white"
            style={{ color: "var(--text-tertiary)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowLeft size={14} /> All experiments
          </motion.a>

          <motion.div
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-[10px] font-mono uppercase tracking-[0.12em] px-2.5 py-1 rounded-md"
              style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
            >
              {experiment.category}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span
                className="text-[11px] font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                {experiment.status}
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl font-bold tracking-[-0.03em] mb-6"
            style={{ color: "var(--text-primary)" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {experiment.title}
          </motion.h1>

          <motion.p
            className="text-lg font-light mb-12"
            style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {experiment.description}
          </motion.p>

          {/* Placeholder for future media/visuals */}
          <motion.div
            className="w-full aspect-video rounded-xl border mb-12"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-center h-full">
              <span
                className="text-sm font-mono"
                style={{ color: "var(--text-tertiary)" }}
              >
                Visual documentation coming soon
              </span>
            </div>
          </motion.div>

          <motion.a
            href="/lab"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white"
            style={{ color: "var(--accent)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ArrowLeft size={14} /> Back to Lab
          </motion.a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
