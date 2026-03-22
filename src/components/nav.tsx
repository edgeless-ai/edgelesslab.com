"use client";

import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1280px] mx-auto px-6 pt-5">
        <div
          className="flex items-center justify-between h-12 px-5 rounded-full border backdrop-blur-xl"
          style={{
            background: "rgba(17, 17, 19, 0.7)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <a
            href="/"
            className="text-sm font-semibold tracking-tight font-mono hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-primary)" }}
          >
            edgeless
          </a>
          <div className="flex items-center gap-5">
            {[
              { label: "Projects", href: "/projects" },
              { label: "Products", href: "/products" },
              { label: "Lab", href: "/lab" },
              { label: "Blog", href: "/blog" },
              { label: "About", href: "/about" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13px] hover:text-white transition-colors"
                style={{
                  color: pathname === link.href ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/edgeless-ai"
              className="text-[13px] hover:text-white transition-colors flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              GitHub <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
