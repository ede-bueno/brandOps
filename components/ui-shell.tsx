"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

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
    <section className="brandops-panel p-4 mb-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
            {title}
          </h1>
          {description && (
            <div className="mt-1.5 max-w-3xl text-xs leading-5 text-on-surface-variant">
              {description}
            </div>
          )}
        </div>

        {(actions ?? badge) && (
          <div className="flex flex-col items-start gap-2.5 lg:items-end">
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
    <section id={id} className={`brandops-panel p-4 ${className}`.trim()}>
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  description,
  aside,
}: {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-outline pb-2.5">
      <div>
        <h2 className="font-headline text-[15px] font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
        {description && (
          <div className="mt-0.5 text-xs text-on-surface-variant leading-5">
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
            : "border-red-200 bg-red-50 text-red-900"
        }`}
      >
        {message}
      </div>
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="mt-4 font-headline text-xl font-semibold tracking-tight text-on-surface">
          {title}
        </h3>
        <div className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</div>
      </div>
    </div>
  );
}
