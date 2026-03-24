"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  buildCampaignPerformance,
  buildDailyMediaSeries,
  computeBrandMetrics,
  getActiveMediaRows,
} from "@/lib/brandops/metrics";

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
  const activeMedia = getActiveMediaRows(filteredBrand);
  const dailyMedia = buildDailyMediaSeries(filteredBrand);
  const campaigns = buildCampaignPerformance(filteredBrand);
  const totalPurchases = activeMedia.reduce((sum, row) => sum + row.purchases, 0);
  const totalClicks = activeMedia.reduce((sum, row) => sum + (row.linkClicks || row.clicksAll), 0);
  const attributedRevenue = activeMedia.reduce((sum, row) => sum + row.purchaseValue, 0);
  const attributedRoas = metrics.mediaSpend ? attributedRevenue / metrics.mediaSpend : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aquisição"
        title="Mídia"
        description="Visão objetiva do investimento, retorno atribuído e campanhas que mais consomem verba no período."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <Link href="/help#sanitization" className="brandops-button brandops-button-ghost">
            Revisar saneamento
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Investimento" value={currencyFormatter.format(metrics.mediaSpend)} />
        <MetricCard
          label="Receita atribuída"
          value={currencyFormatter.format(attributedRevenue)}
          accent="positive"
        />
        <MetricCard label="Compras Meta" value={integerFormatter.format(totalPurchases)} />
        <MetricCard label="Cliques" value={integerFormatter.format(totalClicks)} />
        <MetricCard label="ROAS atribuído" value={`${attributedRoas.toFixed(2)}x`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard>
          <SectionHeading
            title="Investimento por dia"
            description="Cadência do gasto diário para confrontar com os blocos de importação da Meta."
          />
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMedia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatCompactDate}
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
                />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Bar dataKey="spend" fill="var(--color-tertiary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Campanhas"
              description="Ranking por gasto, receita atribuída e volume de compras."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[760px] w-full">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th className="text-right">Investimento</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.campaignName}>
                    <td className="max-w-[360px] truncate font-semibold text-on-surface">
                      {campaign.campaignName}
                    </td>
                    <td className="text-right">{currencyFormatter.format(campaign.spend)}</td>
                    <td className="text-right">{integerFormatter.format(campaign.purchases)}</td>
                    <td className="text-right">
                      {currencyFormatter.format(campaign.purchaseValue)}
                    </td>
                    <td className="text-right font-semibold text-on-surface">
                      {campaign.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
