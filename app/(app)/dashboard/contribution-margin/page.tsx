"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ContributionTrendPanel, mapContributionTrendPoints } from "@/components/finance/ContributionTrendPanel";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { cn } from "@/lib/utils";

export default function ContributionMarginPage() {
  const [viewMode, setViewMode] = useState<"historical" | "filtered">("historical");
  const {
    activeBrand,
    activeBrandId,
    brands,
    selectedPeriodLabel,
    isLoading: isDatasetLoading,
    financialReportFiltered,
    financialReportHistorical,
    isDreLoading,
  } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isDreLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Control Tower"
          title="Margem de contribuição"
          description={`Carregando a série histórica da loja ${selectedBrandName}.`}
          badge={selectedPeriodLabel}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-surface-container" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="h-[360px] rounded-2xl bg-surface-container" />
            <div className="h-[360px] rounded-2xl bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Escolha uma loja para abrir o histórico da margem de contribuição."
      />
    );
  }

  const report = viewMode === "historical" ? financialReportHistorical : financialReportFiltered;

  if (!report) {
    return (
      <EmptyState
        title="Histórico indisponível"
        description="Não foi possível consolidar a evolução da margem para esta loja."
      />
    );
  }

  const trendData = mapContributionTrendPoints(report.months);
  const analysis = report.analysis;
  const bestMonth = analysis.bestContributionMonth;
  const worstMonth = analysis.worstContributionMonth;
  const latestMonth = analysis.latestMonth;
  const momentum = analysis.momentum;
  const mediaShare = analysis.shares.mediaShare;
  const cmvShare = analysis.shares.cmvShare;
  const expenseShare = analysis.shares.expenseShare;
  const viewBadge =
    viewMode === "historical"
      ? "Série histórica completa"
      : `Mesmo recorte ativo da Control Tower: ${selectedPeriodLabel}`;
  const contributionCardLabel =
    viewMode === "historical" ? "Contribuição acumulada" : "Contribuição do recorte";
  const contributionCardHelp =
    viewMode === "historical"
      ? "Soma da margem de contribuição em toda a série histórica disponível."
      : "Margem de contribuição consolidada no filtro atual da Control Tower.";
  const resultCardLabel =
    viewMode === "historical" ? "Resultado acumulado" : "Resultado do recorte";
  const resultCardHelp =
    viewMode === "historical"
      ? "Resultado líquido histórico após despesas operacionais em toda a série."
      : "Mesmo resultado líquido exibido no recorte atual do DRE e da Control Tower.";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control Tower"
        title="Margem de contribuição"
        description="Leitura histórica da capacidade da operação de transformar receita líquida em margem antes das despesas fixas."
        badge={viewBadge}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="brandops-tabs">
              <button
                type="button"
                className="brandops-tab"
                data-active={viewMode === "historical"}
                onClick={() => setViewMode("historical")}
              >
                Histórico
              </button>
              <button
                type="button"
                className="brandops-tab"
                data-active={viewMode === "filtered"}
                onClick={() => setViewMode("filtered")}
              >
                Filtro atual
              </button>
            </div>
            <Link href="/dashboard" className="brandops-button brandops-button-secondary">
              <ArrowLeft size={14} />
              Voltar para a Control Tower
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label={contributionCardLabel}
          value={currencyFormatter.format(report.total.contributionAfterMedia)}
          accent={report.total.contributionAfterMedia >= 0 ? "positive" : "warning"}
          help={contributionCardHelp}
        />
        <MetricCard
          label={resultCardLabel}
          value={currencyFormatter.format(report.total.netResult)}
          accent={report.total.netResult >= 0 ? "positive" : "warning"}
          help={resultCardHelp}
        />
        <MetricCard
          label="Margem de contribuição"
          value={percentFormatter.format(report.total.contributionMargin)}
          accent={report.total.contributionMargin >= 0 ? "positive" : "warning"}
          help="Participação da contribuição sobre a receita líquida disponível."
        />
        <MetricCard
          label="Melhor mês"
          value={bestMonth ? currencyFormatter.format(bestMonth.contributionAfterMedia) : "N/A"}
          help={bestMonth ? `${bestMonth.label}` : "Sem histórico suficiente"}
          accent="positive"
        />
        <MetricCard
          label="Pior mês"
          value={worstMonth ? currencyFormatter.format(worstMonth.contributionAfterMedia) : "N/A"}
          help={worstMonth ? `${worstMonth.label}` : "Sem histórico suficiente"}
          accent={worstMonth && worstMonth.contributionAfterMedia < 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.32fr_0.68fr]">
        <SurfaceCard>
          <SectionHeading
            title="Evolução mensal"
            description="A área verde mostra a margem antes das despesas. A linha azul acompanha o resultado final após despesas operacionais."
            aside={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="status-chip">
                  {viewMode === "historical" ? "Comparando toda a série" : "Comparando o recorte atual"}
                </span>
                {latestMonth ? (
                  <span className="status-chip">
                    Último mês: {latestMonth.label}
                  </span>
                ) : null}
              </div>
            }
          />
          <div className="mt-5">
            <ContributionTrendPanel data={trendData} />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading
              title={momentum.title}
              description={momentum.description}
            />
            <div className="mt-5 space-y-4">
              <article
                className={cn(
                  "panel-muted p-4",
                  momentum.tone === "positive" && "border-primary/20 bg-primary-container/30",
                  momentum.tone === "warning" && "border-tertiary/20 bg-tertiary-container/28",
                )}
              >
                <div className="flex items-center gap-2">
                  {momentum.tone === "positive" ? (
                    <TrendingUp size={16} className="text-primary" />
                  ) : momentum.tone === "warning" ? (
                    <TrendingDown size={16} className="text-tertiary" />
                  ) : null}
                  <p className="text-sm font-semibold text-on-surface">
                    Janela mais recente
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {latestMonth
                    ? `Em ${latestMonth.label}, a operação entregou ${currencyFormatter.format(latestMonth.contributionAfterMedia)} de contribuição e ${currencyFormatter.format(latestMonth.netResult)} de resultado após despesas.`
                    : "Sem mês recente disponível."}
                </p>
              </article>

              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Pressão sobre a receita líquida
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">CMV</span>
                      <span className="font-semibold text-on-surface">
                        {percentFormatter.format(cmvShare)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(cmvShare * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Mídia</span>
                      <span className="font-semibold text-on-surface">
                        {percentFormatter.format(mediaShare)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(mediaShare * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-on-surface-variant">Despesas operacionais</span>
                      <span className="font-semibold text-on-surface">
                        {percentFormatter.format(expenseShare)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high">
                      <div className="h-full rounded-full bg-tertiary" style={{ width: `${Math.min(expenseShare * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Leitura executiva"
              description="Atalhos para cruzar o histórico com as áreas que mais influenciam a margem."
            />
            <div className="mt-5 grid gap-3">
              <Link href="/dre" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
                <p className="font-semibold text-on-surface">Abrir DRE consolidado</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Conferir os meses com maior compressão de margem junto com despesas e resultado final.
                </p>
              </Link>
              <Link href="/media" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
                <p className="font-semibold text-on-surface">Cruzar com Performance Mídia</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Entender se a pressão veio de aumento de mídia, queda de ROAS ou mudança de mix.
                </p>
              </Link>
              <Link href="/cost-center" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
                <p className="font-semibold text-on-surface">Revisar lançamentos do DRE</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Validar se despesas operacionais ou competências recentes distorceram o resultado.
                </p>
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </section>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-outline p-5">
          <SectionHeading
            title="Linha do tempo mensal"
            description="Tabela de apoio para localizar exatamente quando a margem ganhou tração ou perdeu fôlego."
          />
        </div>
        <div className="brandops-table-container rounded-none border-0">
          <table className="brandops-table-compact w-full min-w-[860px]">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="text-right">RLD</th>
                <th className="text-right">CMV</th>
                <th className="text-right">Mídia</th>
                <th className="text-right">Margem contrib.</th>
                <th className="text-right">Despesas</th>
                <th className="text-right">Resultado</th>
                <th className="text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((point) => (
                <tr key={point.monthKey}>
                  <td className="font-medium text-on-surface">{point.label}</td>
                  <td className="text-right">{currencyFormatter.format(point.revenue)}</td>
                  <td className="text-right">{currencyFormatter.format(point.cmv)}</td>
                  <td className="text-right">{currencyFormatter.format(point.media)}</td>
                  <td className={cn("text-right font-semibold", point.contribution >= 0 ? "text-primary" : "text-tertiary")}>
                    {currencyFormatter.format(point.contribution)}
                  </td>
                  <td className="text-right">{currencyFormatter.format(point.expenses)}</td>
                  <td className={cn("text-right font-semibold", point.result >= 0 ? "text-secondary" : "text-tertiary")}>
                    {currencyFormatter.format(point.result)}
                  </td>
                  <td className="text-right">{percentFormatter.format(point.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
