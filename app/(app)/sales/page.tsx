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
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  InlineNotice,
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  SectionHeading,
  SurfaceCard,
  WorkspaceRailSection,
  WorkspaceSplitLayout,
  WorkspaceTabs,
} from "@/components/ui-shell";
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
  const primaryAction = salesDetail.analysis.nextActions[0] ?? salesDetail.analysis.narrativeTitle ?? null;
  const averageDailyRevenue =
    dailySales.length > 0
      ? dailySales.reduce((accumulator, day) => accumulator + day.revenue, 0) / dailySales.length
      : 0;
  const activeSalesDays = dailySales.filter((day) => day.revenue > 0).length;

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
              <div key={i} className="h-24 rounded-2xl bg-surface-container" />
            ))}
          </div>
          <div className="h-[400px] rounded-3xl bg-surface-container" />
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
        description={
          view === "summary"
            ? "Acompanhe pedidos, faturado e mix comercial do período."
            : view === "cadence"
              ? "Acompanhe ritmo diário, concentração e oscilações do faturado."
              : "Compare produtos, concentração de receita e volume vendido."
        }
        actions={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
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
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2.5">
              <span className="atlas-inline-metric">{selectedBrandName}</span>
              <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
              <Link href="/help#dashboard" className="brandops-button brandops-button-ghost">
                Entender cálculos
              </Link>
            </div>
          </div>
        }
      />

      {view === "summary" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Pedidos pagos"
              value={integerFormatter.format(metrics.paidOrderCount)}
              helper="Ordens concluídas no período comercial selecionado."
              tone="info"
            />
            <OperationalMetric
              label="Itens vendidos"
              value={integerFormatter.format(metrics.unitsSold)}
              helper="Volume total de peças reconhecidas pela camada comercial."
            />
            <OperationalMetric
              label="Faturado"
              value={currencyFormatter.format(metrics.grossRevenue)}
              helper="Receita bruta exportada pela INK para o recorte atual."
              tone="positive"
            />
            <OperationalMetric
              label="Ticket médio"
              value={currencyFormatter.format(metrics.averageTicket)}
              helper="Média de faturamento por pedido pago."
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title="Direção comercial"
                  description="O movimento com maior impacto imediato no faturado, no mix e na cadência do período."
                />
                <div className="mt-5 atlas-component-stack">
                  <div className="atlas-component-stack-tight">
                    <h2 className="font-headline text-[clamp(1.5rem,2.3vw,2.1rem)] font-semibold tracking-tight text-on-surface">
                      {primaryAction ?? "Rever ritmo comercial"}
                    </h2>
                    <p className="text-sm leading-6 text-on-surface-variant">
                      {salesDetail.analysis.narrativeBody ||
                        "Use essa leitura para decidir a próxima ação comercial do período."}
                    </p>
                  </div>
                  <OperationalMetricStrip desktopColumns={2}>
                    <OperationalMetric
                      label="Maior oportunidade"
                      value={salesDetail.analysis.topOpportunity ?? "Sem oportunidade dominante"}
                      helper="Produto ou frente com melhor sinal para empurrar distribuição agora."
                      tone="positive"
                    />
                    <OperationalMetric
                      label="Revisar primeiro"
                      value={salesDetail.analysis.topRisk ?? "Sem risco principal identificado"}
                      helper="Ponto do mix que pede revisão antes de acelerar novas ações."
                      tone="warning"
                    />
                  </OperationalMetricStrip>
                </div>
              </SurfaceCard>
            }
            rail={
              <WorkspaceRailSection
                title="Próximos movimentos"
                description="Ações sugeridas para o período."
              >
                {salesDetail.analysis.nextActions.length ? (
                  salesDetail.analysis.nextActions.map((action) => (
                    <div key={action} className="atlas-dre-action-link">
                      <div>
                        <p className="font-medium text-on-surface">{action}</p>
                        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                          Ação sugerida a partir da leitura comercial do período.
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <InlineNotice tone="info">
                    <p className="text-sm text-on-surface-variant">
                      Sem próximos movimentos fortes no recorte atual.
                    </p>
                  </InlineNotice>
                )}
              </WorkspaceRailSection>
            }
          />

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title={salesDetail.analysis.narrativeTitle || "Leitura comercial"}
                  description={
                    salesDetail.analysis.narrativeBody ||
                    "Resumo do que mais puxou resultado comercial no período."
                  }
                />
                <div className="mt-5">
                  <OperationalMetricStrip>
                    <OperationalMetric
                      label="Pico diário"
                      value={bestDay ? currencyFormatter.format(bestDay.revenue) : "-"}
                      helper={bestDay ? formatCompactDate(bestDay.date) : "Sem série diária disponível."}
                      tone="positive"
                    />
                    <OperationalMetric
                      label="Produto líder"
                      value={topProduct?.productName ?? "Sem produto líder"}
                      helper={
                        topProduct
                          ? `${integerFormatter.format(topProduct.quantity)} peça(s) • ${currencyFormatter.format(topProduct.grossRevenue)}`
                          : "Sem volume suficiente para ranking."
                      }
                      tone="info"
                    />
                    <OperationalMetric
                      label="Desconto médio"
                      value={currencyFormatter.format(salesDetail.highlights.discountPerOrder)}
                      helper="Quanto da receita foi cedido em desconto por ordem."
                    />
                    <OperationalMetric
                      label="Receita por item"
                      value={currencyFormatter.format(salesDetail.highlights.revenuePerItem)}
                      helper="Leitura útil para comparar item avulso com mix de catálogo."
                    />
                  </OperationalMetricStrip>
                </div>
              </SurfaceCard>
            }
          />
        </>
      ) : null}

      {view === "cadence" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Faturado no período"
              value={currencyFormatter.format(metrics.grossRevenue)}
              helper="Receita bruta acumulada no recorte visível."
              tone="positive"
            />
            <OperationalMetric
              label="Média diária"
              value={currencyFormatter.format(averageDailyRevenue)}
              helper="Faturado médio por dia do período."
              tone="info"
            />
            <OperationalMetric
              label="Dias com venda"
              value={integerFormatter.format(activeSalesDays)}
              helper="Dias que registraram faturamento no recorte."
            />
            <OperationalMetric
              label="Melhor dia"
              value={bestDay ? currencyFormatter.format(bestDay.revenue) : "-"}
              helper={bestDay ? formatCompactDate(bestDay.date) : "Sem pico definido no período."}
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title="Cadência diária"
                  description="Faturado por dia para enxergar ritmo de venda, concentração e picos do período."
                />
                <div className="mt-5 h-[320px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                    <BarChart data={dailySales}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-outline)"
                        vertical={false}
                      />
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
            }
            rail={
              <WorkspaceRailSection
                title="Leitura da cadência"
                description="Contexto rápido para interpretar o gráfico."
              >
                <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                  <OperationalMetric
                    label="Melhor dia"
                    value={bestDay ? formatCompactDate(bestDay.date) : "Sem pico definido"}
                    helper={bestDay ? currencyFormatter.format(bestDay.revenue) : "Sem série diária disponível."}
                    tone="positive"
                    size="compact"
                  />
                  <OperationalMetric
                    label="Média diária"
                    value={currencyFormatter.format(averageDailyRevenue)}
                    helper={`${activeSalesDays} dia(s) com faturamento no recorte.`}
                    tone="info"
                    size="compact"
                  />
                  <OperationalMetric
                    label="Leitura do período"
                    value={salesDetail.analysis.topOpportunity ?? "Cadência sem frente dominante"}
                    helper="Use o gráfico para validar concentração e oscilação do faturado."
                    size="compact"
                  />
                </OperationalMetricStrip>
              </WorkspaceRailSection>
            }
          />
        </>
      ) : null}

      {view === "products" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Produto líder"
              value={topProduct?.productName ?? "Sem produto líder"}
              helper={
                topProduct
                  ? `${integerFormatter.format(topProduct.quantity)} peça(s) no período.`
                  : "Sem volume suficiente para ranking."
              }
              tone="info"
            />
            <OperationalMetric
              label="Receita por item"
              value={currencyFormatter.format(salesDetail.highlights.revenuePerItem)}
              helper="Leitura útil para comparar profundidade do mix."
              tone="positive"
            />
            <OperationalMetric
              label="Itens vendidos"
              value={integerFormatter.format(metrics.unitsSold)}
              helper="Volume total de peças reconhecidas na base comercial."
            />
            <OperationalMetric
              label="Faturado"
              value={currencyFormatter.format(metrics.grossRevenue)}
              helper="Base total para comparar participação dos produtos."
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard className="overflow-hidden p-0">
                <div className="border-b border-outline p-5">
                  <SectionHeading
                    title="Produtos que puxaram faturamento"
                    description="Ranking por faturamento bruto e volume de peças."
                  />
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
                          const share =
                            metrics.grossRevenue > 0 ? product.grossRevenue / metrics.grossRevenue : 0;

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
            }
            rail={
              <div className="atlas-component-stack">
                <WorkspaceRailSection
                  title="Expandir mix"
                  description="Produto com melhor sinal para puxar distribuição."
                >
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Oportunidade dominante</span>
                    <strong className="atlas-ledger-summary-value">
                      {salesDetail.analysis.topOpportunity ?? "Sem oportunidade dominante"}
                    </strong>
                    <span className="atlas-ledger-summary-help">
                      Direção sugerida para ampliar faturamento sem perder aderência do mix.
                    </span>
                  </div>
                </WorkspaceRailSection>

                <WorkspaceRailSection
                  title="Revisar mix"
                  description="Item que pede revisão antes de ganhar mais exposição."
                >
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Revisar primeiro</span>
                    <strong className="atlas-ledger-summary-value">
                      {salesDetail.analysis.topRisk ?? "Sem risco principal identificado"}
                    </strong>
                    <span className="atlas-ledger-summary-help">
                      Vale revisar vitrine, permanência ou narrativa comercial antes de insistir.
                    </span>
                  </div>
                </WorkspaceRailSection>

                <WorkspaceRailSection
                  title="Produto líder"
                  description="Referência rápida do item que mais puxou resultado."
                >
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Liderança atual</span>
                    <strong className="atlas-ledger-summary-value">
                      {topProduct?.productName ?? "Sem produto líder"}
                    </strong>
                    <span className="atlas-ledger-summary-help">
                      {topProduct
                        ? `${integerFormatter.format(topProduct.quantity)} peça(s) • ${currencyFormatter.format(topProduct.grossRevenue)}`
                        : "Sem volume suficiente para ranking."}
                    </span>
                  </div>
                </WorkspaceRailSection>
              </div>
            }
          />
        </>
      ) : null}
    </div>
  );
}
