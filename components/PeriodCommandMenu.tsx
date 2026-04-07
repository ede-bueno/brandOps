"use client";

import { useEffect, useRef } from "react";
import { CalendarRange, Check, ChevronDown, SlidersHorizontal } from "lucide-react";

import type { CustomDateRange, PeriodFilter } from "@/lib/brandops/types";

const periodOptions: Array<{ value: PeriodFilter; label: string; shortLabel?: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "14d", label: "14 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "year", label: "Ano atual" },
  { value: "lastMonth", label: "Mês passado" },
  { value: "all", label: "Todo período", shortLabel: "Tudo" },
  { value: "custom", label: "Período livre", shortLabel: "Livre" },
];

interface PeriodCommandMenuProps {
  open: boolean;
  selectedPeriod: PeriodFilter;
  selectedPeriodLabel: string;
  customDateRange: CustomDateRange;
  onToggle: () => void;
  onClose: () => void;
  onSelectPeriod: (period: PeriodFilter) => void;
  onChangeCustomDateRange: (next: CustomDateRange) => void;
}

export function PeriodCommandMenu({
  open,
  selectedPeriod,
  selectedPeriodLabel,
  customDateRange,
  onToggle,
  onClose,
  onSelectPeriod,
  onChangeCustomDateRange,
}: PeriodCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={menuRef} className="relative z-40">
      <button
        type="button"
        onClick={onToggle}
        className="atlas-period-trigger"
        aria-expanded={open}
        aria-label="Abrir filtro de período"
      >
        <span className="atlas-period-trigger-icon">
          <CalendarRange size={14} />
        </span>
        <span className="min-w-0">
          <span className="atlas-period-trigger-label">Recorte</span>
          <span className="atlas-period-trigger-value">
            {selectedPeriodLabel}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-on-surface-variant transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="atlas-period-menu brandops-panel-soft absolute right-0 top-[calc(100%+0.72rem)] z-50 w-[min(92vw,24rem)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Filtro rápido
              </p>
              <p className="mt-1 text-[12px] text-on-surface-variant">
                Escolha o recorte sem ocupar o header.
              </p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-outline/45 bg-surface-container-low/72 text-on-surface-variant">
              <SlidersHorizontal size={14} />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {periodOptions.map((option) => {
              const isActive = selectedPeriod === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  data-active={isActive ? "true" : "false"}
                  onClick={() => {
                    onSelectPeriod(option.value);
                    if (option.value !== "custom") {
                      onClose();
                    }
                  }}
                  className={`atlas-period-option flex min-h-[3rem] items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-outline/45 bg-surface-container-low/60 text-on-surface hover:border-primary/14 hover:bg-surface-container"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium leading-5">
                      {option.shortLabel ?? option.label}
                    </span>
                    <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                      {option.value === "custom" ? "manual" : "preset"}
                    </span>
                  </span>
                  {isActive ? <Check size={14} className="shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          {selectedPeriod === "custom" ? (
            <div className="brandops-toolbar-panel mt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">De</span>
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(event) =>
                      onChangeCustomDateRange({
                        ...customDateRange,
                        from: event.target.value,
                      })
                    }
                    className="brandops-input"
                  />
                </label>
                <label className="brandops-field-stack">
                  <span className="brandops-field-label">Até</span>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(event) =>
                      onChangeCustomDateRange({
                        ...customDateRange,
                        to: event.target.value,
                      })
                    }
                    className="brandops-input"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
