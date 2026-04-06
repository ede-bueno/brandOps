"use client";
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
  const [activeSection, setActiveSection] = useState<"kpis" | "diagnostics">("kpis");
  const { 
    activeBrand, 
    activeBrandId,
    brands,
    filteredBrand,
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
  const pendingSanitizationCount =
    (filteredBrand?.media.filter((row) => row.sanitizationStatus === "PENDING").length ?? 0) +
    (filteredBrand?.paidOrders.filter((order) => order.sanitizationStatus === "PENDING").length ?? 0);
  const mediaIntegration =
    activeBrand.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const diagnostics: Array<{
    eyebrow: string;
    title: string;
    description: string;
    tone: "default" | "secondary" | "warning" | "info";
    href: string;
  }> = [];

  if (metrics.contributionAfterMedia < 0) {
    diagnostics.push({
      eyebrow: "Margem",
      title: "Contribuição depois de mídia virou negativa",
      description: "Abra a margem histórica e revise campanhas antes de insistir em escala.",
      tone: "warning",
      href: "/dashboard/contribution-margin",
    });
  }

  if (metrics.netResult < 0) {
    diagnostics.push({
      eyebrow: "Resultado",
      title: "Operação fechando no vermelho",
      description: "O DRE consolidado deve ser o próximo corte para localizar a principal pressão.",
      tone: "warning",
      href: "/dre",
    });
  }

  if (pendingSanitizationCount > 0) {
    diagnostics.push({
      eyebrow: "Base",
      title: "Há ruído pendente na leitura",
      description: `${pendingSanitizationCount} pendência(s) ainda podem distorcer comparação e margem deste período.`,
      tone: "warning",
      href: "/sanitization",
    });
  }

  if (mediaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error") {
    diagnostics.push({
      eyebrow: "Fonte",
      title: "Integração com erro recente",
      description: "Antes de decidir, vale validar se o corte atual está completo.",
      tone: "info",
      href: "/integrations",
    });
  }

  if (metrics.grossRoas > 0 && metrics.grossRoas < 2) {
    diagnostics.push({
      eyebrow: "Mídia",
      title: "Retorno ainda curto para escalar",
      description: "Revise verba, campanha e criativo antes de expansão.",
      tone: "info",
      href: "/media",
    });
  }

  if (!diagnostics.length) {
    diagnostics.push(
      {
        eyebrow: "Operação",
        title: "Sem alerta estrutural no corte atual",
        description: "A operação está estável o suficiente para aprofundar ganho de eficiência.",
        tone: "default",
        href: "/dashboard",
      },
      {
        eyebrow: "Catálogo",
        title: "Hora de procurar oportunidade de escala",
        description: "Cruze catálogo, mídia e tráfego para decidir onde empurrar crescimento.",
        tone: "info",
        href: "/product-insights",
      },
      {
        eyebrow: "Atlas",
        title: "Use a Torre para explorar o próximo corte",
        description: "Abra a casa do Atlas IA para uma leitura mais direcionada.",
        tone: "secondary",
        href: "/dashboard#atlas-ai-home",
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumo executivo"
        title={activeBrand.name}
        description="O que importa agora na operação, sem ruído."
        badge={selectedPeriodLabel}
      />

      <AtlasControlTowerHome />

      <section className="grid gap-4 xl:grid-cols-3">
        <AnalyticsPanel
          eyebrow="Leitura comercial"
          title="Volume e ticket"
          description="Se a loja está convertendo melhor ou só girando mais itens."
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
          description="Se o comercial segurou valor ou deixou margem escapar."
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
          description="O que consome a RLD e o que falta para cobrir a operação."
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
            description="Alterne entre o resumo do corte e o diagnóstico prioritário."
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
              data-active={activeSection === "diagnostics"}
              onClick={() => setActiveSection("diagnostics")}
            >
              Diagnóstico
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeSection === "kpis" ? (
        <SurfaceCard className="p-4">
          <SectionHeading
            title="Resumo do período"
            description="Leitura curta do recorte ativo."
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
            <details className="atlas-disclosure mt-4">
              <summary>
                <span>Abrir maiores despesas do período</span>
                <span>{expenseSummary.length}</span>
              </summary>
              <div className="mt-4 space-y-2">
                {expenseSummary.map((expense) => (
                  <StackItem
                    key={expense.categoryName}
                    title={expense.categoryName}
                    description="Categoria que mais pesa no período atual."
                    aside={currencyFormatter.format(expense.total)}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </SurfaceCard>
      ) : (
        <SurfaceCard className="p-4">
          <SectionHeading
            title="Diagnóstico prioritário"
            description="Sinais que merecem ação antes do resto."
          />
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {diagnostics.slice(0, 3).map((diagnostic) => (
              <AnalyticsCalloutCard
                key={`${diagnostic.eyebrow}-${diagnostic.title}`}
                eyebrow={diagnostic.eyebrow}
                title={diagnostic.title}
                description={diagnostic.description}
                tone={diagnostic.tone}
                href={diagnostic.href}
              />
            ))}
          </div>
          <details className="atlas-disclosure mt-4">
            <summary>
              <span>Abrir contexto do recorte</span>
              <span>3</span>
            </summary>
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              <div className="atlas-soft-subcard px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Recorte ativo
                </p>
                <p className="mt-2 text-sm font-semibold text-on-surface">{selectedPeriodLabel}</p>
              </div>
              <div className="atlas-soft-subcard px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Resultado operacional
                </p>
                <p className="mt-2 text-sm font-semibold text-on-surface">
                  {currencyFormatter.format(metrics.netResult)}
                </p>
              </div>
              <div className="atlas-soft-subcard px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Margem depois da mídia
                </p>
                <p className="mt-2 text-sm font-semibold text-on-surface">
                  {currencyFormatter.format(metrics.contributionAfterMedia)}
                </p>
              </div>
            </div>
          </details>
        </SurfaceCard>
      )}
    </div>
  );
}
