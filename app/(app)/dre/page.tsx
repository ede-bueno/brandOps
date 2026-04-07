"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
  AnalyticsPanel,
} from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { ContributionTrendPanel, mapContributionTrendPoints } from "@/components/finance/ContributionTrendPanel";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EntityChip, PageHeader, SectionHeading, SurfaceCard, WorkspaceTabs } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { cn } from "@/lib/utils";

export default function DrePage() {
  const [viewMode, setViewMode] = useState<"historical" | "filtered">("historical");
  const [activeSection, setActiveSection] = useState<"overview" | "matrix">("matrix");
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
          eyebrow="Relatório gerencial"
          title="DRE"
          description={`Carregando o DRE da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
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
      <div className="atlas-page-stack animate-pulse">
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
  const primaryAction =
    report.total.netResult < 0
      ? "Resultado no vermelho: cortar pressão em mídia, CMV ou despesas fixas."
      : report.total.contributionMargin < 0
        ? "Virar a contribuição antes de ampliar gasto operacional."
        : topExpense
          ? `Revisar ${topExpense.categoryName} para preservar margem.`
          : "Operação equilibrada: manter disciplina de margem.";
  const pressureCardTitle = topExpense
    ? `${topExpense.categoryName} pressiona o resultado`
    : "Sem grupo dominante de despesa";
  const nextDiveTitle =
    report.total.contributionMargin < 0 ? "Abrir detalhe da margem" : "Conferir a matriz mensal";
  const nextDiveDescription =
    report.total.contributionMargin < 0
      ? "Cruze contribuição, mídia e CMV antes de expandir qualquer frente."
      : "Use a grade mensal para validar o comportamento por competência.";

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Relatório gerencial"
        title="Painel DRE"
        description="Pressão, margem e leitura do recorte atual."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <WorkspaceTabs
              items={[
                {
                  key: "dre-historical",
                  label: "DRE histórico",
                  active: viewMode === "historical",
                  onClick: () => setViewMode("historical"),
                },
                {
                  key: "dre-filtered",
                  label: "DRE filtrado",
                  active: viewMode === "filtered",
                  onClick: () => setViewMode("filtered"),
                },
              ]}
            />
            <Link href="/cost-center" className="brandops-button brandops-button-secondary">
              Lançar despesas
            </Link>
            <Link href="/help#dre" className="brandops-button brandops-button-ghost">
              Entender cálculos
            </Link>
            <div className="flex flex-wrap gap-2">
              <span className="atlas-inline-metric">{selectedBrandName}</span>
              <span className="atlas-inline-metric">
                {viewMode === "historical" ? "Histórico completo" : selectedPeriodLabel}
              </span>
            </div>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsCalloutCard
          eyebrow="Decisão do período"
          title={primaryAction}
          description="O corte mais útil agora para proteger caixa e margem."
          tone={report.total.netResult >= 0 ? "info" : "warning"}
        />
        <AnalyticsCalloutCard
          eyebrow="Pressão dominante"
          title={pressureCardTitle}
          description={
            topExpense
              ? `${currencyFormatter.format(topExpense.total)} no recorte atual.`
              : "Nenhuma categoria isolada concentrou pressão relevante."
          }
          tone={topExpense ? "warning" : "default"}
        />
        <AnalyticsCalloutCard
          eyebrow="Próximo mergulho"
          title={nextDiveTitle}
          description={nextDiveDescription}
          href={report.total.contributionMargin < 0 ? "/dashboard/contribution-margin" : undefined}
          actionLabel="Abrir"
          tone="info"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <AnalyticsPanel
          eyebrow="Entrada comercial"
          title="Receita e base"
          description="O tamanho da operação antes da pressão de custo."
        >
          <AnalyticsKpiCard
            label="Faturado"
            value={currencyFormatter.format(report.total.rob)}
            description="Entrada comercial exportada pela INK."
            tone="secondary"
          />
          <AnalyticsKpiCard
            label="RLD"
            value={currencyFormatter.format(report.total.rld)}
            description="Receita líquida de desconto para a leitura do DRE."
            tone="info"
          />
          <AnalyticsKpiCard
            label="Resultado"
            value={currencyFormatter.format(report.total.netResult)}
            description={`Margem final ${percentFormatter.format(report.total.operatingMargin)}.`}
            tone={report.total.netResult >= 0 ? "positive" : "negative"}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          eyebrow="Pressão direta"
          title="Custos que comem margem"
          description="O que mais consome o caixa antes do resultado final."
        >
          <AnalyticsKpiCard
            label="CMV"
            value={currencyFormatter.format(report.total.cmvTotal)}
            description="Custo histórico aplicado por competência."
            tone="warning"
          />
          <AnalyticsKpiCard
            label="Mídia"
            value={currencyFormatter.format(report.total.mediaSpend)}
            description="Investimento atribuído ao período."
            tone="warning"
          />
          <AnalyticsKpiCard
            label="Despesas operacionais"
            value={currencyFormatter.format(report.total.fixedExpensesTotal)}
            description={
              report.expenseBreakdown.length
                ? `${report.expenseBreakdown.length} categorias lançadas.`
                : "Sem lançamentos no período."
            }
            tone="warning"
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          eyebrow="Controle"
          title="Margem e equilíbrio"
          description="O que sobra e o que falta para a operação se pagar."
          footer={
            <Link
              href="/dashboard/contribution-margin"
              className="text-xs font-medium text-primary hover:underline"
            >
              Abrir detalhe da margem
            </Link>
          }
        >
          <AnalyticsKpiCard
            label="Margem de contribuição"
            value={percentFormatter.format(report.total.contributionMargin)}
            description="Percentual da RLD que sobra após CMV e mídia."
            tone={report.total.contributionMargin >= 0 ? "positive" : "negative"}
          />
          <AnalyticsKpiCard
            label="Ponto de equilíbrio"
            value={breakEvenValue}
            description={breakEvenHelp}
            tone={report.total.breakEvenDisplay !== null ? "secondary" : "warning"}
          />
          {topExpense ? (
            <AnalyticsKpiCard
              label="Maior grupo de despesa"
              value={topExpense.categoryName}
              description={currencyFormatter.format(topExpense.total)}
              tone="default"
            />
          ) : null}
        </AnalyticsPanel>
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Exploração do DRE"
            description="Alterne entre resumo executivo e matriz mensal."
            aside={<span className="atlas-inline-metric">Base {viewMode === "historical" ? "histórica" : "filtrada"}</span>}
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
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.62fr)_minmax(18rem,0.38fr)]">
          <SurfaceCard>
            <SectionHeading
              title="Tendência da margem"
              description="Margem de contribuição e resultado mês a mês, sem ruído."
              aside={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <EntityChip text={viewMode === "historical" ? "Base histórica completa" : "Base do filtro atual"} />
                  {latestMonth ? <EntityChip text={`Último mês: ${latestMonth.label}`} /> : null}
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
              description="Pressões que mais puxam o resultado para baixo."
            />
            <div className="mt-5 grid gap-3">
              <AnalyticsKpiCard
                label="Margem de contribuição"
                value={percentFormatter.format(report.total.contributionMargin)}
                description="Percentual da RLD que sobra após CMV e mídia."
                tone={report.total.contributionMargin >= 0 ? "positive" : "negative"}
              />
              <AnalyticsKpiCard
                label="Ponto de equilíbrio"
                value={breakEvenValue}
                description={breakEvenHelp}
                tone={report.total.breakEvenDisplay !== null ? "info" : "warning"}
                footer={report.total.breakEvenDisplay !== null ? "Meta mensal de RLD para cobrir a média de despesas fixas" : undefined}
              />
              {topExpense ? (
                <AnalyticsCalloutCard
                  eyebrow="Maior grupo de despesa"
                  title={topExpense.categoryName}
                  description="Categoria com maior peso sobre o resultado no recorte atual."
                  footer={currencyFormatter.format(topExpense.total)}
                  tone="warning"
                />
              ) : null}
              <AnalyticsCalloutCard
                eyebrow="Navegação"
                title="Abrir detalhe da margem"
                description="Ver a linha do tempo completa da contribuição e cruzar com mídia, CMV e despesas."
                href="/dashboard/contribution-margin"
                actionLabel="Abrir"
              />
            </div>
          </SurfaceCard>
        </section>
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-4">
            <SectionHeading
              title="DRE mensal"
              description={
                viewMode === "historical"
                  ? "A matriz histórica completa continua sendo a auditoria principal do DRE."
                  : "A matriz cruza faturado, descontos, CMV, mídia e despesas por competência."
              }
            />
          </div>

          <div className="brandops-table-container atlas-table-shell">
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
          <div className="border-b border-outline p-4">
            <SectionHeading
              title="Composição das despesas"
              description="Categorias que mais pressionam o resultado."
            />
          </div>
          <div className="p-4">
            {report.expenseBreakdown.length ? (
              <div className="brandops-table-container border-0 rounded-none shadow-none">
                <table className="brandops-table-compact w-full min-w-0">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th className="text-right">Participação</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenseBreakdown.map((category) => {
                      const share = report.total.fixedExpensesTotal
                        ? category.total / report.total.fixedExpensesTotal
                        : 0;

                      return (
                        <tr key={category.categoryId}>
                          <td>
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-on-surface">{category.categoryName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-right">
                            <div className="inline-flex min-w-[8rem] items-center justify-end gap-3">
                              <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-container-high sm:block">
                                <div
                                  className="h-full rounded-full bg-secondary"
                                  style={{ width: `${Math.min(share * 100, 100)}%` }}
                                />
                              </div>
                              <span className="font-medium text-on-surface-variant">
                                {percentFormatter.format(share)}
                              </span>
                            </div>
                          </td>
                          <td className="text-right font-semibold text-on-surface">
                            {currencyFormatter.format(category.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            description="Atalhos para tratar o que mais afeta o relatório."
          />
          <div className="mt-5 grid gap-3">
            <AnalyticsCalloutCard
              href="/cost-center"
              eyebrow="Próxima ação"
              title="Gerenciar lançamentos"
              description="Abrir o livro de lançamentos, filtrar despesas e corrigir competências."
            />
            <AnalyticsCalloutCard
              href="/cmv"
              eyebrow="Próxima ação"
              title="Revisar custos (CMV)"
              description="Validar vigência de custos e o impacto por categoria de produto."
            />
            <AnalyticsCalloutCard
              href="/media"
              eyebrow="Próxima ação"
              title="Cruzar com mídia"
              description="Conferir se a pressão veio de gasto, queda de retorno ou mudança de mix."
            />
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
