"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const toolLinks = [
  { label: "Pamela", href: "/projects/pamela" },
  { label: "MCP Servers", href: "/projects/mcp-servers" },
  { label: "Knowledge API", href: "/projects/knowledge-api" },
  { label: "LLM Client", href: "/projects/llm-client" },
];

const labLinks = [
  { label: "Pen Plotter Art", href: "/lab/pen-plotter-art" },
  { label: "Strange Attractors", href: "/lab/strange-attractors" },
  { label: "Total Serialism", href: "/lab/total-serialism" },
  { label: "Excalidraw Diagrams", href: "/lab/excalidraw-diagrams" },
];

export function Footer() {
  return (
    <footer className="px-6 pt-16 pb-8 mt-auto border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Tools
            </h2>
            <ul className="space-y-2.5">
              {toolLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] hover:text-white transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Lab
            </h2>
            <ul className="space-y-2.5">
              {labLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13px] hover:text-white transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Social
            </h2>
            <ul className="space-y-2.5">
              {[
                { label: "GitHub", href: "https://github.com/edgeless-ai" },
                { label: "Gumroad", href: "https://edgelessai.gumroad.com" },
                { label: "Email", href: "mailto:hello@edgelesslab.com" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-[13px] hover:text-white transition-colors inline-flex items-center gap-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                    <ArrowUpRight size={11} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Legal
            </h2>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[13px] hover:text-white transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            &copy; 2026 Edgeless Labs
          </span>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--green)" }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-tertiary)" }}
            >
              7 agents active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
