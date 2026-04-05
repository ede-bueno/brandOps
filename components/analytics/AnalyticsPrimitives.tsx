"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { cn } from "@/lib/utils";

export type AnalyticsTone =
  | "default"
  | "positive"
  | "negative"
  | "warning"
  | "secondary"
  | "info";

export function AnalyticsPanel({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <SurfaceCard className={cn("h-full", className)}>
      <SectionHeading
        title={title}
        description={description}
        aside={eyebrow ? <span className="eyebrow">{eyebrow}</span> : undefined}
      />
      <div className={cn("mt-4 grid gap-3", bodyClassName)}>{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </SurfaceCard>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  description,
  tone = "default",
  href,
  actionLabel = "Abrir",
  footer,
}: {
  label: string;
  value: string;
  description: ReactNode;
  tone?: AnalyticsTone;
  href?: string;
  actionLabel?: string;
  footer?: ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="atlas-analytics-eyebrow">{label}</p>
          <p className="atlas-analytics-value mt-2" data-tone={tone}>
            {value}
          </p>
        </div>
        {href ? (
          <span className="atlas-analytics-action shrink-0">
            {actionLabel}
            <ChevronRight size={12} />
          </span>
        ) : null}
      </div>
      <div className="atlas-analytics-copy mt-2.5">{description}</div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </>
  );

  const className = "atlas-analytics-card text-left";

  if (href) {
    return (
      <Link href={href} className={className} data-tone={tone}>
        {content}
      </Link>
    );
  }

  return (
    <article className={className} data-tone={tone}>
      {content}
    </article>
  );
}

export function AnalyticsCalloutCard({
  eyebrow,
  title,
  description,
  footer,
  tone = "default",
  href,
  onClick,
  actionLabel = "Abrir",
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  footer?: ReactNode;
  tone?: AnalyticsTone;
  href?: string;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="atlas-analytics-eyebrow">{eyebrow}</p>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-on-surface">{title}</p>
        </div>
        {href ? (
          <span className="atlas-analytics-action shrink-0">
            {actionLabel}
            <ChevronRight size={12} />
          </span>
        ) : null}
      </div>
      <div className="atlas-analytics-copy mt-2.5">{description}</div>
      {footer ? <div className="mt-3 text-[11px] font-medium text-on-surface-variant">{footer}</div> : null}
    </>
  );

  const className = "atlas-analytics-card";

  if (href) {
    return (
      <Link href={href} className={className} data-tone={tone}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={className} data-tone={tone} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <article className={className} data-tone={tone}>
      {content}
    </article>
  );
}
