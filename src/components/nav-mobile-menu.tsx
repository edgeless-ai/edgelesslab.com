"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function MobileMenu({ links }: { links: { label: string; href: string }[] }) {
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
    <>
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

      {isOpen && (
        <div
          className="mt-3 rounded-[1.5rem] border p-3 backdrop-blur-xl md:hidden absolute left-0 right-0 top-full"
          style={{
            background: "rgba(17, 17, 19, 0.92)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                prefetch={false}
                className="rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-white/5"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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
          </div>
        </div>
      )}
    </>
  );
}
