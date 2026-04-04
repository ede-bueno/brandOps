"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(dark: boolean) {
  const html = document.documentElement;
  if (dark) {
    html.classList.remove("light");
    html.classList.add("dark");
    html.dataset.theme = "dark";
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
    html.dataset.theme = "light";
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("atlas.theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("atlas.theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline bg-surface-container text-on-surface-variant transition-all duration-150 hover:border-primary/40 hover:bg-brand-shell hover:text-primary"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
