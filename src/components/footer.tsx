"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";

const toolLinks = [
  { label: "Safety Hooks", href: "/projects/safety-hooks" },
  { label: "MCP Servers", href: "/projects/mcp-servers" },
  { label: "Knowledge API", href: "/projects/knowledge-api" },
  { label: "LLM Client", href: "/projects/llm-client" },
];

const labLinks = [
  { label: "Pen Plotter Journal", href: "/pen-plotter/", external: false },
  { label: "Total Serialism", href: "/total-serialism/field-notes/", external: false },
  { label: "Tartanism Notes", href: "/tartanism/field-notes/", external: false },
  { label: "Flow Viz", href: "/flow-viz/", external: false },
];

const ASCII_BANNER = `    ______    __           __
   / ____/___/ /___ ____  / /__  __________
  / __/ / __  / __ \`/ _ \\/ / _ \\/ ___/ ___/
 / /___/ /_/ / /_/ /  __/ /  __(__  |__  )
/_____/\\__,_/\\__, /\\___/_/\\___/____/____/
            /____/                         `;

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Edgeless Lab updates");
    const body = encodeURIComponent(`Please add me to the Edgeless Lab updates list: ${email}`);
    return `mailto:david@edgelesslab.com?subject=${subject}&body=${body}`;
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Enter an email.");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, hp: "" }),
      });

      if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);

      setStatus("ok");
      setMessage("Added. Check your inbox (or email us if the form is offline).");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Form offline. Click to email us instead.");
    }
  }

  return (
    <footer className="px-6 pt-16 pb-8 mt-auto border-t relative texture-scanlines overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
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

        {/* Email capture */}
        <div
          className="mb-12 rounded-xl border p-6 sm:p-7"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div
                className="text-xs font-mono uppercase tracking-[0.12em]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Updates
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Get new tools, writeups, and experiments. Low volume.
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex items-stretch gap-2 w-full sm:w-auto">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 sm:w-[260px] px-3 py-2 text-[13px] font-mono rounded-lg border outline-none"
                style={{
                  background: "var(--bg-base)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                disabled={status === "saving"}
                className="px-3 py-2 text-[13px] font-mono rounded-lg border hover:border-white/[0.16] transition-colors"
                style={{
                  background: "var(--bg-base)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-primary)",
                  opacity: status === "saving" ? 0.6 : 1,
                }}
              >
                {status === "saving" ? "Saving" : "Join"}
              </button>
            </form>
          </div>

          {message ? (
            <div className="mt-3 text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {status === "error" ? (
                <a href={mailtoHref} className="underline underline-offset-4">
                  {message}
                </a>
              ) : (
                message
              )}
            </div>
          ) : null}
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
              style={{ background: "var(--phosphor)" }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--phosphor)" }}
            >
              Systems online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
