"use client";

import { cn } from "@/lib/utils";

export function AtlasMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("atlas-mark", `atlas-mark-${size}`, className)} aria-hidden="true">
      <span className="atlas-mark-orbit atlas-mark-orbit-outer" />
      <span className="atlas-mark-orbit atlas-mark-orbit-inner" />
      <span className="atlas-mark-core" />
    </span>
  );
}
