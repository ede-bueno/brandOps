"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { ContributionTrendPanel, mapContributionTrendPoints } from "@/components/finance/ContributionTrendPanel";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { cn } from "@/lib/utils";

export default function ContributionMarginPage() {
  const [viewMode, setViewMode] = useState<"historical" | "filtered">("historical");
  const [activeSection, setActiveSection] = useState<"radar" | "timeline">("radar");
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
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Torre de Controle"
          title="Margem de contribuição"
          description={`Carregando a série histórica da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
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
      : `Mesmo recorte ativo da Torre de Controle: ${selectedPeriodLabel}`;
  const contributionCardLabel =
    viewMode === "historical" ? "Contribuição acumulada" : "Contribuição do recorte";
  const contributionCardHelp =
    viewMode === "historical"
      ? "Soma da margem de contribuição em toda a série histórica disponível."
      : "Margem de contribuição consolidada no filtro atual da Torre de Controle.";
  const resultCardLabel =
    viewMode === "historical" ? "Resultado acumulado" : "Resultado do recorte";
  const resultCardHelp =
    viewMode === "historical"
      ? "Resultado líquido histórico após despesas operacionais em toda a série."
      : "Mesmo resultado líquido exibido no recorte atual do DRE e da Torre de Controle.";
  const primaryAction =
    report.total.contributionMargin < 0
      ? "Virar a contribuição antes de expandir mídia ou catálogo."
      : report.total.netResult < 0
        ? "Segurar pressão operacional até o resultado voltar para o azul."
        : momentum.title;
  const dominantPressure =
    Math.max(cmvShare, mediaShare, expenseShare) === cmvShare
      ? "CMV"
      : Math.max(cmvShare, mediaShare, expenseShare) === mediaShare
        ? "Mídia"
        : "Despesas operacionais";

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Torre de Controle"
        title="Margem de contribuição"
        description="Veja rápido onde a margem ganha ou perde tração e aprofunde só quando precisar."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{viewBadge}</span>
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
              Voltar para a Torre de Controle
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsCalloutCard
          eyebrow="Decisão da margem"
          title={primaryAction}
          description="O movimento mais útil agora para proteger contribuição e resultado."
          tone={report.total.contributionMargin >= 0 ? "info" : "warning"}
        />
        <AnalyticsCalloutCard
          eyebrow="Pressão dominante"
          title={dominantPressure}
          description="Hoje é o maior peso sobre a receita líquida disponível."
          tone="warning"
        />
        <AnalyticsCalloutCard
          eyebrow="Melhor leitura seguinte"
          title={report.total.contributionMargin < 0 ? "Abrir DRE consolidado" : "Cruzar com mídia"}
          description={
            report.total.contributionMargin < 0
              ? "Valide mês, despesas e resultado junto da matriz gerencial."
              : "Entenda se a margem ganhou ou perdeu tração por gasto ou retorno."
          }
          href={report.total.contributionMargin < 0 ? "/dre" : "/media"}
          tone="info"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AnalyticsKpiCard
          label={contributionCardLabel}
          value={currencyFormatter.format(report.total.contributionAfterMedia)}
          tone={report.total.contributionAfterMedia >= 0 ? "positive" : "warning"}
          description={contributionCardHelp}
        />
        <AnalyticsKpiCard
          label={resultCardLabel}
          value={currencyFormatter.format(report.total.netResult)}
          tone={report.total.netResult >= 0 ? "positive" : "warning"}
          description={resultCardHelp}
        />
        <AnalyticsKpiCard
          label="Margem de contribuição"
          value={percentFormatter.format(report.total.contributionMargin)}
          tone={report.total.contributionMargin >= 0 ? "positive" : "warning"}
          description="Participação da contribuição sobre a receita líquida disponível."
        />
        <AnalyticsKpiCard
          label="Melhor mês"
          value={bestMonth ? currencyFormatter.format(bestMonth.contributionAfterMedia) : "N/A"}
          description={bestMonth ? `${bestMonth.label}` : "Sem histórico suficiente"}
          tone="positive"
        />
        <AnalyticsKpiCard
          label="Pior mês"
          value={worstMonth ? currencyFormatter.format(worstMonth.contributionAfterMedia) : "N/A"}
          description={worstMonth ? `${worstMonth.label}` : "Sem histórico suficiente"}
          tone={worstMonth && worstMonth.contributionAfterMedia < 0 ? "warning" : "default"}
        />
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Exploração da margem"
            description="Radar operacional ou linha do tempo, sem alongar a leitura."
          />
          <div className="brandops-subtabs">
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "radar"}
              onClick={() => setActiveSection("radar")}
            >
              Radar
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "timeline"}
              onClick={() => setActiveSection("timeline")}
            >
              Linha do tempo
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeSection === "radar" ? (
<section className="atlas-component-stack">
          <SurfaceCard>
              <SectionHeading
                title="Evolução mensal"
                description="Contribuição antes das despesas e resultado final em uma única leitura."
                aside={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="atlas-inline-metric">
                      {viewMode === "historical" ? "Comparando toda a série" : "Comparando o recorte atual"}
                    </span>
                  {latestMonth ? (
                    <span className="atlas-inline-metric">
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
            <SurfaceCard>
              <SectionHeading
                title={momentum.title}
                description="Leia o momento atual e abra o próximo corte só se precisar."
              />
              <div className="mt-5 atlas-component-stack">
                <article
                  className={cn(
                    "atlas-soft-subcard p-3.5",
                    momentum.tone === "positive" && "border-primary/16 bg-primary-container/30",
                    momentum.tone === "warning" && "border-tertiary/16 bg-tertiary-container/24",
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

                <details className="atlas-disclosure">
                  <summary>
                    <span>Abrir pressão sobre a receita líquida</span>
                    <span>3</span>
                  </summary>
                  <div className="mt-4 atlas-component-stack-tight text-sm">
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
                </details>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Próximas leituras"
                description="Abra só o ponto do sistema que mais ajuda a explicar ou corrigir a margem."
              />
              <div className="mt-5 grid gap-3">
                <AnalyticsCalloutCard
                  href="/dre"
                  eyebrow="Próxima leitura"
                  title="Abrir DRE consolidado"
                  description="Conferir os meses com maior compressão de margem junto com despesas e resultado final."
                  tone="info"
                />
                <AnalyticsCalloutCard
                  href="/media"
                  eyebrow="Próxima leitura"
                  title="Cruzar com Performance Mídia"
                  description="Entender se a pressão veio de aumento de mídia, queda de ROAS ou mudança de mix."
                  tone="default"
                />
                <AnalyticsCalloutCard
                  href="/cost-center"
                  eyebrow="Próxima leitura"
                  title="Revisar lançamentos do DRE"
                  description="Validar se despesas operacionais ou competências recentes distorceram o resultado."
                  tone="warning"
                />
              </div>
            </SurfaceCard>
          </div>
        </section>
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline/50 p-4">
            <SectionHeading
              title="Linha do tempo mensal"
              description="Tabela de apoio para localizar quando a margem ganhou tração ou perdeu fôlego."
              aside={<span className="atlas-inline-metric">{trendData.length} competências</span>}
            />
          </div>
          <div className="grid gap-0 xl:grid-cols-[minmax(0,0.36fr)_minmax(0,1fr)]">
            <div className="border-b border-outline/50 p-4 xl:border-b-0 xl:border-r xl:border-r-outline/50">
              <div className="grid gap-3">
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Último resultado
                  </p>
                  <p className={cn("mt-2 font-headline text-2xl font-semibold", latestMonth && latestMonth.netResult >= 0 ? "text-secondary" : "text-tertiary")}>
                    {latestMonth ? currencyFormatter.format(latestMonth.netResult) : "N/A"}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    Resultado líquido do mês mais recente da série analisada.
                  </p>
                </article>
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Contribuição média
                  </p>
                  <p className={cn("mt-2 font-headline text-2xl font-semibold", report.total.contributionMargin >= 0 ? "text-primary" : "text-tertiary")}>
                    {percentFormatter.format(report.total.contributionMargin)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    Participação acumulada da contribuição sobre a receita líquida.
                  </p>
                </article>
              </div>
            </div>
            <div className="brandops-table-container atlas-table-shell bg-transparent">
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
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
