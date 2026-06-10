"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center rounded-full p-2 transition-colors"
      style={{ color: "var(--text-secondary)" }}
    >
      {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      <span className="sr-only">
        {resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </button>
  );
}
