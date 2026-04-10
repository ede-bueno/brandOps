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

export function ThemeToggle({
  variant = "subtle",
  size = "md",
}: {
  variant?: "subtle" | "panel";
  size?: "sm" | "md";
}) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("brandops.theme");
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
    localStorage.setItem("brandops.theme", next ? "dark" : "light");
  }

  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const variantClass =
    variant === "panel"
      ? "atlas-theme-toggle-panel"
      : "atlas-theme-toggle-subtle";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className={`atlas-theme-toggle inline-flex items-center justify-center transition-all duration-150 ${sizeClass} ${variantClass}`}
    >
      {isDark ? <Sun size={size === "sm" ? 14 : 15} /> : <Moon size={size === "sm" ? 14 : 15} />}
    </button>
  );
}
