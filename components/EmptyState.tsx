import Link from "next/link";

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
    <div className="rounded-3xl border border-dashed border-outline bg-surface-container p-8 text-center">
      <h3 className="text-xl font-semibold text-on-surface">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
        {description}
      </p>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-on-secondary"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
