"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<"kpis" | "workflow">("kpis");
  const { 
    activeBrand, 
    activeBrandId,
    brands,
    selectedPeriodLabel, 
    isLoading: isDatasetLoading,
    isMetricsLoading,
    financialReportFiltered,
  } = useBrandOps();
  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";
  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isMetricsLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Resumo executivo"
          title={selectedBrandName}
          description="Carregando dados da loja selecionada. Aguarde enquanto consolidamos vendas, mídia, CMV e despesas."
          badge={selectedPeriodLabel}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-[260px] bg-surface-container rounded-3xl" />
            <div className="h-[260px] bg-surface-container rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir a leitura operacional."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o dataset da loja selecionada no momento."
      />
    );
  }

  const metrics = financialReportFiltered?.total;
  const expenseSummary = financialReportFiltered?.expenseBreakdown.slice(0, 4) ?? [];

  if (!metrics || !financialReportFiltered) {
    return (
      <EmptyState
        title="Relatório indisponível"
        description="Não foi possível carregar a leitura financeira canônica desta loja no momento."
      />
    );
  }

  const variableCostShare = financialReportFiltered.analysis.shares.variableCostShare;
  const breakEvenValue =
    metrics.breakEvenDisplay !== null ? currencyFormatter.format(metrics.breakEvenDisplay) : "N/A";
  const breakEvenHelp = metrics.breakEvenReason;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumo executivo"
        title={activeBrand.name}
        description="Visão curta da operação no período selecionado, separando a camada comercial da INK da análise gerencial usada no DRE."
        badge={selectedPeriodLabel}
        actions={
          <Link href="/help#dashboard" className="brandops-button brandops-button-ghost">
            Entender os números
          </Link>
        }
      />

      <section className="atlas-command-room grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Pedidos pagos"
          value={integerFormatter.format(metrics.paidOrderCount)}
          help="Pedidos pagos no período"
          accent="positive"
        />
        <MetricCard
          label="Itens vendidos"
          value={integerFormatter.format(metrics.unitsSold)}
          help="Soma de `Items no Pedido` da INK"
        />
        <MetricCard
          label="Ticket médio"
          value={currencyFormatter.format(metrics.averageTicket)}
          help="Faturado / pedidos pagos"
        />
        <MetricCard
          label="Itens por venda"
          value={metrics.itemsPerOrder.toFixed(2)}
          help="Peças médias por pedido"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Faturado"
          value={currencyFormatter.format(metrics.grossRevenue)}
          help="Soma de `Valor do Pedido` na exportação da INK"
          accent="secondary"
        />
        <MetricCard
          label="Descontos totais"
          value={currencyFormatter.format(metrics.discounts)}
          help={`Via cupom identificado: ${currencyFormatter.format(metrics.couponDiscounts)}`}
          accent="warning"
        />
        <MetricCard
          label="Comissão INK"
          value={currencyFormatter.format(metrics.inkProfit)}
          help="Campo `Comissao` exportado pela INK"
          accent="positive"
        />
        <MetricCard
          label="Lucro médio"
          value={currencyFormatter.format(metrics.averageInkProfit)}
          help="Comissão INK por item vendido"
          accent={metrics.averageInkProfit >= 0 ? "positive" : "negative"}
        />
      </section>

      <section className="atlas-command-room grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          label="Investimento mídia"
          value={currencyFormatter.format(metrics.mediaSpend)}
          help={`ROAS bruto ${metrics.grossRoas.toFixed(2)}x`}
          accent="warning"
        />
        <MetricCard
          label="CMV aplicado"
          value={currencyFormatter.format(metrics.cmvTotal)}
          help="Custo histórico por item vendido"
          accent="warning"
        />
        <MetricCard
          label="Despesas operacionais"
          value={currencyFormatter.format(metrics.operatingExpensesTotal)}
          help={`${expenseSummary.length} categorias lançadas no período`}
          accent="warning"
        />
        <MetricCard
          label="Margem de contribuição"
          value={currencyFormatter.format(metrics.contributionAfterMedia)}
          help={percentFormatter.format(metrics.contributionMargin)}
          accent={metrics.contributionAfterMedia >= 0 ? "positive" : "negative"}
          href="/dashboard/contribution-margin"
          detailLabel="Explorar"
        />
        <MetricCard
          label="Ponto de equilíbrio"
          value={breakEvenValue}
          help={
            metrics.breakEvenDisplay !== null
              ? `${breakEvenHelp} Meta mensal de RLD.`
              : breakEvenHelp
          }
          accent={metrics.breakEvenDisplay !== null ? "secondary" : "warning"}
        />
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Centro de comando"
            description="Troque entre leitura financeira rápida e próximos passos operacionais sem alongar a tela."
          />
          <div className="brandops-subtabs">
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "kpis"}
              onClick={() => setActiveSection("kpis")}
            >
              Leitura rápida
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "workflow"}
              onClick={() => setActiveSection("workflow")}
            >
              Próximos passos
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeSection === "kpis" ? (
        <SurfaceCard>
          <SectionHeading
            title="Leitura rápida"
            description="Resumo operacional do período para tomada de decisão sem precisar abrir o DRE completo."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Receita líquida de desconto
              </p>
              <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                {currencyFormatter.format(metrics.rld)}
              </p>
            </article>
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Despesas operacionais
              </p>
              <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                {currencyFormatter.format(metrics.operatingExpensesTotal)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Registradas sempre no dia 1º de cada competência
              </p>
            </article>
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Resultado operacional
              </p>
              <p className={`mt-2 font-headline text-2xl font-semibold ${metrics.netResult >= 0 ? "atlas-semantic-positive" : "atlas-semantic-negative"}`}>
                {currencyFormatter.format(metrics.netResult)}
              </p>
            </article>
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Custo variável
              </p>
              <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                {percentFormatter.format(variableCostShare)}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">CMV + mídia sobre a RLD</p>
            </article>
          </div>
          {expenseSummary.length ? (
            <div className="mt-4 rounded-2xl border border-outline bg-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Maiores despesas do período
              </p>
              <div className="mt-3 space-y-2">
                {expenseSummary.map((expense) => (
                  <div key={expense.categoryName} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-on-surface-variant">{expense.categoryName}</span>
                    <span className="font-semibold text-on-surface">
                      {currencyFormatter.format(expense.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <SectionHeading
            title="Próximos passos"
            description="Fluxos mais importantes para fechar o período sem perder consistência."
          />
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <article className="panel-muted p-4">
              <h3 className="font-semibold text-on-surface">1. Importação incremental</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Suba os blocos de venda e mídia do período. O sistema consolida duplicados por chave.
              </p>
            </article>
            <article className="panel-muted p-4">
              <h3 className="font-semibold text-on-surface">2. Saneamento</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Revise outliers antes de confiar nos números da Meta e nos pedidos fora da curva.
              </p>
            </article>
            <article className="panel-muted p-4">
              <h3 className="font-semibold text-on-surface">3. DRE</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Com mídia, CMV e despesas fechados, o DRE vira a referência final da operação.
              </p>
            </article>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
