"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { ContributionTrendPanel, mapContributionTrendPoints } from "@/components/finance/ContributionTrendPanel";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { cn } from "@/lib/utils";

export default function DrePage() {
  const [viewMode, setViewMode] = useState<"historical" | "filtered">("historical");
  const [activeSection, setActiveSection] = useState<"overview" | "matrix">("overview");
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
          eyebrow="Relatório gerencial"
          title="DRE"
          description={`Carregando o DRE da loja ${selectedBrandName}.`}
          badge={`Período: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="h-[420px] bg-surface-container rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhum dado para o DRE"
        description="Escolha uma marca para visualizar o relatório."
      />
    );
  }

  const report = viewMode === "historical" ? financialReportHistorical : financialReportFiltered;

  if (!report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-surface-container rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-container rounded-2xl" />
          ))}
        </div>
        <div className="h-[400px] bg-surface-container rounded-3xl" />
      </div>
    );
  }

  const topExpense = report.analysis.topExpenseCategory;
  const trendData = mapContributionTrendPoints(report.months);
  const latestMonth = report.analysis.latestMonth;
  const breakEvenValue =
    report.total.breakEvenDisplay !== null ? currencyFormatter.format(report.total.breakEvenDisplay) : "N/A";
  const breakEvenHelp = report.total.breakEvenReason;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatório gerencial"
        title="DRE"
        description="Leitura mês a mês do faturado exportado pela INK, descontos, CMV histórico, mídia, despesas e resultado final da operação."
        badge={viewMode === "historical" ? "Histórico completo" : `Período: ${selectedPeriodLabel}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="brandops-tabs">
              <button
                type="button"
                data-active={viewMode === "historical"}
                className="brandops-tab"
                onClick={() => setViewMode("historical")}
              >
                DRE histórico
              </button>
              <button
                type="button"
                data-active={viewMode === "filtered"}
                className="brandops-tab"
                onClick={() => setViewMode("filtered")}
              >
                DRE filtrado
              </button>
            </div>
            <Link href="/cost-center" className="brandops-button brandops-button-secondary">
              Lançar despesas
            </Link>
            <Link href="/help#dre" className="brandops-button brandops-button-ghost">
              Entender cálculos
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricCard label="Faturado" value={currencyFormatter.format(report.total.rob)} accent="secondary" />
        <MetricCard label="RLD" value={currencyFormatter.format(report.total.rld)} accent="info" />
        <MetricCard label="CMV" value={currencyFormatter.format(report.total.cmvTotal)} accent="warning" />
        <MetricCard label="Mídia" value={currencyFormatter.format(report.total.mediaSpend)} accent="warning" />
        <MetricCard
          label="Despesas operacionais"
          value={currencyFormatter.format(report.total.fixedExpensesTotal)}
          help={
            report.expenseBreakdown.length
              ? `${report.expenseBreakdown.length} categorias lançadas`
              : "Sem lançamentos no período"
          }
          accent="warning"
        />
        <MetricCard
          label="Resultado"
          value={currencyFormatter.format(report.total.netResult)}
          accent={report.total.netResult >= 0 ? "positive" : "negative"}
          help={`Margem final ${percentFormatter.format(report.total.operatingMargin)}`}
        />
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Exploração do DRE"
            description="Alterne entre a leitura executiva e a grade mensal sem alongar a tela principal."
          />
          <div className="brandops-subtabs">
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "overview"}
              onClick={() => setActiveSection("overview")}
            >
              Resumo executivo
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "matrix"}
              onClick={() => setActiveSection("matrix")}
            >
              Grade mensal
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeSection === "overview" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(260px,0.52fr)]">
          <SurfaceCard>
            <SectionHeading
              title="Tendência da margem"
              description="Leitura consolidada da margem de contribuição e do resultado líquido mês a mês para localizar ganho de eficiência ou compressão da operação."
              aside={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="status-chip">
                    {viewMode === "historical" ? "Base histórica completa" : "Base do filtro atual"}
                  </span>
                  {latestMonth ? <span className="status-chip">Último mês: {latestMonth.label}</span> : null}
                </div>
              }
            />
            <div className="mt-5">
              <ContributionTrendPanel data={trendData} height={320} />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Drivers do DRE"
              description="Resumo curto do que mais pesa no resultado final do período."
            />
            <div className="mt-5 grid gap-3">
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Margem de contribuição
                </p>
                <p className={`mt-2 font-headline text-2xl font-semibold ${report.total.contributionMargin >= 0 ? "atlas-semantic-positive" : "atlas-semantic-negative"}`}>
                  {percentFormatter.format(report.total.contributionMargin)}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Percentual da RLD que sobra após CMV e mídia.
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Ponto de equilíbrio
                </p>
                <p className={`mt-2 font-headline text-2xl font-semibold ${report.total.breakEvenDisplay !== null ? "atlas-semantic-info" : "atlas-semantic-warning"}`}>
                  {breakEvenValue}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">{breakEvenHelp}</p>
                {report.total.breakEvenDisplay !== null ? (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Meta mensal de RLD para cobrir a média de despesas fixas
                  </p>
                ) : null}
              </article>
              {topExpense ? (
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Maior grupo de despesa
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-sm text-on-surface-variant">{topExpense.categoryName}</span>
                    <span className="font-semibold text-on-surface">
                      {currencyFormatter.format(topExpense.total)}
                    </span>
                  </div>
                </article>
              ) : null}
              <Link href="/dashboard/contribution-margin" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
                <p className="font-semibold text-on-surface">Abrir detalhe da margem</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Ver a linha do tempo completa da contribuição e cruzar com mídia, CMV e despesas.
                </p>
              </Link>
            </div>
          </SurfaceCard>
        </section>
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="DRE mensal"
              description="A matriz abaixo usa faturado da INK como entrada comercial e cruza descontos, CMV, mídia e despesas por competência."
            />
          </div>

          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[1080px] w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface text-left min-w-[240px]">Indicador</th>
                {report.months.map((month) => (
                  <th key={month.monthKey} className="text-right">
                    {month.label}
                  </th>
                ))}
                <th className="text-right bg-surface-container">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sticky left-0 z-10 bg-surface font-semibold text-on-surface">
                  Faturado
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right">
                    {currencyFormatter.format(month.metrics.rob)}
                  </td>
                ))}
                <td className="bg-surface-container text-right font-semibold">
                  {currencyFormatter.format(report.total.rob)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface text-on-surface-variant">
                  (-) Descontos
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right">
                    {currencyFormatter.format(month.metrics.discounts)}
                  </td>
                ))}
                <td className="bg-surface-container text-right">
                  {currencyFormatter.format(report.total.discounts)}
                </td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="sticky left-0 z-10 bg-surface font-semibold text-on-surface">
                  Receita líquida de desconto (RLD)
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right font-semibold">
                    {currencyFormatter.format(month.metrics.rld)}
                  </td>
                ))}
                <td className="bg-surface-container text-right font-semibold">
                  {currencyFormatter.format(report.total.rld)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface text-on-surface-variant">
                  (-) CMV
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right">
                    {currencyFormatter.format(month.metrics.cmvTotal)}
                  </td>
                ))}
                <td className="bg-surface-container text-right">
                  {currencyFormatter.format(report.total.cmvTotal)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface text-on-surface-variant">
                  (-) Mídia
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right">
                    {currencyFormatter.format(month.metrics.mediaSpend)}
                  </td>
                ))}
                <td className="bg-surface-container text-right">
                  {currencyFormatter.format(report.total.mediaSpend)}
                </td>
              </tr>
              <tr className="bg-surface-container-low">
                <td className="sticky left-0 z-10 bg-surface font-semibold text-on-surface">
                  Margem de contribuição
                </td>
                {report.months.map((month) => (
                  <td
                    key={month.monthKey}
                    className={cn(
                      "text-right font-semibold",
                      month.metrics.contributionAfterMedia >= 0 ? "text-primary" : "text-tertiary",
                    )}
                  >
                    {currencyFormatter.format(month.metrics.contributionAfterMedia)}
                  </td>
                ))}
                <td
                  className={cn(
                    "bg-surface-container text-right font-semibold",
                    report.total.contributionAfterMedia >= 0 ? "text-primary" : "text-tertiary",
                  )}
                >
                  {currencyFormatter.format(report.total.contributionAfterMedia)}
                </td>
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-surface text-on-surface-variant">
                  (-) Despesas operacionais
                </td>
                {report.months.map((month) => (
                  <td key={month.monthKey} className="text-right">
                    {currencyFormatter.format(month.metrics.fixedExpensesTotal)}
                  </td>
                ))}
                <td className="bg-surface-container text-right">
                  {currencyFormatter.format(report.total.fixedExpensesTotal)}
                </td>
              </tr>
              {report.expenseBreakdown.map((category) => (
                <tr key={category.categoryId}>
                  <td className="sticky left-0 z-10 bg-surface pl-6 text-on-surface-variant">
                    {category.categoryName}
                  </td>
                  {report.months.map((month) => (
                    <td key={month.monthKey} className="text-right text-on-surface-variant">
                      {currencyFormatter.format(category.valuesByMonth[month.monthKey] ?? 0)}
                    </td>
                  ))}
                  <td className="bg-surface-container text-right text-on-surface-variant">
                    {currencyFormatter.format(category.total)}
                  </td>
                </tr>
              ))}
              <tr className="bg-primary-container/35">
                <td className="sticky left-0 z-10 bg-primary-container/35 font-semibold text-on-primary-container">
                  Resultado
                </td>
                {report.months.map((month) => (
                  <td
                    key={month.monthKey}
                    className={cn(
                      "text-right font-semibold",
                      month.metrics.netResult >= 0 ? "text-primary" : "text-tertiary",
                    )}
                  >
                    {currencyFormatter.format(month.metrics.netResult)}
                  </td>
                ))}
                <td
                  className={cn(
                    "bg-primary-container/45 text-right font-semibold",
                    report.total.netResult >= 0 ? "text-primary" : "text-tertiary",
                  )}
                >
                  {currencyFormatter.format(report.total.netResult)}
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Composição das despesas"
              description="Participação das categorias lançadas que mais pressionam o resultado."
            />
          </div>
          <div className="space-y-3 p-5">
            {report.expenseBreakdown.length ? (
              report.expenseBreakdown.map((category) => {
                const share = report.total.fixedExpensesTotal
                  ? category.total / report.total.fixedExpensesTotal
                  : 0;

                return (
                  <article key={category.categoryId} className="panel-muted p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-on-surface">{category.categoryName}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {percentFormatter.format(share)} da despesa operacional do período
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-on-surface">
                        {currencyFormatter.format(category.total)}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${Math.min(share * 100, 100)}%` }}
                      />
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-on-surface-variant">
                Nenhuma despesa lançada para compor o DRE.
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Navegação do DRE"
            description="Atalhos para tratar rapidamente o que mais afeta o relatório."
          />
          <div className="mt-5 grid gap-3">
            <Link href="/cost-center" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
              <p className="font-semibold text-on-surface">Gerenciar lançamentos</p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Abrir o livro de lançamentos, filtrar despesas e corrigir competências.
              </p>
            </Link>
            <Link href="/cmv" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
              <p className="font-semibold text-on-surface">Revisar custos (CMV)</p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Validar vigência de custos e o impacto por categoria de produto.
              </p>
            </Link>
            <Link href="/media" className="panel-muted p-4 transition hover:border-secondary/20 hover:bg-secondary-container/15">
              <p className="font-semibold text-on-surface">Cruzar com mídia</p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Conferir se a pressão veio de gasto, queda de retorno ou mudança de mix.
              </p>
            </Link>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
