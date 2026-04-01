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
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import {
  buildCampaignPerformance,
  buildDailyMediaSeries,
  getActiveMediaRows,
} from "@/lib/brandops/metrics";

export default function MediaPage() {
  const { 
    activeBrand, 
    activeBrandId,
    brands,
    filteredBrand, 
    selectedPeriodLabel, 
    isLoading: isDatasetLoading 
  } = useBrandOps();
  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";
  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || !activeBrand || !filteredBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Aquisição"
          title="Mídia"
          description={`Carregando os dados de mídia da loja ${selectedBrandName}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[300px] bg-surface-container rounded-3xl" />
            <div className="h-[300px] bg-surface-container rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma marca para visualizar o relatório de mídia."
      />
    );
  }

  if (!activeBrand || !filteredBrand) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o relatório de mídia da loja selecionada."
      />
    );
  }

  if (!filteredBrand.media.length) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Importe o Meta Export.csv para analisar investimento, receita atribuída e desempenho por campanha."
      />
    );
  }

  const activeMedia = getActiveMediaRows(filteredBrand);
  const dailyMedia = buildDailyMediaSeries(filteredBrand);
  const campaigns = buildCampaignPerformance(filteredBrand);
  const mediaSpend = activeMedia.reduce((sum, row) => sum + row.spend, 0);
  const totalPurchases = activeMedia.reduce((sum, row) => sum + row.purchases, 0);
  const totalClicksAll = activeMedia.reduce((sum, row) => sum + row.clicksAll, 0);
  const totalLinkClicks = activeMedia.reduce((sum, row) => sum + row.linkClicks, 0);
  const attributedRevenue = activeMedia.reduce((sum, row) => sum + row.purchaseValue, 0);
  const totalReach = activeMedia.reduce((sum, row) => sum + row.reach, 0);
  const totalImpressions = activeMedia.reduce((sum, row) => sum + row.impressions, 0);
  const attributedRoas = mediaSpend ? attributedRevenue / mediaSpend : 0;
  const ctrAll = totalImpressions ? totalClicksAll / totalImpressions : 0;
  const ctrLink = totalImpressions ? totalLinkClicks / totalImpressions : 0;
  const cpc = totalLinkClicks ? mediaSpend / totalLinkClicks : 0;
  const cpm = totalImpressions ? (mediaSpend / totalImpressions) * 1000 : 0;
  const cpa = totalPurchases ? mediaSpend / totalPurchases : 0;

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
        <MetricCard
          label="Investimento"
          value={currencyFormatter.format(mediaSpend)}
          help="Gasto ativo da Meta no período saneado."
        />
        <MetricCard
          label="Receita atribuída"
          value={currencyFormatter.format(attributedRevenue)}
          accent="positive"
          help="Valor de conversão da compra exportado pela Meta."
        />
        <MetricCard
          label="Compras Meta"
          value={integerFormatter.format(totalPurchases)}
          help="Volume de compras atribuídas pela plataforma."
        />
        <MetricCard
          label="Cliques no link"
          value={integerFormatter.format(totalLinkClicks)}
          help="Base usada para CTR e CPC."
        />
        <MetricCard
          label="ROAS atribuído"
          value={`${attributedRoas.toFixed(2)}x`}
          help="Receita atribuída dividida pelo investimento."
          accent={attributedRoas >= 1 ? "positive" : "warning"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Alcance"
          value={integerFormatter.format(totalReach)}
          help="Pessoas alcançadas no período."
        />
        <MetricCard
          label="Impressões"
          value={integerFormatter.format(totalImpressions)}
          help="Entrega bruta registrada pela Meta."
        />
        <MetricCard
          label="CTR (todos)"
          value={percentFormatter.format(ctrAll)}
          help="CTR geral da Meta: cliques totais divididos por impressões."
          accent={ctrAll >= 0.02 ? "positive" : "default"}
        />
        <MetricCard
          label="CPC"
          value={currencyFormatter.format(cpc)}
          help="Investimento dividido por cliques no link."
          accent={cpc <= 1.5 && cpc > 0 ? "positive" : "default"}
        />
        <MetricCard
          label="CPM"
          value={currencyFormatter.format(cpm)}
          help="Investimento por mil impressões."
          accent={cpm <= 30 && cpm > 0 ? "positive" : "default"}
        />
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
              description="Ranking por gasto, resultado atribuído e eficiência operacional."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[1080px] w-full">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th className="text-right">Investimento</th>
                  <th className="text-right">Cliques</th>
                  <th className="text-right">CTR</th>
                  <th className="text-right">CPC</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">CPA</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const campaignCtr = campaign.impressions ? campaign.clicks / campaign.impressions : 0;
                  const campaignCpc = campaign.clicks ? campaign.spend / campaign.clicks : 0;
                  const campaignCpa = campaign.purchases ? campaign.spend / campaign.purchases : 0;

                  return (
                    <tr key={campaign.campaignName}>
                      <td className="max-w-[320px] truncate font-semibold text-on-surface">
                        {campaign.campaignName}
                      </td>
                      <td className="text-right">{currencyFormatter.format(campaign.spend)}</td>
                      <td className="text-right">{integerFormatter.format(campaign.clicks)}</td>
                      <td className="text-right">{percentFormatter.format(campaignCtr)}</td>
                      <td className="text-right">{currencyFormatter.format(campaignCpc)}</td>
                      <td className="text-right">{integerFormatter.format(campaign.purchases)}</td>
                      <td className="text-right">
                        {campaign.purchases ? currencyFormatter.format(campaignCpa) : "-"}
                      </td>
                      <td className="text-right">
                        {currencyFormatter.format(campaign.purchaseValue)}
                      </td>
                      <td className="text-right font-semibold text-on-surface">
                        {campaign.roas.toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Leitura rápida de eficiência"
          description="Indicadores auxiliares para entender qualidade do tráfego e custo de aquisição no período."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="panel-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CPC atual</p>
            <p className="mt-2 text-xl font-semibold text-on-surface">{currencyFormatter.format(cpc)}</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              Quanto você paga, em média, por clique no link.
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CTR link</p>
            <p className="mt-2 text-xl font-semibold text-on-surface">{percentFormatter.format(ctrLink)}</p>
            <p className="mt-2 text-xs text-on-surface-variant">
              Sinal de aderência do anúncio com a audiência entregue.
            </p>
          </div>
          <div className="panel-muted p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">CPA meta</p>
            <p className="mt-2 text-xl font-semibold text-on-surface">
              {totalPurchases ? currencyFormatter.format(cpa) : "-"}
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">
              Investimento dividido pelas compras atribuídas pela Meta.
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
