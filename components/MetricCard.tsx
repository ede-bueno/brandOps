import { createElement } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  HandCoins,
  Landmark,
  Minus,
  Package2,
  Radar,
  Receipt,
  Scale,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string;
  help?: string;
  accent?: "default" | "positive" | "negative" | "warning" | "secondary" | "info";
  href?: string;
  detailLabel?: string;
  variation?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
}

function resolveIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();

  if (normalized.includes("pedido")) return ShoppingCart;
  if (normalized.includes("item")) return Boxes;
  if (normalized.includes("ticket")) return Gauge;
  if (normalized.includes("fatur")) return CircleDollarSign;
  if (normalized.includes("desconto")) return BadgePercent;
  if (normalized.includes("comissão") || normalized.includes("comissao")) return HandCoins;
  if (normalized.includes("mídia") || normalized.includes("midia")) return Radar;
  if (normalized.includes("cmv")) return Package2;
  if (normalized.includes("despesa")) return Receipt;
  if (normalized.includes("margem")) return Scale;
  if (normalized.includes("equilíbrio") || normalized.includes("equilibrio")) return Landmark;
  if (normalized.includes("roas") || normalized.includes("cpa") || normalized.includes("ctr")) return Activity;

  return BarChart3;
}

export function MetricCard({
  label,
  value,
  help,
  accent = "default",
  href,
  detailLabel = "Abrir detalhe",
  variation,
  icon: CustomIcon,
}: MetricCardProps) {
  const accentMap = {
    default: {
      icon: BarChart3,
      iconColor: "text-on-surface-variant",
    },
    positive: {
      icon: ArrowUpRight,
      iconColor: "atlas-semantic-positive",
    },
    negative: {
      icon: ArrowDownRight,
      iconColor: "atlas-semantic-negative",
    },
    warning: {
      icon: ArrowDownRight,
      iconColor: "atlas-semantic-warning",
    },
    secondary: {
      icon: ArrowUpRight,
      iconColor: "atlas-semantic-info",
    },
    info: {
      icon: Activity,
      iconColor: "atlas-semantic-info",
    },
  } as const;

  const config = accentMap[accent];
  const resolvedIcon = CustomIcon ?? resolveIcon(label) ?? config.icon;

  const getVariationClass = (trend: string) => {
    if (trend === "up") return "bg-primary-container/45 text-primary border-primary/20";
    if (trend === "down") return "bg-error-container/45 text-error border-error/20";
    return "bg-surface-container-high text-on-surface-variant border-outline";
  };

  const cardBody = (
    <>
      <div className="relative z-10 mb-2 flex min-h-[1.85rem] items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/80">
            {label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {href ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant transition group-hover:text-secondary">
              {detailLabel}
              <ChevronRight size={12} />
            </span>
          ) : null}
          <div className="atlas-metric-icon-shell flex h-6 w-6 items-center justify-center sm:h-6.5 sm:w-6.5">
            {createElement(resolvedIcon, { size: 13, className: config.iconColor })}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-end gap-3">
          <p className="atlas-data-value atlas-metric-value font-headline text-[clamp(1.18rem,4.4vw,1.82rem)] font-semibold leading-none tracking-tight">
            {value}
          </p>
          {variation && (
            <span
              className={`mb-1 inline-flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${getVariationClass(
                variation.trend,
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
          <p className="mt-2 min-h-[1.8rem] border-t border-outline-variant/45 pt-2 text-[10px] font-medium leading-relaxed text-on-surface-variant sm:text-[10.5px]">
            {help}
          </p>
        )}
      </div>
    </>
  );

  const shellClass = `atlas-metric-card brandops-card group flex min-h-[7rem] flex-col justify-between p-3.25 sm:min-h-[7.6rem] sm:p-3.75`;

  if (href) {
    return (
      <Link href={href} className={shellClass} data-accent={accent}>
        {cardBody}
      </Link>
    );
  }

  return (
    <div className={shellClass} data-accent={accent}>
      {cardBody}
    </div>
  );
}
