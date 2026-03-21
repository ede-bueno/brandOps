import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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
  const accentMap = {
    default: {
      icon: Minus,
      badge: "bg-surface-container-high text-on-surface-variant",
      border: "border-outline",
    },
    positive: {
      icon: ArrowUpRight,
      badge: "bg-secondary/12 text-secondary",
      border: "border-secondary/20",
    },
    warning: {
      icon: ArrowDownRight,
      badge: "bg-tertiary/12 text-tertiary",
      border: "border-tertiary/20",
    },
  } as const;

  const config = accentMap[accent];
  const Icon = config.icon;

  return (
    <div
      className={`brandops-card rounded-[24px] border ${config.border} bg-[linear-gradient(180deg,rgba(13,21,40,0.95),rgba(9,16,29,0.95))] p-5 shadow-[0_16px_44px_rgba(0,0,0,0.18)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
          {label}
        </p>
        <span className={`inline-flex rounded-full p-2 ${config.badge}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-4 font-headline text-3xl font-semibold tracking-tight text-on-surface">
        {value}
      </p>
      {help ? (
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{help}</p>
      ) : null}
    </div>
  );
}
