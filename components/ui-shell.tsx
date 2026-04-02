"use client";

import type { ReactNode } from "react";
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
            <div className="mt-1.5 max-w-3xl text-[11px] leading-5 text-on-surface-variant sm:text-xs">
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
            : "border-error/25 bg-error-container/70 text-on-error-container"
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
