"use client";

import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import { buildExpenseSummary, computeBrandMetrics } from "@/lib/brandops/metrics";

export default function DashboardPage() {
  const { 
    activeBrand, 
    filteredBrand, 
    selectedPeriodLabel, 
    isLoading: isDatasetLoading 
  } = useBrandOps();

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir a leitura operacional."
      />
    );
  }

  if (isDatasetLoading || !filteredBrand) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-surface-container rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-container rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[300px] bg-surface-container rounded-3xl" />
          <div className="h-[300px] bg-surface-container rounded-3xl" />
        </div>
      </div>
    );
  }

  const metrics = computeBrandMetrics(filteredBrand);
  const expenseSummary = buildExpenseSummary(filteredBrand).slice(0, 4);
  const variableCostShare =
    metrics.rld > 0 ? (metrics.cmvTotal + metrics.mediaSpend) / metrics.rld : 0;

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Investimento mídia"
          value={currencyFormatter.format(metrics.mediaSpend)}
          help={`ROAS bruto ${metrics.grossRoas.toFixed(2)}x`}
        />
        <MetricCard
          label="CMV aplicado"
          value={currencyFormatter.format(metrics.cmvTotal)}
          help="Custo histórico por item vendido"
        />
        <MetricCard
          label="Despesas operacionais"
          value={currencyFormatter.format(metrics.operatingExpensesTotal)}
          help={`${expenseSummary.length} categorias lançadas no período`}
        />
        <MetricCard
          label="Margem de contribuição"
          value={currencyFormatter.format(metrics.contributionAfterMedia)}
          help={percentFormatter.format(metrics.contributionMargin)}
          accent={metrics.contributionAfterMedia >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Ponto de equilíbrio"
          value={currencyFormatter.format(metrics.breakEvenPoint)}
          help="RLD necessário para cobrir despesas"
          accent="secondary"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
              <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
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
                      {currencyFormatter.format(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Próximos passos"
            description="Fluxos mais importantes para fechar o período sem perder consistência."
          />
          <div className="mt-5 grid gap-3">
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
      </section>
    </div>
  );
}
