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
      iconBg: "bg-surface-container-high text-on-surface-variant",
      border: "border-outline/60",
      bar: "bg-on-surface-variant/20",
    },
    positive: {
      icon: ArrowUpRight,
      iconBg: "bg-primary/12 text-primary",
      border: "border-primary/20",
      bar: "bg-primary/30",
    },
    warning: {
      icon: ArrowDownRight,
      iconBg: "bg-tertiary/12 text-tertiary",
      border: "border-tertiary/20",
      bar: "bg-tertiary/30",
    },
  } as const;

  const config = accentMap[accent];
  const Icon = config.icon;

  return (
    <div
      className={`brandops-card relative overflow-hidden rounded-[22px] border ${config.border} p-5`}
    >
      {/* Decorative top bar */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${config.bar}`} />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
          {label}
        </p>
        <span className={`inline-flex shrink-0 rounded-xl p-2 ${config.iconBg}`}>
          <Icon size={14} />
        </span>
      </div>

      <p className="mt-4 font-headline text-[28px] font-semibold leading-none tracking-tight text-on-surface">
        {value}
      </p>

      {help && (
        <p className="mt-2.5 text-xs leading-5 text-on-surface-variant">{help}</p>
      )}
    </div>
  );
}
