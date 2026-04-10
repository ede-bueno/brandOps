"use client";

import type { ReactNode } from "react";
import { SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { cn } from "@/lib/utils";

export function AnalyticsPanel({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  variant = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: "default" | "chart" | "callout";
}) {
  return (
    <SurfaceCard
      className={cn(
        variant === "chart"
          ? "atlas-panel-chart"
          : variant === "callout"
            ? "atlas-panel-callout"
            : "atlas-panel-default",
        className,
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        aside={eyebrow ? <span className="eyebrow">{eyebrow}</span> : undefined}
      />
      <div
        className={cn(
          variant === "chart"
            ? "atlas-panel-body atlas-panel-body-chart"
            : "atlas-panel-body atlas-panel-body-default",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? <div className="atlas-panel-footer">{footer}</div> : null}
    </SurfaceCard>
  );
}
