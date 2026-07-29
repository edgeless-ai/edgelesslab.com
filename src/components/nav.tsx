"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { openCommandPalette } from "@/lib/command-palette-events";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  emphasis?: boolean;
};

const NAV: NavItem[] = [
  { label: "Field Notes", href: "/field-notes" },
  { label: "Systems", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  {
    label: "Work with David",
    href: "/services/private-ai-systems",
    emphasis: true,
  },
  { label: "Shop", href: "https://shop.edgelesslab.com", external: true },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 pt-5">
        <div className="relative">
          <div
            className="flex items-center justify-between h-12 px-5 rounded-md border backdrop-blur-xl"
            style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}
          >
            <Link
              href="/"
              prefetch={false}
              className="flex items-center gap-2 text-[15px] font-semibold tracking-tight font-mono hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="inline-block h-2 w-2" style={{ background: "var(--accent)" }} />
              edgeless<span style={{ color: "var(--text-tertiary)" }}>/lab</span>
            </Link>

            <div className="hidden lg:flex items-center gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={
                    item.emphasis
                      ? "border px-3 py-1.5 text-[12px] font-medium transition-colors"
                      : "text-[13px] transition-colors hover:text-white"
                  }
                  aria-current={pathname === item.href ? "page" : undefined}
                  style={{
                    borderColor: item.emphasis ? "var(--accent)" : undefined,
                    color: item.emphasis
                      ? "var(--accent)"
                      : pathname === item.href
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {item.label}
                  {item.external && <span className="sr-only">, opens in a new tab</span>}
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
              <ThemeToggle />
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-2 transition-colors lg:hidden"
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
              className="mt-3 rounded-md border p-3 backdrop-blur-xl lg:hidden"
              style={{ background: "var(--bg-glass-solid)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center justify-between rounded-sm px-4 py-3 text-sm transition-colors"
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: item.emphasis
                        ? "var(--accent)"
                        : pathname === item.href
                          ? "var(--accent-muted)"
                          : "transparent",
                      color: item.emphasis
                        ? "var(--accent-contrast)"
                        : pathname === item.href
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {item.label}
                    {item.external && <ArrowUpRight size={12} />}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openCommandPalette();
                  }}
                  className="text-left rounded-sm px-4 py-3 text-sm transition-colors hover:text-white flex items-center gap-1.5 bg-transparent border-none cursor-pointer mt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Search size={14} />
                  Search
                </button>
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
