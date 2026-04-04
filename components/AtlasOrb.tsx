"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
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
  description = "Núcleo analítico do Atlas. Essa entidade vai evoluir para operar insights, alertas e recomendações proativas.",
  hints = DEFAULT_HINTS,
  panelAlign = "right",
  floating = false,
  storageKey = "atlas.orb.position",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: boolean;
  interactive?: boolean;
  title?: string;
  status?: string;
  description?: string;
  hints?: string[];
  panelAlign?: "left" | "right";
  floating?: boolean;
  storageKey?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (!floating || typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as { x: number; y: number };
      } catch {
        return null;
      }
    }

    return {
      x: window.innerWidth - 104,
      y: Math.max(96, window.innerHeight - 164),
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const sizeClass =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-[4.6rem] w-[4.6rem]" : "h-14 w-14";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const orbDimension = size === "sm" ? 40 : size === "lg" ? 74 : 56;

  const hintList = useMemo(() => hints.slice(0, 3), [hints]);

  const floatingPanelMeta = useMemo(() => {
    if (!floating || !position || !viewportSize.width || !viewportSize.height) {
      return null;
    }

    const centerX = position.x + orbDimension / 2;
    const centerY = position.y + orbDimension / 2;
    const openToLeft = centerX > viewportSize.width / 2;
    const openUpward = centerY > viewportSize.height / 2;

    const horizontalClass = openToLeft
      ? "right-0 origin-right"
      : "left-0 origin-left";
    const verticalClass = openUpward
      ? "bottom-[calc(100%+0.85rem)] origin-bottom"
      : "top-[calc(100%+0.85rem)] origin-top";

    return {
      className: `${horizontalClass} ${verticalClass}`,
      sideX: openToLeft ? "left" : "right",
      sideY: openUpward ? "top" : "bottom",
      shiftX: openToLeft ? "8px" : "-8px",
      shiftY: openUpward ? "8px" : "-8px",
    } as const;
  }, [floating, orbDimension, position, viewportSize.height, viewportSize.width]);

  const staticPanelMeta =
    panelAlign === "left"
      ? {
          className: "right-0 top-[calc(100%+0.85rem)] origin-top-right",
          sideX: "left",
          sideY: "bottom",
          shiftX: "8px",
          shiftY: "-8px",
        }
      : {
          className: "left-0 top-[calc(100%+0.85rem)] origin-top-left lg:left-auto lg:right-0 lg:origin-top-right",
          sideX: "right",
          sideY: "bottom",
          shiftX: "-8px",
          shiftY: "-8px",
        };

  const panelMeta = floatingPanelMeta ?? staticPanelMeta;

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

  useEffect(() => {
    if (!floating) return;

    function handleResize() {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      setPosition((current) => {
        if (!current) {
          return {
            x: window.innerWidth - 104,
            y: Math.max(96, window.innerHeight - 164),
          };
        }
        return clampPosition(current.x, current.y);
      });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [floating]);

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

  function persistPosition(next: { x: number; y: number }) {
    if (!floating || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function clampPosition(nextX: number, nextY: number) {
    if (typeof window === "undefined") return { x: nextX, y: nextY };
    const width = orbRef.current?.offsetWidth ?? 56;
    const height = orbRef.current?.offsetHeight ?? 56;
    const margin = 16;
    return {
      x: Math.min(Math.max(margin, nextX), window.innerWidth - width - margin),
      y: Math.min(Math.max(margin, nextY), window.innerHeight - height - margin),
    };
  }

  function handleFloatingPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!floating || !interactive || !position) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleFloatingPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    handlePointerMove(event);
    if (!floating || !dragStateRef.current) return;
    const drag = dragStateRef.current;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
      drag.moved = true;
      setIsDragging(true);
      setIsOpen(false);
    }
    if (!drag.moved) return;
    setPosition(clampPosition(drag.originX + deltaX, drag.originY + deltaY));
  }

  function handleFloatingPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!floating || !dragStateRef.current) return;
    const drag = dragStateRef.current;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
    if (drag.moved && position) {
      persistPosition(position);
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    handleToggle();
  }

  return (
    <span
      className={cn("atlas-orb-anchor", floating && "atlas-orb-floating", className)}
      style={floating && position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
      <button
        ref={orbRef}
        type="button"
        aria-label={interactive ? "Abrir camada de inteligência do Atlas" : "Atlas"}
        aria-expanded={interactive ? isOpen : undefined}
        onFocus={handlePointerEnter}
        onBlur={handlePointerLeave}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerMove={floating ? handleFloatingPointerMove : handlePointerMove}
        onPointerDown={floating ? handleFloatingPointerDown : undefined}
        onPointerUp={floating ? handleFloatingPointerUp : undefined}
        className={cn("atlas-orb", sizeClass, interactive && "atlas-orb-interactive")}
      >
        <span className="atlas-orb-core">
          {icon ? <Sparkles size={iconSize} className="text-primary" /> : null}
        </span>
      </button>

      {interactive ? (
        <div
          className={cn(
            "atlas-orb-panel pointer-events-none absolute z-40 w-[min(86vw,22rem)] transition duration-200",
            panelMeta.className,
            isOpen && !isDragging ? "atlas-orb-panel-open opacity-100" : "atlas-orb-panel-closed opacity-0",
          )}
          data-side-x={panelMeta.sideX}
          data-side-y={panelMeta.sideY}
          style={
            {
              "--atlas-orb-panel-shift-x": panelMeta.shiftX,
              "--atlas-orb-panel-shift-y": panelMeta.shiftY,
            } as CSSProperties
          }
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
                  {description}
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
