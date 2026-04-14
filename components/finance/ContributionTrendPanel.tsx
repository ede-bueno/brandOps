"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";

export type ContributionTrendPoint = {
  monthKey: string;
  label: string;
  contribution: number;
  result: number;
  revenue: number;
  cmv: number;
  media: number;
  expenses: number;
  margin: number;
};

export function mapContributionTrendPoints(
  months: Array<{
    monthKey: string;
    label: string;
    metrics: {
      contributionAfterMedia: number;
      netResult: number;
      rld: number;
      cmvTotal: number;
      mediaSpend: number;
      fixedExpensesTotal: number;
      contributionMargin: number;
    };
  }>,
): ContributionTrendPoint[] {
  return months.map((month) => ({
    monthKey: month.monthKey,
    label: month.label,
    contribution: month.metrics.contributionAfterMedia,
    result: month.metrics.netResult,
    revenue: month.metrics.rld,
    cmv: month.metrics.cmvTotal,
    media: month.metrics.mediaSpend,
    expenses: month.metrics.fixedExpensesTotal,
    margin: month.metrics.contributionMargin,
  }));
}

export function ContributionTrendPanel({
  data,
  height = 320,
}: {
  data: ContributionTrendPoint[];
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3 text-[11px] leading-5 text-on-surface-variant">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Margem de contribuição
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-5 rounded-full bg-secondary" />
          Resultado após despesas
        </span>
      </div>

      <div className="mt-5 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={height - 12}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`contribution-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => currencyFormatter.format(Number(value ?? 0))}
              width={88}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 14,
                border: "1px solid var(--color-outline)",
                backgroundColor: "var(--color-surface)",
                boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
              }}
              formatter={(value, name) => {
                if (name === "margin") {
                  return [percentFormatter.format(Number(value ?? 0)), "Margem"];
                }

                return [currencyFormatter.format(Number(value ?? 0)), name];
              }}
              labelFormatter={(label, payload) => {
                const point = payload?.[0]?.payload as ContributionTrendPoint | undefined;
                if (!point) return String(label ?? "");

                return `${point.label} • margem ${percentFormatter.format(point.margin)}`;
              }}
            />
            <Area
              type="monotone"
              dataKey="contribution"
              name="Margem de contribuição"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill={`url(#contribution-${gradientId})`}
              dot={{ r: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="result"
              name="Resultado após despesas"
              stroke="var(--color-secondary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
