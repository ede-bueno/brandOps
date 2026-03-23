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
    <div className="brandops-panel rounded-[28px] px-8 py-12 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
        {icon ?? <DefaultIcon size={22} />}
      </div>
      <h3 className="mt-5 font-headline text-xl font-semibold tracking-[-0.02em] text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-on-surface-variant">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-[0_2px_12px_rgba(95,212,168,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(95,212,168,0.4)]"
      >
        {ctaLabel}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
