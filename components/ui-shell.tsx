"use client";

import type { ReactNode } from "react";

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
    <section className="brandops-panel brandops-panel-soft overflow-hidden rounded-[28px] px-5 py-5 lg:px-6 lg:py-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-5xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-2.5 font-headline text-3xl font-semibold tracking-tight text-[var(--color-ink-strong)] lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-2.5 max-w-4xl text-sm leading-7 text-[var(--color-ink-soft)]">
              {description}
            </div>
          ) : null}
        </div>
        {actions || badge ? (
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {badge ? <div className="status-chip">{badge}</div> : null}
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
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`brandops-panel brandops-panel-soft rounded-[28px] p-5 lg:p-6 ${className}`.trim()}>{children}</section>;
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-headline text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
          {title}
        </h2>
        {description ? (
          <div className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{description}</div>
        ) : null}
      </div>
      {aside ? <div className="text-sm text-[var(--color-ink-soft)]">{aside}</div> : null}
    </div>
  );
}
