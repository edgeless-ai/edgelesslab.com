"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Projects", href: "/projects" },
  { label: "Products", href: "/products" },
  { label: "Lab", href: "/lab" },
  { label: "Field Notes", href: "/field-notes" },
  { label: "Blog", href: "/blog" },
  { label: "Knowledge", href: "/knowledge" },
  { label: "About", href: "/about" },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 pt-5">
        <div className="relative">
          <div
            className="flex items-center justify-between h-12 px-5 rounded-full border backdrop-blur-xl"
            style={{
              background: "rgba(17, 17, 19, 0.7)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-body font-semibold tracking-tight font-mono hover:opacity-80 transition-opacity cursor-blink"
              style={{ color: "var(--text-primary)" }}
            >
              edgeless<span style={{ color: "var(--phosphor)" }}>~/</span><span style={{ color: "var(--text-tertiary)" }}>lab</span>
            </Link>
            <div className="hidden md:flex items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-detail hover:text-[var(--text-primary)] transition-colors"
                  aria-current={pathname === link.href ? "page" : undefined}
                  style={{
                    color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://github.com/edgeless-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-detail hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                GitHub <ArrowUpRight size={12} />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-2 transition-colors md:hidden"
              style={{ color: "var(--text-secondary)" }}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((open) => !open)}
            >
              {isOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          {isOpen && (
            <div
              className="mt-3 p-3 backdrop-blur-xl md:hidden tui-border"
              data-label="nav"
              style={{
                background: "rgba(17, 17, 19, 0.92)",
              }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="px-4 py-3 text-sm transition-colors font-mono"
                    aria-current={pathname === link.href ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    style={{
                      background:
                        pathname === link.href ? "var(--accent-muted)" : "transparent",
                      color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="https://github.com/edgeless-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl px-4 py-3 text-sm transition-colors hover:text-[var(--text-primary)]"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => setIsOpen(false)}
                >
                  GitHub <ArrowUpRight size={12} />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
