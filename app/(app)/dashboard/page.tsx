"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
  AnalyticsPanel,
} from "@/components/analytics/AnalyticsPrimitives";
import { AtlasControlTowerHome } from "@/components/AtlasControlTowerHome";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, StackItem, SurfaceCard } from "@/components/ui-shell";
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

      <AtlasControlTowerHome />

      <section className="grid gap-4 xl:grid-cols-3">
        <AnalyticsPanel
          eyebrow="Leitura comercial"
          title="Volume e ticket"
          description="Os números que mostram se a loja está convertendo mais ou só movimentando mais itens."
        >
          <AnalyticsKpiCard
            label="Pedidos pagos"
            value={integerFormatter.format(metrics.paidOrderCount)}
            description="Pedidos pagos no período."
            tone="positive"
          />
          <AnalyticsKpiCard
            label="Itens vendidos"
            value={integerFormatter.format(metrics.unitsSold)}
            description="Soma de `Items no Pedido` da INK."
          />
          <AnalyticsKpiCard
            label="Ticket médio"
            value={currencyFormatter.format(metrics.averageTicket)}
            description="Faturado dividido pelos pedidos pagos."
          />
          <AnalyticsKpiCard
            label="Itens por venda"
            value={metrics.itemsPerOrder.toFixed(2)}
            description="Peças médias por pedido."
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          eyebrow="Resultado"
          title="Receita e margem"
          description="A parte que diz se o comercial segurou valor ou deixou margem escapar."
        >
          <AnalyticsKpiCard
            label="Faturado"
            value={currencyFormatter.format(metrics.grossRevenue)}
            description="Soma de `Valor do Pedido` na exportação da INK."
            tone="secondary"
          />
          <AnalyticsKpiCard
            label="Descontos totais"
            value={currencyFormatter.format(metrics.discounts)}
            description={`Via cupom identificado: ${currencyFormatter.format(metrics.couponDiscounts)}.`}
            tone="warning"
          />
          <AnalyticsKpiCard
            label="Comissão INK"
            value={currencyFormatter.format(metrics.inkProfit)}
            description="Campo `Comissao` exportado pela INK."
            tone="positive"
          />
          <AnalyticsKpiCard
            label="Lucro médio"
            value={currencyFormatter.format(metrics.averageInkProfit)}
            description="Comissão INK por item vendido."
            tone={metrics.averageInkProfit >= 0 ? "positive" : "negative"}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          eyebrow="Pressão"
          title="Custo e equilíbrio"
          description="O que consome a RLD e o que falta para cobrir a operação sem surpresa."
          footer={
            <Link href="/help#dashboard" className="text-xs font-medium text-primary hover:underline">
              Entender a lógica dos números
            </Link>
          }
        >
          <AnalyticsKpiCard
            label="Investimento mídia"
            value={currencyFormatter.format(metrics.mediaSpend)}
            description={`ROAS bruto ${metrics.grossRoas.toFixed(2)}x.`}
            tone="warning"
          />
          <AnalyticsKpiCard
            label="CMV aplicado"
            value={currencyFormatter.format(metrics.cmvTotal)}
            description="Custo histórico por item vendido."
            tone="warning"
          />
          <AnalyticsKpiCard
            label="Despesas operacionais"
            value={currencyFormatter.format(metrics.operatingExpensesTotal)}
            description={`${expenseSummary.length} categorias lançadas no período.`}
            tone="warning"
          />
          <AnalyticsKpiCard
            label="Margem de contribuição"
            value={currencyFormatter.format(metrics.contributionAfterMedia)}
            description={percentFormatter.format(metrics.contributionMargin)}
            tone={metrics.contributionAfterMedia >= 0 ? "positive" : "negative"}
            href="/dashboard/contribution-margin"
            actionLabel="Explorar"
          />
          <AnalyticsKpiCard
            label="Ponto de equilíbrio"
            value={breakEvenValue}
            description={
              metrics.breakEvenDisplay !== null
                ? `${breakEvenHelp} Meta mensal de RLD.`
                : breakEvenHelp
            }
            tone={metrics.breakEvenDisplay !== null ? "secondary" : "warning"}
          />
        </AnalyticsPanel>
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Foco do período"
            description="Escolha a leitura mais útil agora: resumo financeiro imediato ou ações para destravar a operação."
          />
          <div className="brandops-subtabs">
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "kpis"}
              onClick={() => setActiveSection("kpis")}
            >
              Resumo
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "workflow"}
              onClick={() => setActiveSection("workflow")}
            >
              Ações
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeSection === "kpis" ? (
        <SurfaceCard className="p-4">
          <SectionHeading
            title="Resumo do período"
            description="Compacta a leitura para que o usuário veja o que mudou sem percorrer a página inteira."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <AnalyticsKpiCard
              label="Receita líquida de desconto"
              value={currencyFormatter.format(metrics.rld)}
              description="Receita líquida após descontos, antes dos custos variáveis."
              tone={metrics.rld > 0 ? "info" : "default"}
            />
            <AnalyticsKpiCard
              label="Despesas operacionais"
              value={currencyFormatter.format(metrics.operatingExpensesTotal)}
              description="Lançadas por competência para manter o DRE consistente."
              tone={metrics.operatingExpensesTotal > 0 ? "warning" : "default"}
            />
            <AnalyticsKpiCard
              label="Resultado operacional"
              value={currencyFormatter.format(metrics.netResult)}
              description="Resultado final depois de CMV, mídia e despesas."
              tone={metrics.netResult >= 0 ? "positive" : "negative"}
            />
            <AnalyticsKpiCard
              label="Custo variável"
              value={percentFormatter.format(variableCostShare)}
              description="CMV + mídia sobre a receita líquida disponível."
              tone={variableCostShare > 0.7 ? "warning" : "default"}
            />
          </div>
          {expenseSummary.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Maiores despesas do período
              </p>
              <div className="space-y-2">
                {expenseSummary.map((expense) => (
                  <StackItem
                    key={expense.categoryName}
                    title={expense.categoryName}
                    description="Categoria que mais pesa no período atual."
                    aside={currencyFormatter.format(expense.total)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      ) : (
        <SurfaceCard className="p-4">
          <SectionHeading
            title="Ações sugeridas"
            description="Três movimentos curtos para reduzir ruído e voltar para a margem."
          />
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <AnalyticsCalloutCard
              eyebrow="1. Importação incremental"
              title="Atualize a base comercial e de mídia"
              description="Suba os blocos de venda e mídia do período. O sistema consolida duplicados por chave."
            />
            <AnalyticsCalloutCard
              eyebrow="2. Saneamento"
              title="Revise outliers antes da leitura"
              description="Valide pedidos fora da curva e inconsistências antes de confiar nos números da Meta."
              tone="warning"
            />
            <AnalyticsCalloutCard
              eyebrow="3. DRE"
              title="Feche a leitura gerencial"
              description="Com mídia, CMV e despesas fechados, o DRE vira a referência final da operação."
              tone="info"
            />
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
