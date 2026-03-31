import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string;
  help?: string;
  accent?: "default" | "positive" | "warning" | "secondary";
  variation?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
}

export function MetricCard({
  label,
  value,
  help,
  accent = "default",
  variation,
  icon: CustomIcon,
}: MetricCardProps) {
  const accentMap = {
    default: { icon: Minus, iconColor: "text-ink-muted", bg: "bg-surface-container" },
    positive: { icon: ArrowUpRight, iconColor: "text-primary", bg: "bg-primary-container/30" },
    warning: { icon: ArrowDownRight, iconColor: "text-tertiary", bg: "bg-tertiary-container/30" },
    secondary: { icon: ArrowUpRight, iconColor: "text-secondary", bg: "bg-secondary-container/30" },
  } as const;

  const config = accentMap[accent];
  const Icon = CustomIcon || config.icon;

  const getVariationColor = (trend: string) => {
    if (trend === "up") return "text-primary bg-primary-container/50";
    if (trend === "down") return "text-error bg-error-container/50";
    return "text-ink-muted bg-surface-container-high";
  };

  return (
    <div className="brandops-card p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80">
          {label}
        </p>
        <div className={`p-1.5 rounded-lg ${config.bg} transition-colors`}>
          <Icon size={16} className={config.iconColor} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-3">
          <p className="font-headline text-3xl font-semibold tracking-tight text-on-surface">
            {value}
          </p>
          {variation && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${getVariationColor(
                variation.trend
              )}`}
            >
              {variation.trend === "up" && <ArrowUpRight size={12} />}
              {variation.trend === "down" && <ArrowDownRight size={12} />}
              {variation.trend === "neutral" && <Minus size={12} />}
              {variation.value}
            </span>
          )}
        </div>

        {help && (
          <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-muted/80 pt-3 border-t border-outline-variant/60">
            {help}
          </p>
        )}
      </div>

      {/* Decorative gradient blur */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-transparent to-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0 pointer-events-none" />
    </div>
  );
}
