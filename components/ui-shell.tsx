"use client";

import { useId, useState, type FocusEvent, type ReactNode } from "react";
import { Info } from "lucide-react";
import { AtlasOrb } from "./AtlasOrb";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="brandops-panel atlas-header-panel mb-2 p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="font-headline text-[1.38rem] font-semibold tracking-tight text-on-surface sm:text-[1.7rem]">
            {title}
          </h1>
          {description && (
            <div className="mt-1.5 max-w-3xl text-[11px] leading-5 text-on-surface-variant/90 sm:text-xs">
              {description}
            </div>
          )}
        </div>

        {(actions ?? badge) && (
          <div className="flex w-full flex-col items-start gap-2.5 lg:w-auto lg:items-end">
            {badge && <div className="status-chip">{badge}</div>}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

export function SurfaceCard({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`brandops-panel atlas-tech-grid p-4 ${className}`.trim()}>
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  description,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-outline/60 pb-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-headline text-[15px] font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
        {description && (
          <div className="mt-0.5 text-xs leading-5 text-on-surface-variant/90">
            {description}
          </div>
        )}
      </div>
      {aside && (
        <div className="shrink-0 text-xs text-on-surface-variant mt-2 sm:mt-0">
          {aside}
        </div>
      )}
    </div>
  );
}

export function ActionToast({
  message,
  tone = "success",
}: {
  message: string | null;
  tone?: "success" | "error";
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[75] max-w-sm">
      <div
        className={`brandops-panel px-4 py-3 text-sm shadow-xl ${
          tone === "success"
            ? "border-primary/20 bg-surface text-on-surface"
            : "border-error/25 bg-error-container/70 text-on-error-container"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

export function InlineNotice({
  tone = "info",
  icon,
  children,
  className = "",
}: {
  tone?: "success" | "error" | "warning" | "info";
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`atlas-inline-notice ${className}`.trim()} data-tone={tone}>
      {icon ? <span className="atlas-inline-notice-icon">{icon}</span> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ProcessingOverlay({
  open,
  title = "Processando",
  description = "Aguarde enquanto atualizamos os dados.",
}: {
  open: boolean;
  title?: string;
  description?: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-surface/55 px-4 backdrop-blur-sm">
      <div className="brandops-panel w-full max-w-md p-6 text-center shadow-2xl">
        <div className="mx-auto flex items-center justify-center">
          <AtlasOrb size="lg" />
        </div>
        <h3 className="mt-4 font-headline text-xl font-semibold tracking-tight text-on-surface">
          {title}
        </h3>
        <div className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</div>
      </div>
    </div>
  );
}

export function AtlasModal({
  open,
  title,
  description,
  onClose,
  children,
  mode = "side",
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  mode?: "side" | "center";
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] bg-surface/70 backdrop-blur-sm">
      <div
        className={`flex h-full ${
          mode === "side" ? "justify-end" : "items-center justify-center p-4"
        }`}
      >
        <div
          className={`brandops-panel border-outline shadow-2xl ${
            mode === "side"
              ? "h-full w-full max-w-xl overflow-y-auto rounded-none border-l p-6"
              : "w-full max-w-lg p-6"
          }`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-outline pb-4">
            <div>
              <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="brandops-button brandops-button-ghost min-h-9 w-9 px-0"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function StackItem({
  title,
  description,
  aside,
  tone = "default",
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  tone?: "default" | "positive" | "warning" | "negative" | "info";
  className?: string;
}) {
  return (
    <article className={`atlas-list-row ${className}`.trim()} data-tone={tone}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-on-surface">{title}</div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</div>
          ) : null}
        </div>
        {aside ? <div className="shrink-0 text-sm font-semibold text-on-surface">{aside}</div> : null}
      </div>
    </article>
  );
}

export function FormField({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`brandops-field-stack ${className}`.trim()}>
      <span className="brandops-field-label">{label}</span>
      {children}
      {hint ? <span className="text-[11px] leading-5 text-on-surface-variant">{hint}</span> : null}
    </label>
  );
}

export function EntityChip({
  icon,
  text,
  className = "",
}: {
  icon?: ReactNode;
  text: ReactNode;
  className?: string;
}) {
  return (
    <span className={`atlas-entity-chip ${className}`.trim()}>
      {icon ? <span className="atlas-entity-chip-icon">{icon}</span> : null}
      <span className="truncate">{text}</span>
    </span>
  );
}

export function InfoHint({
  label = "Mais contexto",
  children,
  align = "right",
}: {
  label?: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const descriptionId = useId();

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget && event.currentTarget.contains(nextTarget as Node)) {
      return;
    }
    setIsOpen(false);
  }

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={handleBlur}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={isOpen ? descriptionId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-outline/70 bg-surface-container-low text-on-surface-variant transition hover:border-secondary/30 hover:text-on-surface"
      >
        <Info size={11} />
      </button>

      {isOpen ? (
        <span
          id={descriptionId}
          role="tooltip"
          className={`atlas-tooltip-card absolute top-[calc(100%+0.45rem)] z-40 w-60 px-3 py-2.5 text-[11px] font-normal leading-5 text-on-surface-variant ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
