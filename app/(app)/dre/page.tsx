"use client";

import { useMemo } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { buildAnnualDreReport } from "@/lib/brandops/metrics";
import { cn } from "@/lib/utils";

export default function DrePage() {
  const { 
    activeBrand, 
    filteredBrand, 
    selectedPeriodLabel, 
    dashboardMetrics, 
    isMetricsLoading,
    dreMonthly,
    isDreLoading
  } = useBrandOps();

  const report = useMemo(() => {
    if (!filteredBrand || !dreMonthly || !dashboardMetrics) return null;
    return buildAnnualDreReport(filteredBrand, dreMonthly, dashboardMetrics);
  }, [filteredBrand, dreMonthly, dashboardMetrics]);

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhum dado para o DRE"
        description="Escolha uma marca para visualizar o relatório."
      />
    );
  }

  if (isDreLoading || isMetricsLoading || !report) {
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

  const topExpense = report.expenseBreakdown[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatório gerencial"
        title="DRE"
        description="Leitura mês a mês do faturado exportado pela INK, descontos, CMV histórico, mídia, despesas e resultado final da operação."
        badge={`Período: ${selectedPeriodLabel}`}
        actions={
          <Link href="/help#dre" className="brandops-button brandops-button-ghost">
            Entender cálculos
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Faturado" value={currencyFormatter.format(report.total.rob)} />
        <MetricCard label="RLD" value={currencyFormatter.format(report.total.rld)} />
        <MetricCard label="CMV" value={currencyFormatter.format(report.total.cmvTotal)} />
        <MetricCard label="Mídia" value={currencyFormatter.format(report.total.mediaSpend)} />
        <MetricCard
          label="Despesas operacionais"
          value={currencyFormatter.format(report.total.fixedExpensesTotal)}
          help={
            report.expenseBreakdown.length
              ? `${report.expenseBreakdown.length} categorias lançadas`
              : "Sem lançamentos no período"
          }
        />
        <MetricCard
          label="Resultado"
          value={currencyFormatter.format(report.total.netResult)}
          accent={report.total.netResult >= 0 ? "positive" : "warning"}
          help={`Margem final ${percentFormatter.format(report.total.operatingMargin)}`}
        />
      </section>

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

      <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <SurfaceCard>
          <SectionHeading
            title="Ponto de equilíbrio"
            description="Valor de RLD necessário para cobrir as despesas fixas com a margem atual."
          />
          <p className="mt-5 font-headline text-3xl font-semibold text-on-surface">
            {currencyFormatter.format(
              report.total.contributionMargin > 0
                ? report.total.fixedExpensesTotal / report.total.contributionMargin
                : 0,
            )}
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Margem de contribuição"
            description="Parcela da RLD que sobra após CMV e mídia, antes das despesas operacionais."
          />
          <p className="mt-5 font-headline text-3xl font-semibold text-on-surface">
            {percentFormatter.format(report.total.contributionMargin)}
          </p>
          {topExpense ? (
            <div className="mt-4 rounded-2xl border border-outline bg-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Maior grupo de despesa
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-sm text-on-surface-variant">{topExpense.categoryName}</span>
                <span className="font-semibold text-on-surface">
                  {currencyFormatter.format(topExpense.total)}
                </span>
              </div>
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Composição das despesas"
              description="Ranking das categorias lançadas que alimentam o DRE do período."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact w-full min-w-[520px]">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Participação</th>
                </tr>
              </thead>
              <tbody>
                {report.expenseBreakdown.length ? (
                  report.expenseBreakdown.map((category) => {
                    const share = report.total.fixedExpensesTotal
                      ? category.total / report.total.fixedExpensesTotal
                      : 0;

                    return (
                      <tr key={category.categoryId}>
                        <td className="font-medium text-on-surface">{category.categoryName}</td>
                        <td className="text-right">
                          {currencyFormatter.format(category.total)}
                        </td>
                        <td className="text-right">
                          {percentFormatter.format(share)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-on-surface-variant">
                      Nenhuma despesa lançada para compor o DRE.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
