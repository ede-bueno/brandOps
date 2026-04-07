"use client";

import Link from "next/link";
import { useId, useState, type FocusEvent, type ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";
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
    <section className="brandops-panel atlas-header-panel mb-2 p-3 sm:p-3.5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h1 className="font-headline text-[1.1rem] font-semibold tracking-tight text-on-surface sm:text-[1.32rem]">
              {title}
            </h1>
            {description && (
              <div className="mt-1 max-w-xl text-[10px] leading-[1.1rem] text-on-surface-variant/78 sm:text-[11px] sm:leading-5">
                {description}
              </div>
            )}
          </div>

          {badge ? (
            <div className="flex w-full flex-wrap items-center gap-1.5 lg:w-auto lg:justify-end">
              <div className="status-chip">{badge}</div>
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="atlas-header-actions-row flex min-w-0 flex-wrap items-center gap-2 border-t border-outline/50 pt-2.5">
            {actions}
          </div>
        ) : null}
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
    <div className="flex flex-col gap-1 border-b border-outline/60 pb-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-headline text-[13px] font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
        {description && (
          <div className="mt-0.5 max-w-xl text-[10px] leading-[1.15rem] text-on-surface-variant/78 sm:text-[11px]">
            {description}
          </div>
        )}
      </div>
      {aside && (
        <div className="mt-1.5 shrink-0 text-[11px] text-on-surface-variant sm:mt-0">
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
    <div className="atlas-sync-overlay fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div className="atlas-sync-stage atlas-tech-grid relative w-full max-w-md p-6 text-center">
        <div className="atlas-sync-grid" />
        <div className="atlas-sync-rings" />
        <div className="atlas-sync-scanline" />
        <div className="mx-auto flex items-center justify-center">
          <AtlasOrb size="lg" className="atlas-sync-orb" />
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-on-surface">{title}</div>
          {description ? (
            <div className="mt-1 text-[11px] leading-5 text-on-surface-variant">{description}</div>
          ) : null}
        </div>
        {aside ? <div className="shrink-0 text-[12px] font-semibold text-on-surface">{aside}</div> : null}
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
      {hint ? <span className="text-[10px] leading-[1.15rem] text-on-surface-variant">{hint}</span> : null}
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

export function ModeTabs({
  items,
}: {
  items: Array<{
    label: string;
    href: string;
    active?: boolean;
  }>;
}) {
  return (
    <WorkspaceTabs
      items={items.map((item) => ({
        key: `${item.href}-${item.label}`,
        label: item.label,
        href: item.href,
        active: item.active,
      }))}
    />
  );
}

export function WorkspaceTabs({
  items,
  className = "",
}: {
  items: Array<{
    key?: string;
    label: ReactNode;
    active?: boolean;
    href?: string;
    onClick?: () => void;
  }>;
  className?: string;
}) {
  return (
    <div className={`brandops-subtabs ${className}`.trim()}>
      {items.map((item) => (
        item.href ? (
          <Link
            key={item.key ?? `${item.href}-${String(item.label)}`}
            href={item.href}
            prefetch={false}
            className="brandops-subtab"
            data-active={item.active ? "true" : "false"}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key ?? String(item.label)}
            type="button"
            onClick={item.onClick}
            className="brandops-subtab"
            data-active={item.active ? "true" : "false"}
          >
            {item.label}
          </button>
        )
      ))}
    </div>
  );
}

export function ModeEntryCard({
  eyebrow,
  title,
  description,
  href,
  actionLabel = "Abrir",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  href: string;
  actionLabel?: string;
}) {
  return (
    <Link href={href} prefetch={false} className="atlas-mode-entry">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{eyebrow}</div>
          <div className="mt-2 text-[15px] font-semibold tracking-tight text-on-surface">
            {title}
          </div>
        </div>
        <span className="atlas-analytics-action shrink-0">
          {actionLabel}
          <ArrowUpRight size={12} />
        </span>
      </div>
      <div className="mt-2 text-[12px] leading-6 text-on-surface-variant">{description}</div>
    </Link>
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
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-outline/70 bg-surface-container-low text-on-surface-variant transition hover:border-outline hover:text-on-surface"
      >
        <Info size={10} />
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
