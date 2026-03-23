"use client";

import { Fragment } from "react";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import {
  buildAnnualDreReport,
  buildDailyContributionSeries,
  buildExpenseSummary,
  buildWeeklyPerformanceTable,
  computeBrandMetrics,
} from "@/lib/brandops/metrics";
import type { BrandSummaryMetrics } from "@/lib/brandops/types";

type DreRowConfig = {
  label: string;
  getValue: (metrics: BrandSummaryMetrics) => number;
  highlight?: boolean;
  showPercent?: boolean;
};

const baseRows: DreRowConfig[] = [
  {
    label: "(=) Receita bruta",
    getValue: (metrics) => metrics.grossRevenue,
  },
  {
    label: "(-) Desconto",
    getValue: (metrics) => -metrics.discounts,
    showPercent: true,
  },
  {
    label: "(=) Receita líquida",
    getValue: (metrics) => metrics.netRevenue,
    highlight: true,
  },
  {
    label: "(-) Comissões / taxas",
    getValue: (metrics) => -metrics.commissionTotal,
    showPercent: true,
  },
  {
    label: "(=) Receita líquida após taxas",
    getValue: (metrics) => metrics.netAfterFees,
    highlight: true,
  },
  {
    label: "(-) CMV",
    getValue: (metrics) => -metrics.cmvTotal,
    showPercent: true,
  },
  {
    label: "(=) Margem bruta",
    getValue: (metrics) => metrics.grossMargin,
    highlight: true,
    showPercent: true,
  },
  {
    label: "(-) Adcost",
    getValue: (metrics) => -metrics.mediaSpend,
    showPercent: true,
  },
  {
    label: "(=) Margem de contribuição",
    getValue: (metrics) => metrics.contributionAfterMedia,
    highlight: true,
    showPercent: true,
  },
  {
    label: "(-) Despesas operacionais",
    getValue: (metrics) => -metrics.operatingExpensesTotal,
    showPercent: true,
  },
  {
    label: "(=) Resultado",
    getValue: (metrics) => metrics.operatingResult,
    highlight: true,
    showPercent: true,
  },
];

function ratioText(value: number, base: number, enabled = true) {
  if (!enabled || !base) {
    return "-";
  }
  return percentFormatter.format(value / base);
}

function valueClass(value: number) {
  if (value > 0) return "text-[var(--color-primary)]";
  if (value < 0) return "text-[var(--color-tertiary)]";
  return "text-on-surface";
}

