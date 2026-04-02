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
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { fetchSalesDetailReport } from "@/lib/brandops/database";
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import type { SalesDetailReport } from "@/lib/brandops/types";

const EMPTY_SALES_DETAIL: SalesDetailReport = {
  dailySeries: [],
  topProducts: [],
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
  const topProduct = topProducts[0] ?? null;
  const bestDay = dailySales.reduce<{ date: string; revenue: number } | null>((best, row) => {
    if (!best || row.revenue > best.revenue) {
      return row;
    }
    return best;
  }, null);

  const isBrandLoading = useMemo(
    () =>
      Boolean(activeBrandId) &&
      (isDatasetLoading || isMetricsLoading || isSalesDetailLoading || !metrics),
    [activeBrandId, isDatasetLoading, isMetricsLoading, isSalesDetailLoading, metrics],
  );

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Leitura comercial"
          title="Vendas"
          description={`Carregando dados comerciais da loja ${selectedBrandName}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leitura comercial"
        title="Vendas"
        description="Foco na camada comercial da INK: pedidos pagos, itens vendidos, faturado, descontos e mix de produtos."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <Link href="/help#dashboard" className="brandops-button brandops-button-ghost">
            Entender cálculos
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Pedidos pagos" value={integerFormatter.format(metrics.paidOrderCount)} />
        <MetricCard label="Itens vendidos" value={integerFormatter.format(metrics.unitsSold)} />
        <MetricCard label="Faturado" value={currencyFormatter.format(metrics.grossRevenue)} />
        <MetricCard label="Descontos" value={currencyFormatter.format(metrics.discounts)} />
        <MetricCard label="Comissão INK" value={currencyFormatter.format(metrics.inkProfit)} />
        <MetricCard label="Ticket médio" value={currencyFormatter.format(metrics.averageTicket)} />
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Modo comercial"
            description="Troque entre leitura rápida, cadência diária e ranking de produtos sem alongar a tela."
          />
          <div className="brandops-subtabs">
            <button type="button" className="brandops-subtab" data-active={view === "summary"} onClick={() => setView("summary")}>
              Resumo
            </button>
            <button type="button" className="brandops-subtab" data-active={view === "cadence"} onClick={() => setView("cadence")}>
              Cadência
            </button>
            <button type="button" className="brandops-subtab" data-active={view === "products"} onClick={() => setView("products")}>
              Produtos
            </button>
          </div>
        </div>
      </SurfaceCard>

      {view === "summary" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard>
            <SectionHeading
              title="Leitura rápida"
              description="Resumo do que mais puxou resultado comercial no período."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Pico de faturamento diário
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {bestDay ? currencyFormatter.format(bestDay.revenue) : "-"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {bestDay ? formatCompactDate(bestDay.date) : "Sem série diária disponível"}
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Produto líder do período
                </p>
                <p className="mt-2 truncate font-headline text-xl font-semibold text-on-surface">
                  {topProduct?.productName ?? "Sem produto líder"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {topProduct
                    ? `${integerFormatter.format(topProduct.quantity)} peça(s) • ${currencyFormatter.format(topProduct.grossRevenue)}`
                    : "Sem volume suficiente para ranking."}
                </p>
              </article>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Leitura de mix"
              description="Atalhos para entender onde o comercial concentrou resultado."
            />
            <div className="mt-5 space-y-3">
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Desconto médio por pedido
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {metrics.paidOrderCount
                    ? currencyFormatter.format(metrics.discounts / metrics.paidOrderCount)
                    : currencyFormatter.format(0)}
                </p>
              </article>
              <article className="panel-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Receita por item
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                  {metrics.unitsSold
                    ? currencyFormatter.format(metrics.grossRevenue / metrics.unitsSold)
                    : currencyFormatter.format(0)}
                </p>
              </article>
            </div>
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
          {salesDetailError ? (
            <div className="p-5 text-sm text-tertiary">{salesDetailError}</div>
          ) : (
            <div className="brandops-table-container rounded-none border-0">
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
