"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { openCommandPalette } from "@/lib/command-palette-events";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { label: "Projects", href: "/projects" },
  { label: "Products", href: "/products" },
  { label: "Services", href: "/services/private-ai-systems" },
  { label: "Lab", href: "/lab" },
  { label: "Agents", href: "/agents" },
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
              background: "var(--bg-glass)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <Link
              href="/"
              prefetch={false}
              className="flex items-center gap-2 text-[15px] font-semibold tracking-tight font-mono hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              edgeless<span style={{ color: "var(--text-tertiary)" }}>/lab</span>
            </Link>
            <div className="hidden md:flex items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  prefetch={false}
                  className="text-[13px] hover:text-white transition-colors"
                  aria-current={pathname === link.href ? "page" : undefined}
                  style={{
                    color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => openCommandPalette()}
                className="text-[13px] hover:text-white transition-colors flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                <Search size={13} />
                <kbd
                  className="text-[10px] font-mono px-1 py-0.5 rounded hidden lg:inline"
                  style={{ color: "var(--text-tertiary)", background: "var(--bg-surface)" }}
                >
                  &#8984;K
                </kbd>
                <span className="sr-only">Search</span>
              </button>
              <a
                href="https://github.com/edgeless-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] hover:text-white transition-colors flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                GitHub <ArrowUpRight size={12} />
                <span className="sr-only">(opens in new tab)</span>
              </a>
              <ThemeToggle />
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
              className="mt-3 rounded-[1.5rem] border p-3 backdrop-blur-xl md:hidden"
              style={{
                background: "var(--bg-glass-solid)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    prefetch={false}
                    className="rounded-2xl px-4 py-3 text-sm transition-colors"
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
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openCommandPalette();
                  }}
                  className="text-left rounded-2xl px-4 py-3 text-sm transition-colors hover:text-white flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Search size={14} />
                  Search
                </button>
                <a
                  href="https://github.com/edgeless-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-2xl px-4 py-3 text-sm transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={() => setIsOpen(false)}
                >
                  GitHub <ArrowUpRight size={12} />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
                <div className="px-4 py-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
