"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState, FormEvent } from "react";

const toolLinks = [
  { label: "Safety Hooks", href: "/projects/safety-hooks" },
  { label: "MCP Servers", href: "/projects/mcp-servers" },
  { label: "Knowledge API", href: "/projects/knowledge-api" },
  { label: "LLM Client", href: "/projects/llm-client" },
];

const labLinks = [
  { label: "Pen Plotter Art", href: "/lab/pen-plotter-pipeline", external: false },
  { label: "Strange Attractors", href: "/lab/strange-attractors", external: false },
  { label: "Total Serialism", href: "/total-serialism/app/", external: false },
  { label: "Excalidraw Diagrams", href: "/lab/excalidraw-diagrams", external: false },
  { label: "Field Notes", href: "https://notes.edgelesslab.com", external: true },
];

const ASCII_BANNER = `    ______    __           __
   / ____/___/ /___ ____  / /__  __________
  / __/ / __  / __ \`/ _ \\/ / _ \\/ ___/ ___/
 / /___/ /_/ / /_/ /  __/ /  __(__  |__  )
/_____/\\__,_/\\__, /\\___/_/\\___/____/____/
            /____/                         `;

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const subject = encodeURIComponent("Subscribe to Edgeless Lab updates");
    const body = encodeURIComponent(`Please add me to the newsletter: ${email}`);
    window.location.href = `mailto:david@edgelesslab.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <footer className="px-6 pt-16 pb-8 mt-auto border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="max-w-[1280px] mx-auto">
        {/* Email capture */}
        <div className="mb-12 pb-10 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h3
            className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Get updates
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-10 px-4 rounded-lg bg-transparent border text-sm outline-none focus:border-white/30 transition-colors"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <button
              type="submit"
              className="h-10 px-5 text-sm font-medium rounded-lg transition-all hover:brightness-110 shrink-0"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Subscribe
            </button>
          </form>
          {submitted && (
            <p className="mt-3 text-xs font-mono" style={{ color: "var(--green)" }}>
              Thanks — your email client will open to confirm.
            </p>
          )}
        </div>

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
              About
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
