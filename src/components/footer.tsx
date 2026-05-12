"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const toolLinks = [
  { label: "Safety Hooks", href: "/projects/safety-hooks" },
  { label: "MCP Servers", href: "/projects/mcp-servers" },
  { label: "Knowledge API", href: "/projects/knowledge-api" },
  { label: "LLM Client", href: "/projects/llm-client" },
];

const labLinks = [
  { label: "Pen Plotter Art", href: "/lab/pen-plotter-pipeline", external: false },
  { label: "Strange Attractors", href: "/lab/strange-attractors", external: false },
  { label: "Total Serialism", href: "/total-serialism/field-notes/", external: false },
  { label: "Excalidraw Diagrams", href: "/lab/excalidraw-diagrams", external: false },
];

const ASCII_BANNER = `    ______    __           __
   / ____/___/ /___ ____  / /__  __________
  / __/ / __  / __ \`/ _ \\/ / _ \\/ ___/ ___/
 / /___/ /_/ / /_/ /  __/ /  __(__  |__  )
/_____/\\__,_/\\__, /\\___/_/\\___/____/____/
            /____/                         `;

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
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] hover:text-white transition-colors inline-flex items-center gap-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                      <ArrowUpRight size={11} />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-[13px] hover:text-white transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                    </Link>
                  )}
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
                { label: "Email", href: "mailto:david@edgelesslab.com" },
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

        {/* ASCII logo banner */}
        <div className="mb-8 flex justify-center">
          <pre
            className="text-[9px] sm:text-xs leading-[1.3] font-mono select-none hidden sm:block"
            style={{
              color: "var(--text-tertiary)",
              textShadow: "0 0 8px rgba(129,140,248,0.15)",
            }}
            aria-hidden="true"
          >
            {ASCII_BANNER}
          </pre>
        </div>

        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <span
            className="text-xs font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            &copy; 2026 Edgeless Lab
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
              Systems online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
