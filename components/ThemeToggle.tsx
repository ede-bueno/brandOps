"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function applyTheme(dark: boolean) {
  const html = document.documentElement;
  if (dark) {
    html.classList.remove("light");
  } else {
    html.classList.add("light");
  }
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brandops.theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true; // default SSR
  });

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
    localStorage.setItem("brandops.theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline/70 bg-surface-container-high/40 text-on-surface-variant transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
