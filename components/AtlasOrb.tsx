"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_HINTS = [
  "Atlas está observando margem, mídia e catálogo em tempo real.",
  "Em breve, o orbe vai antecipar desvios e sugerir ações antes da queda.",
  "Passe o mouse ou toque para abrir a camada proativa de inteligência.",
];

export function AtlasOrb({
  size = "md",
  className,
  icon = true,
  interactive = true,
  title = "Atlas Intelligence",
  status = "Entidade ativa",
  hints = DEFAULT_HINTS,
  panelAlign = "right",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: boolean;
  interactive?: boolean;
  title?: string;
  status?: string;
  hints?: string[];
  panelAlign?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const orbRef = useRef<HTMLButtonElement | null>(null);

  const sizeClass =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-[4.6rem] w-[4.6rem]" : "h-14 w-14";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const panelClass =
    panelAlign === "left"
      ? "right-0 origin-top-right"
      : "left-0 origin-top-left lg:left-auto lg:right-0 lg:origin-top-right";

  const hintList = useMemo(() => hints.slice(0, 3), [hints]);

  useEffect(() => {
    if (!isPinned) return;

    function handlePointerDown(event: PointerEvent) {
      if (!orbRef.current) return;
      if (!orbRef.current.parentElement?.contains(event.target as Node)) {
        setIsPinned(false);
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isPinned]);

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!interactive) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width).toFixed(2);
    const y = ((event.clientY - bounds.top) / bounds.height).toFixed(2);
    event.currentTarget.style.setProperty("--atlas-orb-x", x);
    event.currentTarget.style.setProperty("--atlas-orb-y", y);
  }

  function handlePointerEnter() {
    if (!interactive) return;
    setIsOpen(true);
  }

  function handlePointerLeave() {
    if (!interactive || isPinned) return;
    setIsOpen(false);
  }

  function handleToggle() {
    if (!interactive) return;
    setIsPinned((current) => !current);
    setIsOpen(true);
  }

  return (
    <span className={cn("atlas-orb-anchor", className)}>
      <button
        ref={orbRef}
        type="button"
        aria-label={interactive ? "Abrir camada de inteligência do Atlas" : "Atlas"}
        aria-expanded={interactive ? isOpen : undefined}
        onClick={handleToggle}
        onFocus={handlePointerEnter}
        onBlur={handlePointerLeave}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        className={cn("atlas-orb", sizeClass, interactive && "atlas-orb-interactive")}
      >
        <span className="atlas-orb-core">
          {icon ? <Sparkles size={iconSize} className="text-primary" /> : null}
        </span>
      </button>

      {interactive ? (
        <div
          className={cn(
            "atlas-orb-panel pointer-events-none absolute top-[calc(100%+0.85rem)] z-40 w-[min(86vw,22rem)] transition duration-200",
            panelClass,
            isOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-1.5 scale-[0.985] opacity-0",
          )}
        >
          <div className="atlas-orb-panel-inner">
            <div className="flex items-start gap-3">
              <div className="atlas-orb-panel-icon">
                <BrainCircuit size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-headline text-sm font-semibold tracking-tight text-on-surface">
                    {title}
                  </p>
                  <span className="atlas-orb-status">{status}</span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                  Núcleo analítico do Atlas. Essa entidade vai evoluir para operar insights, alertas e recomendações proativas.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {hintList.map((hint) => (
                <div key={hint} className="atlas-orb-insight">
                  <TrendingUp size={13} className="shrink-0 text-primary" />
                  <span>{hint}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-outline/70 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Camada proativa
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                aprendendo
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </span>
  );
}
