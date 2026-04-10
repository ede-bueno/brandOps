"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { EmptyState } from "@/components/EmptyState";
import { ContributionTrendPanel, mapContributionTrendPoints } from "@/components/finance/ContributionTrendPanel";
import { EntityChip, PageHeader, SectionHeading, SurfaceCard, WorkspaceTabs } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { cn } from "@/lib/utils";

export default function DrePage() {
  const [viewMode, setViewMode] = useState<"historical" | "filtered">("historical");
  const [activeSection, setActiveSection] = useState<"matrix" | "overview">("matrix");
  const [yearScope, setYearScope] = useState<"default" | "all" | string>("default");
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
  const report = viewMode === "historical" ? financialReportHistorical : financialReportFiltered;
  const currentYear = String(new Date().getFullYear());

  const availableYears = useMemo(
    () => Array.from(new Set((report?.months ?? []).map((month) => month.monthKey.slice(0, 4)))).sort(),
    [report],
  );

  const effectiveYearScope =
    yearScope === "default"
      ? availableYears.includes(currentYear)
        ? currentYear
        : (availableYears[availableYears.length - 1] ?? "all")
      : yearScope;

  const visibleMonths = useMemo(() => {
    if (!report) {
      return [];
    }

    if (viewMode === "filtered" || effectiveYearScope === "all") {
      return report.months;
    }

    return report.months.filter((month) => month.monthKey.startsWith(effectiveYearScope));
  }, [effectiveYearScope, report, viewMode]);

  const visibleTotals = useMemo(() => {
    return visibleMonths.reduce(
      (accumulator, month) => ({
        rob: accumulator.rob + month.metrics.rob,
        discounts: accumulator.discounts + month.metrics.discounts,
        rld: accumulator.rld + month.metrics.rld,
        cmvTotal: accumulator.cmvTotal + month.metrics.cmvTotal,
        mediaSpend: accumulator.mediaSpend + month.metrics.mediaSpend,
        contributionAfterMedia: accumulator.contributionAfterMedia + month.metrics.contributionAfterMedia,
        fixedExpensesTotal: accumulator.fixedExpensesTotal + month.metrics.fixedExpensesTotal,
        netResult: accumulator.netResult + month.metrics.netResult,
      }),
      {
        rob: 0,
        discounts: 0,
        rld: 0,
        cmvTotal: 0,
        mediaSpend: 0,
        contributionAfterMedia: 0,
        fixedExpensesTotal: 0,
        netResult: 0,
      },
    );
  }, [visibleMonths]);

  const visibleExpenseBreakdown = useMemo(() => {
    return (report?.expenseBreakdown ?? [])
      .map((category) => ({
        ...category,
        visibleTotal: visibleMonths.reduce(
          (accumulator, month) => accumulator + (category.valuesByMonth[month.monthKey] ?? 0),
          0,
        ),
      }))
      .filter((category) => category.visibleTotal > 0 || effectiveYearScope === "all" || viewMode === "filtered");
  }, [effectiveYearScope, report, viewMode, visibleMonths]);

  const trendData = mapContributionTrendPoints(visibleMonths);
  const latestMonth = visibleMonths[visibleMonths.length - 1] ?? report?.analysis.latestMonth ?? null;
  const visibleContributionMargin = visibleTotals.rld
    ? visibleTotals.contributionAfterMedia / visibleTotals.rld
    : 0;

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Financeiro"
          title="DRE mensal"
          description={`Carregando o DRE da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="h-[420px] rounded-3xl bg-surface-container" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-surface-container" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhum dado para o DRE"
        description="Escolha uma marca para visualizar o relatório."
        ctaHref={null}
        ctaLabel={null}
      />
    );
  }

  if (!report) {
    return (
      <div className="atlas-page-stack animate-pulse">
        <div className="h-32 rounded-3xl bg-surface-container" />
        <div className="h-[420px] rounded-3xl bg-surface-container" />
      </div>
    );
  }

  const topExpense =
    visibleExpenseBreakdown
      .slice()
      .sort((left, right) => right.visibleTotal - left.visibleTotal)[0] ??
    report.analysis.topExpenseCategory;
  const topExpenseTotal = topExpense
    ? Number(
        (
          topExpense as {
            visibleTotal?: number;
            total?: number;
          }
        ).visibleTotal ??
          (
            topExpense as {
              total?: number;
            }
          ).total ??
          0,
      )
    : 0;
  const breakEvenValue =
    report.total.breakEvenDisplay !== null ? currencyFormatter.format(report.total.breakEvenDisplay) : "N/A";
  const breakEvenHelp = report.total.breakEvenReason;
  const matrixDescription =
    viewMode === "historical"
      ? effectiveYearScope === "all"
        ? "A grade histórica completa continua sendo a referência principal do DRE."
        : `A grade mostra o comportamento mensal de ${effectiveYearScope}.`
      : `A grade mensal mostra o comportamento do recorte ${selectedPeriodLabel}.`;
  const primaryAction =
    visibleTotals.netResult < 0
      ? "Resultado no vermelho: reduzir pressão em mídia, CMV ou despesas fixas."
      : visibleContributionMargin < 0
        ? "Virar a contribuição antes de ampliar gasto operacional."
        : topExpense
          ? `Revisar ${topExpense.categoryName} para preservar margem.`
          : "Operação equilibrada: manter disciplina de margem.";
  const pressureCardTitle = topExpense
    ? `${topExpense.categoryName} pressiona o resultado`
    : "Sem grupo dominante de despesa";
  const nextDiveTitle =
    visibleContributionMargin < 0 ? "Abrir detalhe da margem" : "Revisar lançamentos";
  const nextDiveDescription =
    visibleContributionMargin < 0
      ? "Cruze contribuição, mídia e CMV antes de ampliar qualquer frente."
      : "Abra o livro de lançamentos para revisar competência e categorias.";

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Financeiro"
        title="DRE mensal"
        description={
          activeSection === "matrix"
            ? "Use a grade mensal como referência principal para competência, margem e resultado."
            : "Abra o resumo executivo só quando quiser aprofundar a leitura do período."
        }
        actions={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
                  {
                    key: "dre-matrix",
                    label: "Grade mensal",
                    active: activeSection === "matrix",
                    onClick: () => setActiveSection("matrix"),
                  },
                  {
                    key: "dre-overview",
                    label: "Resumo executivo",
                    active: activeSection === "overview",
                    onClick: () => setActiveSection("overview"),
                  },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/cost-center" className="brandops-button brandops-button-secondary">
                Livro de lançamentos
              </Link>
              <Link href="/help#dre" className="brandops-button brandops-button-ghost">
                Entender cálculos
              </Link>
            </div>
          </div>
        }
      />

      {activeSection === "matrix" ? (
        <SurfaceCard className="overflow-hidden p-0">
          <div className="atlas-component-stack p-4">
            <SectionHeading
              title="Grade mensal"
              description={matrixDescription}
              aside={
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="atlas-inline-metric">
                    {viewMode === "historical"
                      ? effectiveYearScope === "all"
                        ? "Todos os anos"
                        : `Ano ${effectiveYearScope}`
                      : "Recorte filtrado"}
                  </span>
                  <span className="atlas-inline-metric">
                    {visibleMonths.length} mês(es)
                  </span>
                </div>
              }
            />

            <div className="atlas-dre-summary-strip">
              <div className="atlas-dre-summary-item">
                <span className="atlas-ledger-summary-label">Base ativa</span>
                <strong className="atlas-ledger-summary-value">
                  {viewMode === "historical" ? "Histórico completo" : selectedPeriodLabel}
                </strong>
                <span className="atlas-ledger-summary-help">
                  {latestMonth ? `Último fechamento visível: ${latestMonth.label}.` : "Sem fechamento recente visível."}
                </span>
              </div>
              <div className="atlas-dre-summary-item">
                <span className="atlas-ledger-summary-label">Resultado visível</span>
                <strong className="atlas-ledger-summary-value">
                  {currencyFormatter.format(visibleTotals.netResult)}
                </strong>
                <span className="atlas-ledger-summary-help">
                  {visibleTotals.netResult < 0
                    ? "O recorte visível fecha negativo."
                    : "O recorte visível fecha positivo."}
                </span>
              </div>
              <div className="atlas-dre-summary-item">
                <span className="atlas-ledger-summary-label">Margem visível</span>
                <strong className="atlas-ledger-summary-value">
                  {percentFormatter.format(visibleContributionMargin)}
                </strong>
                <span className="atlas-ledger-summary-help">
                  {`Contribuição acumulada no recorte: ${currencyFormatter.format(visibleTotals.contributionAfterMedia)}.`}
                </span>
              </div>
              <div className="atlas-dre-summary-item">
                <span className="atlas-ledger-summary-label">
                  {viewMode === "historical" ? "Foco histórico" : "Base do filtro"}
                </span>
                {viewMode === "historical" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="brandops-button brandops-button-ghost"
                      data-active={yearScope === "all"}
                      onClick={() => setYearScope("all")}
                    >
                      Todos
                    </button>
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={cn(
                          "brandops-button",
                          effectiveYearScope === year ? "brandops-button-primary" : "brandops-button-ghost",
                        )}
                        onClick={() => setYearScope(year)}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                ) : (
                  <strong className="atlas-ledger-summary-value">{selectedPeriodLabel}</strong>
                )}
              </div>
            </div>

            <div className="brandops-table-container atlas-table-shell atlas-dre-table">
                <table className="brandops-table-compact min-w-[1080px] w-full">
                  <thead>
                    <tr>
                      <th className="atlas-dre-sticky-cell min-w-[240px] text-left">Indicador</th>
                      {visibleMonths.map((month) => (
                        <th key={month.monthKey} className="text-right">
                          {month.label}
                        </th>
                      ))}
                      <th className="bg-surface-container text-right">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="atlas-dre-sticky-cell font-semibold text-on-surface">Faturado</td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right">
                          {currencyFormatter.format(month.metrics.rob)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right font-semibold">
                        {currencyFormatter.format(visibleTotals.rob)}
                      </td>
                    </tr>
                    <tr>
                      <td className="atlas-dre-sticky-cell text-on-surface-variant">(-) Descontos</td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right">
                          {currencyFormatter.format(month.metrics.discounts)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right">
                        {currencyFormatter.format(visibleTotals.discounts)}
                      </td>
                    </tr>
                    <tr className="bg-surface-container-low">
                      <td className="atlas-dre-sticky-cell font-semibold text-on-surface">
                        Receita líquida de desconto (RLD)
                      </td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right font-semibold">
                          {currencyFormatter.format(month.metrics.rld)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right font-semibold">
                        {currencyFormatter.format(visibleTotals.rld)}
                      </td>
                    </tr>
                    <tr>
                      <td className="atlas-dre-sticky-cell text-on-surface-variant">(-) CMV</td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right">
                          {currencyFormatter.format(month.metrics.cmvTotal)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right">
                        {currencyFormatter.format(visibleTotals.cmvTotal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="atlas-dre-sticky-cell text-on-surface-variant">(-) Mídia</td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right">
                          {currencyFormatter.format(month.metrics.mediaSpend)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right">
                        {currencyFormatter.format(visibleTotals.mediaSpend)}
                      </td>
                    </tr>
                    <tr className="bg-surface-container-low">
                      <td className="atlas-dre-sticky-cell font-semibold text-on-surface">
                        Margem de contribuição
                      </td>
                      {visibleMonths.map((month) => (
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
                          visibleTotals.contributionAfterMedia >= 0 ? "text-primary" : "text-tertiary",
                        )}
                      >
                        {currencyFormatter.format(visibleTotals.contributionAfterMedia)}
                      </td>
                    </tr>
                    <tr>
                      <td className="atlas-dre-sticky-cell text-on-surface-variant">
                        (-) Despesas operacionais
                      </td>
                      {visibleMonths.map((month) => (
                        <td key={month.monthKey} className="text-right">
                          {currencyFormatter.format(month.metrics.fixedExpensesTotal)}
                        </td>
                      ))}
                      <td className="bg-surface-container text-right">
                        {currencyFormatter.format(visibleTotals.fixedExpensesTotal)}
                      </td>
                    </tr>
                    {visibleExpenseBreakdown.map((category) => (
                      <tr key={category.categoryId}>
                        <td className="atlas-dre-sticky-cell pl-6 text-on-surface-variant">
                          {category.categoryName}
                        </td>
                        {visibleMonths.map((month) => (
                          <td key={month.monthKey} className="text-right text-on-surface-variant">
                            {currencyFormatter.format(category.valuesByMonth[month.monthKey] ?? 0)}
                          </td>
                        ))}
                        <td className="bg-surface-container text-right text-on-surface-variant">
                          {currencyFormatter.format(category.visibleTotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary-container/35">
                      <td className="atlas-dre-sticky-cell bg-primary-container/35 font-semibold text-on-primary-container">
                        Resultado
                      </td>
                      {visibleMonths.map((month) => (
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
                          visibleTotals.netResult >= 0 ? "text-primary" : "text-tertiary",
                        )}
                      >
                        {currencyFormatter.format(visibleTotals.netResult)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
        </SurfaceCard>
      ) : (
        <>
          <section className="atlas-dre-overview-strip">
            <div className="atlas-dre-summary-card">
              <span className="atlas-ledger-summary-label">Decisão do período</span>
              <strong className="atlas-ledger-summary-value">{primaryAction}</strong>
              <span className="atlas-ledger-summary-help">O corte mais útil agora para proteger caixa e margem.</span>
            </div>
            <div className="atlas-dre-summary-card">
              <span className="atlas-ledger-summary-label">Pressão dominante</span>
              <strong className="atlas-ledger-summary-value">{pressureCardTitle}</strong>
              <span className="atlas-ledger-summary-help">
                {topExpense
                  ? `${currencyFormatter.format(topExpenseTotal)} no recorte atual.`
                  : "Nenhuma categoria isolada concentrou pressão relevante."}
              </span>
            </div>
            <div className="atlas-dre-summary-card">
              <span className="atlas-ledger-summary-label">Ponto de equilíbrio</span>
              <strong className="atlas-ledger-summary-value">{breakEvenValue}</strong>
              <span className="atlas-ledger-summary-help">{breakEvenHelp}</span>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.35fr)]">
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
                title="Leitura rápida"
                description="Os números que mais ajudam a decidir o próximo ajuste."
              />
              <div className="mt-5 grid gap-3">
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Margem de contribuição</span>
                  <strong className="atlas-ledger-summary-value">
                    {percentFormatter.format(visibleContributionMargin)}
                  </strong>
                  <span className="atlas-ledger-summary-help">
                    Percentual da RLD que sobra após CMV e mídia.
                  </span>
                </div>
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Ponto de equilíbrio</span>
                  <strong className="atlas-ledger-summary-value">{breakEvenValue}</strong>
                  <span className="atlas-ledger-summary-help">{breakEvenHelp}</span>
                </div>
                {topExpense ? (
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Maior grupo de despesa</span>
                    <strong className="atlas-ledger-summary-value">{topExpense.categoryName}</strong>
                    <span className="atlas-ledger-summary-help">
                      {currencyFormatter.format(topExpenseTotal)} no recorte atual.
                    </span>
                  </div>
                ) : null}
                <div className="atlas-dre-actions-card">
                  <span className="atlas-ledger-summary-label">Próxima ação</span>
                  <strong className="atlas-ledger-summary-value">{nextDiveTitle}</strong>
                  <span className="atlas-ledger-summary-help">{nextDiveDescription}</span>
                  <Link
                    href={visibleContributionMargin < 0 ? "/dashboard/contribution-margin" : "/cost-center"}
                    className="brandops-button brandops-button-secondary w-full justify-center"
                  >
                    Abrir ação
                  </Link>
                </div>
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SurfaceCard className="overflow-hidden p-0">
              <div className="border-b border-outline p-4">
                <SectionHeading
                  title="Composição das despesas"
                  description="Categorias que mais pressionam o resultado."
                />
              </div>
              <div className="p-4">
                {visibleExpenseBreakdown.length ? (
                  <div className="brandops-table-container rounded-none border-0 shadow-none">
                    <table className="brandops-table-compact min-w-0 w-full">
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th className="text-right">Participação</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleExpenseBreakdown.map((category) => {
                          const share = visibleTotals.fixedExpensesTotal
                            ? category.visibleTotal / visibleTotals.fixedExpensesTotal
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
                                {currencyFormatter.format(category.visibleTotal)}
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
                title="Ações relacionadas"
                description="Atalhos diretos para tratar o que mais afeta o relatório."
              />
              <div className="mt-5 grid gap-3">
                {[
                  {
                    href: "/cost-center",
                    title: "Gerenciar lançamentos",
                    description: "Corrigir competências, categorias e despesas operacionais.",
                  },
                  {
                    href: "/cmv",
                    title: "Revisar custos (CMV)",
                    description: "Validar vigência de custos e impacto por produto.",
                  },
                  {
                    href: "/media",
                    title: "Cruzar com mídia",
                    description: "Entender se a pressão veio de gasto, retorno ou mix.",
                  },
                ].map((action) => (
                  <Link key={action.href} href={action.href} className="atlas-dre-action-link">
                    <div>
                      <p className="font-medium text-on-surface">{action.title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{action.description}</p>
                    </div>
                    <span className="text-sm text-on-surface-variant">Abrir</span>
                  </Link>
                ))}
              </div>
            </SurfaceCard>
          </section>
        </>
      )}
    </div>
  );
}
