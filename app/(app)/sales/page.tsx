"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsCalloutCard, AnalyticsKpiCard } from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { InlineNotice, PageHeader, SectionHeading, SurfaceCard, WorkspaceTabs } from "@/components/ui-shell";
import { fetchSalesDetailReport } from "@/lib/brandops/database";
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import type { SalesDetailReport } from "@/lib/brandops/types";

const EMPTY_SALES_DETAIL: SalesDetailReport = {
  dailySeries: [],
  topProducts: [],
  highlights: {
    bestDay: null,
    topProduct: null,
    revenuePerItem: 0,
    discountPerOrder: 0,
  },
  playbook: {
    protect: {
      title: "",
      description: "",
      count: 0,
      items: [],
    },
    grow: {
      title: "",
      description: "",
      count: 0,
      items: [],
    },
    review: {
      title: "",
      description: "",
      count: 0,
      items: [],
    },
  },
  analysis: {
    narrativeTitle: "",
    narrativeBody: "",
    nextActions: [],
    topOpportunity: null,
    topRisk: null,
  },
  meta: {
    generatedAt: "",
    from: null,
    to: null,
    hasData: false,
  },
};

export default function SalesPage() {
  const [view, setView] = useState<"summary" | "cadence" | "products">("summary");
  const {
    activeBrand,
    activeBrandId,
    brands,
    periodRange,
    selectedPeriodLabel,
    isLoading: isDatasetLoading,
    financialReportFiltered,
    isMetricsLoading,
  } = useBrandOps();
  const [salesDetail, setSalesDetail] = useState<SalesDetailReport>(EMPTY_SALES_DETAIL);
  const [isSalesDetailLoading, setIsSalesDetailLoading] = useState(false);
  const [salesDetailError, setSalesDetailError] = useState<string | null>(null);

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setSalesDetail(EMPTY_SALES_DETAIL);
      setSalesDetailError(null);
      setIsSalesDetailLoading(false);
      return;
    }

    const currentBrandId: string = activeBrandId;
    let cancelled = false;

    async function loadSalesDetail() {
      setIsSalesDetailLoading(true);
      setSalesDetailError(null);

      try {
        const detail = await fetchSalesDetailReport(
          currentBrandId,
          periodRange?.start ?? null,
          periodRange?.end ?? null,
        );

        if (!cancelled) {
          setSalesDetail(detail);
        }
      } catch (error) {
        if (!cancelled) {
          setSalesDetail(EMPTY_SALES_DETAIL);
          setSalesDetailError(
            error instanceof Error ? error.message : "Não foi possível carregar o relatório comercial.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsSalesDetailLoading(false);
        }
      }
    }

    void loadSalesDetail();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, periodRange?.end, periodRange?.start]);

  const metrics = financialReportFiltered?.total ?? null;
  const dailySales = salesDetail.dailySeries;
  const topProducts = salesDetail.topProducts;
  const hasSales = Boolean(metrics && metrics.paidOrderCount > 0);
  const topProduct = salesDetail.highlights.topProduct;
  const bestDay = salesDetail.highlights.bestDay;
  const primaryAction = salesDetail.analysis.nextActions[0] ?? null;

  const isBrandLoading = useMemo(
    () =>
      Boolean(activeBrandId) &&
      (isDatasetLoading || isMetricsLoading || isSalesDetailLoading || !metrics),
    [activeBrandId, isDatasetLoading, isMetricsLoading, isSalesDetailLoading, metrics],
  );

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Leitura comercial"
          title="Vendas"
          description={`Carregando dados comerciais da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="h-[400px] bg-surface-container rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma marca para visualizar o relatório de vendas."
      />
    );
  }

  if (!metrics) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o relatório comercial da loja selecionada."
      />
    );
  }

  if (!hasSales) {
    return (
      <EmptyState
        title="Ainda não há vendas carregadas"
        description="Importe Lista de Pedidos.csv e Lista de Itens.csv para abrir a leitura comercial da marca."
      />
    );
  }

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Leitura comercial"
        title="Console comercial"
        description="Ritmo, mix e prioridade comercial do período sem transformar a área em dashboard inflado."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
            <Link href="/help#dashboard" className="brandops-button brandops-button-ghost">
              Entender cálculos
            </Link>
          </div>
        }
      />

      <section className="atlas-kpi-grid xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Pedidos pagos"
          value={integerFormatter.format(metrics.paidOrderCount)}
          description="Ordens concluídas no período comercial selecionado."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Itens vendidos"
          value={integerFormatter.format(metrics.unitsSold)}
          description="Volume total de peças reconhecidas pela camada comercial."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Faturado"
          value={currencyFormatter.format(metrics.grossRevenue)}
          description="Receita bruta exportada pela INK para o recorte atual."
          tone="positive"
        />
        <AnalyticsKpiCard
          label="Ticket médio"
          value={currencyFormatter.format(metrics.averageTicket)}
          description="Média de faturamento por pedido pago."
          tone="default"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(18rem,0.62fr)]">
        <AnalyticsCalloutCard
          eyebrow="Decisão do período"
          title={primaryAction ?? salesDetail.analysis.narrativeTitle ?? "Rever ritmo comercial"}
          description="O movimento com maior impacto imediato no faturado, no mix e na cadência do período."
          tone="info"
        />
        <div className="atlas-side-stack">
          <AnalyticsCalloutCard
            eyebrow="Maior oportunidade"
            title={salesDetail.analysis.topOpportunity ?? "Sem oportunidade dominante"}
            description="Produto ou frente com melhor sinal para empurrar distribuição agora."
            tone="positive"
          />
          <AnalyticsCalloutCard
            eyebrow="Revisar primeiro"
            title={salesDetail.analysis.topRisk ?? "Sem risco principal identificado"}
            description="Ponto do mix que pede revisão antes de acelerar novas ações."
            tone="warning"
          />
        </div>
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Modo comercial"
            description="Escolha entre resumo, cadência e ranking sem alongar a leitura."
            aside={<span className="atlas-inline-metric">{view === "summary" ? "Resumo" : view === "cadence" ? "Cadência" : "Produtos"}</span>}
          />
          <WorkspaceTabs
            items={[
              {
                key: "sales-summary",
                label: "Resumo",
                active: view === "summary",
                onClick: () => setView("summary"),
              },
              {
                key: "sales-cadence",
                label: "Cadência",
                active: view === "cadence",
                onClick: () => setView("cadence"),
              },
              {
                key: "sales-products",
                label: "Produtos",
                active: view === "products",
                onClick: () => setView("products"),
              },
            ]}
          />
        </div>
      </SurfaceCard>

      {view === "summary" ? (
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
          <SurfaceCard>
            <SectionHeading
              title={salesDetail.analysis.narrativeTitle || "Leitura comercial"}
              description={
                salesDetail.analysis.narrativeBody ||
                "Resumo do que mais puxou resultado comercial no período."
              }
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AnalyticsKpiCard
                label="Pico de faturamento diário"
                value={bestDay ? currencyFormatter.format(bestDay.revenue) : "-"}
                description={bestDay ? formatCompactDate(bestDay.date) : "Sem série diária disponível"}
                tone="positive"
              />
              <AnalyticsKpiCard
                label="Produto líder do período"
                value={topProduct?.productName ?? "Sem produto líder"}
                description={
                  topProduct
                    ? `${integerFormatter.format(topProduct.quantity)} peça(s) • ${currencyFormatter.format(topProduct.grossRevenue)}`
                    : "Sem volume suficiente para ranking."
                }
                tone="default"
              />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Radar do mix"
              description="Só o que ajuda a decidir agora: pressão de desconto, receita por item e próximos cortes."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <AnalyticsKpiCard
                label="Desconto médio por pedido"
                value={currencyFormatter.format(salesDetail.highlights.discountPerOrder)}
                description="Indica quanto da receita foi cedido em desconto por ordem."
                tone="warning"
              />
              <AnalyticsKpiCard
                label="Receita por item"
                value={currencyFormatter.format(salesDetail.highlights.revenuePerItem)}
                description="Leitura útil para comparar item avulso com mix de catálogo."
                tone="positive"
              />
            </div>
            <details className="atlas-disclosure mt-4" open={!salesDetail.analysis.nextActions.length}>
              <summary>
                <span>Abrir próximos movimentos</span>
                <span>{salesDetail.analysis.nextActions.length || 0}</span>
              </summary>
              <div className="mt-4">
                <InlineNotice tone="info">
                  <div className="atlas-component-stack-tight">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      Próximas ações
                    </p>
                    <div className="atlas-component-stack-tight text-sm text-on-surface-variant">
                      {salesDetail.analysis.nextActions.length ? (
                        salesDetail.analysis.nextActions.map((action) => <p key={action}>• {action}</p>)
                      ) : (
                        <p>Sem próximos movimentos fortes no recorte atual.</p>
                      )}
                    </div>
                  </div>
                </InlineNotice>
              </div>
            </details>
          </SurfaceCard>
        </section>
      ) : null}

      {view === "cadence" ? (
        <SurfaceCard>
          <SectionHeading
            title="Cadência diária"
            description="Faturado por dia para enxergar ritmo de venda e picos do período."
          />
          <div className="mt-5 h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatCompactDate}
                  stroke="var(--color-on-surface-variant)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--color-on-surface-variant)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Bar dataKey="revenue" fill="var(--color-secondary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      ) : null}

      {view === "products" ? (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Produtos que puxaram faturamento"
              description="Ranking por faturamento bruto e volume de peças."
            />
          </div>
          <div className="grid gap-4 border-b border-outline/60 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.6fr)]">
            <AnalyticsCalloutCard
              eyebrow="Expandir"
              title={salesDetail.analysis.topOpportunity ?? "Sem oportunidade dominante"}
              description="Produto com melhor sinal para puxar distribuição no período."
              tone="positive"
            />
            <div className="atlas-side-stack">
              <AnalyticsCalloutCard
                eyebrow="Revisar"
                title={salesDetail.analysis.topRisk ?? "Sem risco principal identificado"}
                description="Item que merece revisão de vitrine, exposição ou permanência no mix."
                tone="warning"
              />
              <AnalyticsCalloutCard
                eyebrow="Mix"
                title={topProduct?.productName ?? "Sem produto líder"}
                description={
                  topProduct
                    ? `${integerFormatter.format(topProduct.quantity)} peça(s) • ${currencyFormatter.format(topProduct.grossRevenue)}`
                    : "Sem volume suficiente para ranking."
                }
                tone="info"
              />
            </div>
          </div>
          {salesDetailError ? (
            <div className="p-5 text-sm text-tertiary">{salesDetailError}</div>
          ) : (
            <div className="brandops-table-container atlas-table-shell">
              <table className="brandops-table-compact min-w-[560px] w-full">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Peças</th>
                    <th className="text-right">Faturado</th>
                    <th className="text-right">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => {
                    const share = metrics.grossRevenue > 0
                      ? product.grossRevenue / metrics.grossRevenue
                      : 0;
                    return (
                      <tr key={product.productKey}>
                        <td className="max-w-[320px] truncate font-semibold text-on-surface">
                          {product.productName}
                        </td>
                        <td className="text-right">{integerFormatter.format(product.quantity)}</td>
                        <td className="text-right font-semibold text-on-surface">
                          {currencyFormatter.format(product.grossRevenue)}
                        </td>
                        <td className="text-right">{(share * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      ) : null}
    </div>
  );
}
