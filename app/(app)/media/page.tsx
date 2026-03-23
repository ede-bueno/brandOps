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
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import { buildCampaignPerformance, buildDailyMediaSeries, computeBrandMetrics } from "@/lib/brandops/metrics";

export default function MediaPage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand || !filteredBrand.media.length) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Importe o Meta Export.csv para analisar investimento, receita atribuída e desempenho por campanha."
      />
    );
  }

  const metrics = computeBrandMetrics(filteredBrand);
  const dailyMedia = buildDailyMediaSeries(filteredBrand);
  const campaigns = buildCampaignPerformance(filteredBrand).slice(0, 8);
  const totalPurchases = filteredBrand.media.reduce((sum, row) => sum + row.purchases, 0);
  const totalClicks = filteredBrand.media.reduce((sum, row) => sum + row.linkClicks, 0);
  const attributedRevenue = filteredBrand.media.reduce((sum, row) => sum + row.purchaseValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aquisição"
        title="Mídia"
        description="Veja investimento, receita atribuída e desempenho das campanhas da Meta no período."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Investimento" value={currencyFormatter.format(metrics.mediaSpend)} />
        <MetricCard label="Receita atribuída" value={currencyFormatter.format(attributedRevenue)} accent="positive" />
        <MetricCard label="Compras atribuídas" value={integerFormatter.format(totalPurchases)} />
        <MetricCard label="Cliques no link" value={integerFormatter.format(totalClicks)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionHeading
            title="Investimento x receita por dia"
            description="Compare gasto e retorno atribuído com visão diária."
          />
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMedia}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(157,176,197,0.12)" />
                <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#6d8095" tickLine={false} axisLine={false} />
                <YAxis stroke="#6d8095" tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(171, 201, 229, 0.14)",
                    backgroundColor: "#0b141d",
                    color: "#f3f7fb",
                  }}
                />
                <Legend />
                <Bar dataKey="spend" name="Investimento" fill="#ff8e6e" radius={[12, 12, 0, 0]} />
                <Bar dataKey="purchaseValue" name="Receita atribuída" fill="#8be1ff" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Campanhas com maior investimento"
            description="Priorize otimizações a partir das campanhas que mais consomem verba."
          />
          <div className="mt-5 space-y-3">
            {campaigns.map((campaign) => (
              <article key={campaign.campaignName} className="panel-muted p-4">
                <p className="font-semibold text-on-surface">{campaign.campaignName}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-on-surface-variant">
                  <span>Investimento: {currencyFormatter.format(campaign.spend)}</span>
                  <span>ROAS: {campaign.roas.toFixed(2)}x</span>
                  <span>Receita: {currencyFormatter.format(campaign.purchaseValue)}</span>
                  <span>Compras: {integerFormatter.format(campaign.purchases)}</span>
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
