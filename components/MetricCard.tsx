export function MetricCard({
  label,
  value,
  help,
  accent = "default",
}: {
  label: string;
  value: string;
  help?: string;
  accent?: "default" | "positive" | "warning";
}) {
  const accentClass =
    accent === "positive"
      ? "border-secondary/30"
      : accent === "warning"
        ? "border-tertiary/30"
        : "border-outline";

  return (
    <div className={`rounded-2xl border ${accentClass} bg-surface-container p-5`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-on-surface">{value}</p>
      {help ? (
        <p className="mt-2 text-sm text-on-surface-variant">{help}</p>
      ) : null}
    </div>
  );
}
