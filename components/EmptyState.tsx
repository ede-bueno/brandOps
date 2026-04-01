import Link from "next/link";
import { ArrowRight, Inbox, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  ctaHref = "/import",
  ctaLabel = "Importar dados",
  icon,
  variant = "default",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon?: ReactNode;
  variant?: "default" | "error";
}) {
  const iconBg = variant === "error"
    ? "bg-error/10 text-error"
    : "bg-secondary/10 text-secondary";

  const DefaultIcon = variant === "error" ? AlertTriangle : Inbox;

  return (
    <div className="brandops-panel px-7 py-9 text-center">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
        {icon ?? <DefaultIcon size={22} />}
      </div>
      <h3 className="mt-4 font-headline text-lg font-semibold tracking-[-0.02em] text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:brightness-95"
      >
        {ctaLabel}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
