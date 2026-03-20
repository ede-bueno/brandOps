"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import { buildCampaignPerformance, buildDailyMediaSeries, computeBrandMetrics } from "@/lib/brandops/metrics";

export default function MediaPage() {
  const { activeBrand } = useBrandOps();

  if (!activeBrand || !activeBrand.media.length) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Importe o Meta Export.csv para analisar investimento, receita atribuída e desempenho por campanha."
      />
    );
  }

  const metrics = computeBrandMetrics(activeBrand);
  const dailyMedia = buildDailyMediaSeries(activeBrand);
  const campaigns = buildCampaignPerformance(activeBrand).slice(0, 8);
  const totalPurchases = activeBrand.media.reduce((sum, row) => sum + row.purchases, 0);
  const totalClicks = activeBrand.media.reduce((sum, row) => sum + row.linkClicks, 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">Mídia</h1>
        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
          Veja o investimento da Meta, a receita atribuída e o retorno das campanhas
          no período importado.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Investimento" value={currencyFormatter.format(metrics.mediaSpend)} />
        <MetricCard label="Receita atribuída" value={currencyFormatter.format(activeBrand.media.reduce((sum, row) => sum + row.purchaseValue, 0))} />
        <MetricCard label="Compras atribuídas" value={integerFormatter.format(totalPurchases)} />
        <MetricCard label="Cliques no link" value={integerFormatter.format(totalClicks)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Investimento x receita por dia
          </h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMedia}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,122,153,0.12)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatCompactDate}
                  stroke="#6b7a99"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7a99"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  formatter={(value) =>
                    currencyFormatter.format(Number(value ?? 0))
                  }
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #23293c",
                    backgroundColor: "#0c1324",
                    color: "#bcc7de",
                  }}
                />
                <Legend />
                <Bar dataKey="spend" name="Investimento" fill="#f43f5e" radius={[10, 10, 0, 0]} />
                <Bar dataKey="purchaseValue" name="Receita atribuída" fill="#4edea3" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Campanhas com maior investimento
          </h2>
          <div className="mt-5 space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.campaignName}
                className="rounded-2xl border border-outline bg-background p-4"
              >
                <p className="font-semibold text-on-surface">{campaign.campaignName}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
                  <span>Investimento: {currencyFormatter.format(campaign.spend)}</span>
                  <span>ROAS: {campaign.roas.toFixed(2)}x</span>
                  <span>Receita: {currencyFormatter.format(campaign.purchaseValue)}</span>
                  <span>Compras: {integerFormatter.format(campaign.purchases)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
