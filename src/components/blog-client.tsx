"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { BlogPost } from "@/lib/blog";

export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group flex items-baseline justify-between gap-4 py-4 px-3 -mx-3 rounded-lg transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium truncate mb-1">
            {post.title}
          </h2>
          <p
            className="text-sm truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {post.description}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-mono rounded"
                style={{
                  background: "var(--accent-muted)",
                  color: "var(--accent)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <time
            className="text-xs font-mono whitespace-nowrap"
            style={{ color: "var(--text-tertiary)" }}
          >
            {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      </Link>
    </motion.div>
  );
}
