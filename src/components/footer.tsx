"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SubscribeForm } from "@/components/subscribe-form";

const toolLinks = [
  { label: "Systems", href: "/projects" },
  { label: "Resources", href: "/products" },
  { label: "Work with David", href: "/services/private-ai-systems" },
  { label: "Shop", href: "https://shop.edgelesslab.com", external: true },
];

const labLinks = [
  { label: "Field Notes", href: "/field-notes", external: false },
  { label: "Experiments", href: "/lab", external: false },
  { label: "Agents", href: "/agents", external: false },
  { label: "Marimo", href: "/lab/marimo", external: false },
];

export function Footer() {
  return (
    <footer className="px-6 pt-16 pb-8 mt-auto border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="max-w-[1280px] mx-auto">
        {/* Email capture */}
        <div className="mb-12 pb-10 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h3
            className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
            style={{ color: "var(--text-tertiary)" }}
          >
            Follow the lab
          </h3>
          <SubscribeForm source="footer" />
          <Link
            href="/feed.xml"
            className="mt-3 inline-flex items-center gap-1 font-mono text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Prefer RSS <ArrowUpRight size={11} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Work
            </h2>
            <ul className="space-y-2.5">
              {toolLinks.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[13px] transition-colors hover:text-white"
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
              Writing
            </h2>
            <ul className="space-y-2.5">
              {[
                { label: "Blog", href: "/blog", external: false },
                { label: "RSS", href: "/feed.xml", external: false },
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
          <div>
            <h2
              className="text-xs font-mono uppercase tracking-[0.12em] mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Connect
            </h2>
            <ul className="space-y-2.5">
              {[
                { label: "About", href: "/about", external: false },
                { label: "GitHub", href: "https://github.com/edgeless-ai", external: true },
                { label: "Email", href: "mailto:david@edgelesslab.com", external: true },
                { label: "Privacy", href: "/privacy", external: false },
              ].map((item) => (
                <li key={item.label}>
                  {item.external ? (
                    <a
                      href={item.href}
                      className="inline-flex items-center gap-1 text-[13px] transition-colors hover:text-white"
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
        </div>

        {/* ASCII logo banner */}
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
              Public research studio
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
