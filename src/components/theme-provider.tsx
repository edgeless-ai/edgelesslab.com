"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  useCallback,
  useMemo,
  useInsertionEffect,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

const STORAGE_KEY = "edgeless-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* localStorage blocked */ }
  return "system";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

function subscribe(callback: () => void) {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", handler);
  return () => {
    window.removeEventListener("storage", handler);
    mql.removeEventListener("change", handler);
  };
}

function getSnapshot(): Theme {
  return getStoredTheme();
}

function getServerSnapshot(): Theme {
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolvedTheme = useMemo(() => getResolvedTheme(theme), [theme]);

  const applyTheme = useCallback((next: "light" | "dark") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", next);
    root.style.colorScheme = next;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* localStorage blocked */ }
    // Notify all subscribers (including this instance) that the store changed
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  const toggleTheme = useCallback(() => {
    const current = theme === "system" ? getSystemTheme() : theme;
    setTheme(current === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Apply theme to DOM synchronously when resolvedTheme changes.
  // useInsertionEffect ensures the attribute is set before paint,
  // preventing flash-of-unstyled-content on hydration.
  useInsertionEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme, applyTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
