"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X, Search, ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { openCommandPalette } from "@/lib/command-palette-events";
import { ThemeToggle } from "@/components/theme-toggle";

type NavChild = { label: string; href: string; external?: boolean };
type NavItem =
  | { label: string; href: string; external?: boolean }
  | { label: string; children: NavChild[] };

const NAV: NavItem[] = [
  { label: "Shop", href: "https://shop.edgelesslab.com", external: true },
  {
    label: "Work",
    children: [
      { label: "Projects", href: "/projects" },
      { label: "Products", href: "/products" },
      { label: "Services", href: "/services/private-ai-systems" },
    ],
  },
  {
    label: "Lab",
    children: [
      { label: "Lab", href: "/lab" },
      { label: "Creative", href: "/creative" },
      { label: "Marimo", href: "/lab/marimo" },
      { label: "Agents", href: "/agents" },
    ],
  },
  {
    label: "Writing",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Notes", href: "https://notes.edgelesslab.com", external: true },
      { label: "Now", href: "/now" },
    ],
  },
  { label: "About", href: "/about" },
];

function hasChildren(item: NavItem): item is { label: string; children: NavChild[] } {
  return "children" in item;
}

/** A single top-level group with a hover/keyboard dropdown. */
function NavGroup({ label, children, pathname }: { label: string; children: NavChild[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = children.some((c) => c.href === pathname);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[13px] transition-colors hover:text-white bg-transparent border-none cursor-pointer"
        style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {label}
        <ChevronDown size={12} className="transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-3 min-w-[168px] rounded-2xl border p-1.5 backdrop-blur-xl"
          style={{ background: "var(--bg-glass-solid)", borderColor: "var(--border-subtle)" }}
        >
          {children.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              prefetch={false}
              {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              onClick={() => setOpen(false)}
              aria-current={c.href === pathname ? "page" : undefined}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors hover:text-white"
              style={{
                background: c.href === pathname ? "var(--accent-muted)" : "transparent",
                color: c.href === pathname ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {c.label}
              {c.external && <ArrowUpRight size={11} style={{ color: "var(--text-tertiary)" }} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

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
            className="flex items-center justify-between h-12 px-5 rounded-full border backdrop-blur-xl"
            style={{ background: "var(--bg-glass)", borderColor: "var(--border-subtle)" }}
          >
            <Link
              href="/"
              prefetch={false}
              className="flex items-center gap-2 text-[15px] font-semibold tracking-tight font-mono hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              edgeless<span style={{ color: "var(--text-tertiary)" }}>/lab</span>
            </Link>

            <div className="hidden md:flex items-center gap-5">
              {NAV.map((item) =>
                hasChildren(item) ? (
                  <NavGroup key={item.label} label={item.label} children={item.children} pathname={pathname} />
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-[13px] hover:text-white transition-colors"
                    aria-current={pathname === item.href ? "page" : undefined}
                    style={{ color: pathname === item.href ? "var(--text-primary)" : "var(--text-secondary)" }}
                  >
                    {item.label}
                  </Link>
                )
              )}
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
              style={{ background: "var(--bg-glass-solid)", borderColor: "var(--border-subtle)" }}
            >
              <div className="flex flex-col gap-1">
                {NAV.map((item) =>
                  hasChildren(item) ? (
                    <div key={item.label} className="px-1 pt-2">
                      <div
                        className="px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.14em]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {item.label}
                      </div>
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          prefetch={false}
                          {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="rounded-2xl px-4 py-3 text-sm transition-colors flex items-center justify-between"
                          aria-current={c.href === pathname ? "page" : undefined}
                          onClick={() => setIsOpen(false)}
                          style={{
                            background: c.href === pathname ? "var(--accent-muted)" : "transparent",
                            color: c.href === pathname ? "var(--text-primary)" : "var(--text-secondary)",
                          }}
                        >
                          {c.label}
                          {c.external && <ArrowUpRight size={12} style={{ color: "var(--text-tertiary)" }} />}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      prefetch={false}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="rounded-2xl px-4 py-3 text-sm transition-colors"
                      aria-current={pathname === item.href ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      style={{
                        background: pathname === item.href ? "var(--accent-muted)" : "transparent",
                        color: pathname === item.href ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {item.label}
                    </Link>
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openCommandPalette();
                  }}
                  className="text-left rounded-2xl px-4 py-3 text-sm transition-colors hover:text-white flex items-center gap-1.5 bg-transparent border-none cursor-pointer mt-2"
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