export default function DrePage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand || !filteredBrand.paidOrders.length) {
    return (
      <EmptyState
        title="Ainda não há dados suficientes para o DRE"
        description="Importe pedidos, itens, mídia e complete a base de CMV para abrir uma leitura financeira mais confiável."
      />
    );
  }

  const currentMetrics = computeBrandMetrics(filteredBrand);
  const annualReport = buildAnnualDreReport(activeBrand);
  const expenseSummary = buildExpenseSummary(filteredBrand);
  const dailyContribution = buildDailyContributionSeries(filteredBrand)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const weeklyPerformance = buildWeeklyPerformanceTable(activeBrand).slice(0, 18);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="DRE e visões gerenciais"
        description="Leitura do período em foco, visão acumulada mês a mês e performance comercial por semana para substituir a análise que antes vivia na planilha."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita líquida"
          value={currencyFormatter.format(currentMetrics.netRevenue)}
          help={`${integerFormatter.format(currentMetrics.paidOrderCount)} pedidos pagos`}
          accent="positive"
        />
        <MetricCard
          label="Margem bruta"
          value={currencyFormatter.format(currentMetrics.grossMargin)}
          help={`${percentFormatter.format(currentMetrics.netRevenue ? currentMetrics.grossMargin / currentMetrics.netRevenue : 0)}`}
          accent={currentMetrics.grossMargin >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Margem de contribuição"
          value={currencyFormatter.format(currentMetrics.contributionAfterMedia)}
          help={`${percentFormatter.format(currentMetrics.contributionMargin)}`}
          accent={currentMetrics.contributionAfterMedia >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Resultado"
          value={currencyFormatter.format(currentMetrics.operatingResult)}
          help={`${percentFormatter.format(currentMetrics.operatingMargin)}`}
          accent={currentMetrics.operatingResult >= 0 ? "positive" : "warning"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard>
          <SectionHeading
            title="DRE do período em foco"
            description="Snapshot financeiro para a marca e o período selecionado no topo do painel."
          />

          <div className="mt-6 overflow-hidden rounded-[22px] border border-outline/50 bg-surface-container-low/30">
            <table className="brandops-table-compact w-full text-left text-sm">
              <tbody>
                {baseRows.map((row) => {
                  const value = row.getValue(currentMetrics);
                  return (
                    <tr
                      key={row.label}
                      className={row.highlight ? "bg-secondary/10" : "border-t border-outline/50"}
                    >
                      <td className="px-5 py-4 font-medium text-on-surface">
                        {row.label}
                      </td>
                      <td className={`px-5 py-4 text-right font-medium ${valueClass(value)}`}>
                        {currencyFormatter.format(value)}
                      </td>
                      <td className="px-5 py-4 text-right text-on-surface-variant">
                        {ratioText(value, currentMetrics.netRevenue, row.showPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <SectionHeading
              title="Despesas do período"
              description="Categorias lançadas no centro de custo que impactam o resultado."
            />
            <div className="mt-5 space-y-3">
              {expenseSummary.length ? (
                expenseSummary.map((expense) => (
                  <div key={expense.categoryName} className="panel-muted flex items-center justify-between gap-4 p-4">
                    <span className="font-medium text-on-surface">{expense.categoryName}</span>
                    <span className="text-on-surface-variant">
                      {currencyFormatter.format(expense.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Nenhuma despesa operacional lançada neste período.
                </p>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Contribuição diária"
              description="Leitura curta para investigar dias fora da curva."
            />
            <div className="mt-5 space-y-3">
              {dailyContribution.map((day) => (
                <article key={day.date} className="panel-muted p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-on-surface">{day.date}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        RL {currencyFormatter.format(day.netRevenue)} • CMV {currencyFormatter.format(day.cmv)} • Adcost {currencyFormatter.format(day.mediaSpend)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${valueClass(day.contribution)}`}>
                        {currencyFormatter.format(day.contribution)}
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {day.netRevenue ? percentFormatter.format(day.contribution / day.netRevenue) : "-"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="DRE anual mês a mês"
          description="Estrutura acumulada da marca no tempo, com comparação por mês e coluna de acumulado ao final."
          aside={`${annualReport.months.length} mês(es) com movimento`}
        />

        <div className="mt-6 overflow-x-auto rounded-[22px] border border-outline/50">
          <table className="brandops-table-compact min-w-[1200px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-b border-outline bg-surface-container-high px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  DRE
                </th>
                {annualReport.months.map((month) => (
                  <th key={month.monthKey} colSpan={2} className="bg-surface-container px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                    {month.label}
                  </th>
                ))}
                <th colSpan={2} className="bg-surface-container px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Acumulado
                </th>
              </tr>
              <tr>
                <th className="sticky left-0 z-20 border-b border-outline/40 bg-surface-container px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  Linha
                </th>
                {annualReport.months.map((month) => (
                  <Fragment key={`header-${month.monthKey}`}>
                    <th key={`${month.monthKey}-value`} className="border-b border-outline/40 bg-surface-container px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                      Valor
                    </th>
                    <th key={`${month.monthKey}-pct`} className="border-b border-outline/40 bg-surface-container px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                      %
                    </th>
                  </Fragment>
                ))}
                <th className="border-b border-outline/40 bg-surface-container px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Valor
                </th>
                <th className="border-b border-outline/40 bg-surface-container px-3 py-2 text-right text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {baseRows.slice(0, 10).map((row) => {
                const totalValue = row.getValue(annualReport.total);
                return (
                  <tr key={row.label} className={row.highlight ? "bg-white/4" : ""}>
                    <td className="sticky left-0 z-10 border-b border-outline/40 bg-surface-container px-4 py-3 font-medium text-on-surface">
                      {row.label}
                    </td>
                    {annualReport.months.map((month) => {
                      const value = row.getValue(month.metrics);
                      return (
                        <Fragment key={`${row.label}-${month.monthKey}`}>
                          <td
                            className={`border-b border-outline/40 px-3 py-3 text-right font-medium ${valueClass(value)}`}
                          >
                            {currencyFormatter.format(value)}
                          </td>
                          <td
                            className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant"
                          >
                            {ratioText(value, month.metrics.netRevenue, row.showPercent)}
                          </td>
                        </Fragment>
                      );
                    })}
                    <td className={`border-b border-outline/40 px-3 py-3 text-right font-semibold ${valueClass(totalValue)}`}>
                      {currencyFormatter.format(totalValue)}
                    </td>
                    <td className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant">
                      {ratioText(totalValue, annualReport.total.netRevenue, row.showPercent)}
                    </td>
                  </tr>
                );
              })}

              {annualReport.expenseBreakdown.map((category) => (
                <tr key={category.categoryId}>
                  <td className="sticky left-0 z-10 border-b border-outline/40 bg-surface-container px-4 py-3 text-on-surface-variant">
                    {category.categoryName}
                  </td>
                  {annualReport.months.map((month) => {
                    const value = -(category.valuesByMonth[month.monthKey] ?? 0);
                    return (
                      <Fragment key={`${category.categoryId}-${month.monthKey}`}>
                        <td
                          className={`border-b border-outline/40 px-3 py-3 text-right ${valueClass(value)}`}
                        >
                          {currencyFormatter.format(value)}
                        </td>
                        <td
                          className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant"
                        >
                          {ratioText(value, month.metrics.netRevenue, true)}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className={`border-b border-outline/40 px-3 py-3 text-right font-medium ${valueClass(-category.total)}`}>
                    {currencyFormatter.format(-category.total)}
                  </td>
                  <td className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant">
                    {ratioText(-category.total, annualReport.total.netRevenue, true)}
                  </td>
                </tr>
              ))}

              <tr className="bg-white/6">
                <td className="sticky left-0 z-10 border-b border-outline/40 bg-surface-container px-4 py-3 font-semibold text-on-surface">
                  (=) Resultado
                </td>
                {annualReport.months.map((month) => (
                  <Fragment key={`result-${month.monthKey}`}>
                    <td
                      className={`border-b border-outline/40 px-3 py-3 text-right font-semibold ${valueClass(month.metrics.operatingResult)}`}
                    >
                      {currencyFormatter.format(month.metrics.operatingResult)}
                    </td>
                    <td
                      className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant"
                    >
                      {ratioText(month.metrics.operatingResult, month.metrics.netRevenue, true)}
                    </td>
                  </Fragment>
                ))}
                <td className={`border-b border-outline/40 px-3 py-3 text-right font-semibold ${valueClass(annualReport.total.operatingResult)}`}>
                  {currencyFormatter.format(annualReport.total.operatingResult)}
                </td>
                <td className="border-b border-outline/40 px-3 py-3 text-right text-on-surface-variant">
                  {ratioText(annualReport.total.operatingResult, annualReport.total.netRevenue, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          title="Performance gerencial por semana"
          description="Leitura operacional no estilo da planilha: mídia, volume real, CMV, ROAS, custos de aquisição e taxas de conversão."
        />

        <div className="mt-6 overflow-x-auto rounded-[22px] border border-outline/50">
          <table className="brandops-table-compact min-w-[1650px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th>Período</th>
                <th className="text-right">Gasto Ads</th>
                <th className="text-right">Impressões</th>
                <th className="text-right">Cliques</th>
                <th className="text-right">Compras (Meta)</th>
                <th className="text-right">Peças reais</th>
                <th className="text-right">Faturamento bruto</th>
                <th className="text-right">CMV</th>
                <th className="text-right">Margem bruta</th>
                <th className="text-right">Adcost</th>
                <th className="text-right">Ticket</th>
                <th className="text-right">ROAS bruto</th>
                <th className="text-right">ROAS líquido</th>
                <th className="text-right">CTR</th>
                <th className="text-right">CPC</th>
                <th className="text-right">CPM</th>
                <th className="text-right">CVR Meta</th>
                <th className="text-right">CVR Real</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPerformance.map((row) => (
                <tr key={row.periodKey}>
                  <td className="font-semibold text-on-surface">{row.periodKey}</td>
                  <td className="text-right">{currencyFormatter.format(row.adsSpend)}</td>
                  <td className="text-right text-on-surface-variant">{integerFormatter.format(row.impressions)}</td>
                  <td className="text-right text-on-surface-variant">{integerFormatter.format(row.clicks)}</td>
                  <td className="text-right text-on-surface-variant">{integerFormatter.format(row.metaPurchases)}</td>
                  <td className="text-right text-on-surface">{integerFormatter.format(row.realPieces)}</td>
                  <td className="text-right">{currencyFormatter.format(row.grossRevenue)}</td>
                  <td className="text-right">{currencyFormatter.format(row.cmv)}</td>
                  <td className={`text-right font-medium ${valueClass(row.grossMargin)}`}>{currencyFormatter.format(row.grossMargin)}</td>
                  <td className="text-right">{currencyFormatter.format(row.adcostPerPiece)}</td>
                  <td className="text-right">{currencyFormatter.format(row.averageTicket)}</td>
                  <td className="text-right">{row.grossRoas.toFixed(1)}</td>
                  <td className="text-right">{row.netRoas.toFixed(1)}</td>
                  <td className="text-right">{percentFormatter.format(row.ctr)}</td>
                  <td className="text-right">{currencyFormatter.format(row.cpc)}</td>
                  <td className="text-right">{currencyFormatter.format(row.cpm)}</td>
                  <td className="text-right">{percentFormatter.format(row.metaCvr)}</td>
                  <td className="text-right">{percentFormatter.format(row.realCvr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
