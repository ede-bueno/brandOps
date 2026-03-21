import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";

export function EmptyState({
  title,
  description,
  ctaHref = "/import",
  ctaLabel = "Importar dados",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="brandops-panel rounded-[28px] px-8 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
        <Inbox size={24} />
      </div>
      <h3 className="mt-5 font-headline text-2xl font-semibold tracking-tight text-on-surface">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary transition-transform hover:-translate-y-0.5"
      >
        {ctaLabel}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
