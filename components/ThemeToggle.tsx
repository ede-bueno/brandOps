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

  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const variantClass =
    variant === "panel"
      ? "border border-outline/24 bg-surface-container-low/56 text-on-surface-variant hover:border-on-surface/10 hover:bg-surface-container/82 hover:text-on-surface"
      : "border border-outline/6 bg-surface-container-low/18 text-on-surface-variant/68 hover:border-on-surface/8 hover:bg-surface-container/40 hover:text-on-surface";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className={`atlas-theme-toggle inline-flex items-center justify-center rounded-xl transition-all duration-150 ${sizeClass} ${variantClass}`}
    >
      {isDark ? <Sun size={size === "sm" ? 14 : 15} /> : <Moon size={size === "sm" ? 14 : 15} />}
    </button>
  );
}
