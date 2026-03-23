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
  accent?: "default" | "positive" | "warning" | "secondary";
}) {
  const accentMap = {
    default: { icon: Minus, iconColor: "text-on-surface-variant" },
    positive: { icon: ArrowUpRight, iconColor: "text-primary" },
    warning: { icon: ArrowDownRight, iconColor: "text-tertiary" },
    secondary: { icon: ArrowUpRight, iconColor: "text-secondary" },
  } as const;


  const config = accentMap[accent];
  const Icon = config.icon;

  return (
    <div className="brandops-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <Icon size={14} className={config.iconColor} />
      </div>

      <p className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
        {value}
      </p>

      {help && (
        <p className="mt-2 text-[11px] leading-4 text-on-surface-variant border-t border-outline/50 pt-2">
          {help}
        </p>
      )}
    </div>
  );
}
